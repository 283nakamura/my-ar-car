/**
 * Dream On AirTaxi Player
 * Timeline Manager
 *
 * @file js/timeline-manager.js
 * @description
 * シーンごとのタイムライン設定を読み込み、
 * 動画の現在時刻に応じてタイムラインイベントを発行します。
 *
 * TimelineManagerは映像の再生、シーン遷移、UI表示、
 * ソラ教官、ローターの直接制御を行いません。
 *
 * 他のManagerへの処理要求は行わず、
 * EVENTS.TIMELINE_EVENTとしてmain.jsへ通知します。
 */

import {
  APP_CONFIG,
  DEBUG_CONFIG,
  EVENTS,
  getTimelineConfig,
} from './config.js';


/**
 * TimelineManager
 *
 * @example
 * const eventBus = new EventTarget();
 *
 * const timelineManager = new TimelineManager({
 *   eventBus,
 * });
 *
 * timelineManager.init();
 * timelineManager.load('intro');
 * timelineManager.start();
 * timelineManager.update(1.5);
 */
export class TimelineManager {
  /**
   * @param {Object} options
   * @param {EventTarget} options.eventBus
   */
  constructor({ eventBus } = {}) {
    if (!(eventBus instanceof EventTarget)) {
      throw new TypeError(
        '[TimelineManager] eventBus must be an instance of EventTarget.'
      );
    }

    this.eventBus = eventBus;

    this.listeners = [];

    /**
     * 現在読み込まれているタイムラインです。
     *
     * @type {ReadonlyArray<Object>}
     */
    this.timeline = Object.freeze([]);

    /**
     * 発火済みイベントIDです。
     *
     * once: trueのイベントは、このSetに記録されます。
     *
     * @type {Set<string>}
     */
    this.executedEventIds = new Set();

    this.currentTimelineId = null;
    this.currentTime = 0;
    this.previousTime = 0;

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isLoaded = false;
    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;

    this._handleSceneTimeUpdated =
      this._handleSceneTimeUpdated.bind(this);

    this._handleSceneStarted =
      this._handleSceneStarted.bind(this);

    this._handleScenePaused =
      this._handleScenePaused.bind(this);

    this._handleSceneStopped =
      this._handleSceneStopped.bind(this);

    this._handleSceneEnded =
      this._handleSceneEnded.bind(this);
  }


  /* ==========================================================================
     Lifecycle
     ========================================================================== */

  /**
   * TimelineManagerを初期化します。
   *
   * @returns {TimelineManager}
   */
  init() {
    if (this.isDestroyed) {
      throw new Error(
        '[TimelineManager] Cannot initialize a destroyed instance.'
      );
    }

    if (this.isInitialized) {
      if (APP_CONFIG.preventMultipleInitialization) {
        this._debug(
          'Initialization skipped: already initialized.'
        );

        return this;
      }

      this.destroy();
      this.isDestroyed = false;
    }

    this._registerEventListeners();

    this.isInitialized = true;

    this._debug('Initialized.');

    return this;
  }


  /**
   * イベントリスナーと内部状態を破棄します。
   */
  destroy() {
    for (const listener of this.listeners) {
      listener.target.removeEventListener(
        listener.type,
        listener.handler,
        listener.options
      );
    }

    this.listeners = [];

    this.timeline = Object.freeze([]);
    this.executedEventIds.clear();

    this.currentTimelineId = null;
    this.currentTime = 0;
    this.previousTime = 0;

    this.isInitialized = false;
    this.isDestroyed = true;
    this.isLoaded = false;
    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;

    this._debug('Destroyed.');
  }


  /* ==========================================================================
     Timeline loading
     ========================================================================== */

  /**
   * 指定したタイムラインを読み込みます。
   *
   * @param {string} timelineId
   * @param {Object} [options]
   * @param {boolean} [options.reset=true]
   * @returns {ReadonlyArray<Object>}
   */
  load(
    timelineId,
    {
      reset = true,
    } = {}
  ) {
    this._assertReady();

    if (
      typeof timelineId !== 'string' ||
      timelineId.trim() === ''
    ) {
      throw new TypeError(
        '[TimelineManager] timelineId must be a non-empty string.'
      );
    }

    const timeline =
      getTimelineConfig(timelineId);

    this.currentTimelineId = timelineId;
    this.timeline = timeline;
    this.isLoaded = true;

    if (reset) {
      this._resetExecutionState();
    } else {
      this.isCompleted =
        this._isTimelineCompleted();
    }

    this._debug(
      'Timeline loaded:',
      timelineId,
      `events=${timeline.length}`
    );

    return this.timeline;
  }


  /**
   * 現在のタイムラインを解除します。
   */
  unload() {
    this._assertReady();

    const previousTimelineId =
      this.currentTimelineId;

    this.timeline = Object.freeze([]);
    this.executedEventIds.clear();

    this.currentTimelineId = null;
    this.currentTime = 0;
    this.previousTime = 0;

    this.isLoaded = false;
    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;

    this._debug(
      'Timeline unloaded:',
      previousTimelineId
    );
  }


  /* ==========================================================================
     Playback control
     ========================================================================== */

  /**
   * タイムライン実行を開始します。
   *
   * @param {Object} [options]
   * @param {number} [options.startTime]
   */
  start({
    startTime,
  } = {}) {
    this._assertReady();
    this._assertLoaded();

    if (startTime !== undefined) {
      const normalizedStartTime =
        this._normalizeTime(startTime);

      this.currentTime = normalizedStartTime;
      this.previousTime = normalizedStartTime;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.isCompleted = false;

    this._emit(EVENTS.TIMELINE_STARTED, {
      timelineId: this.currentTimelineId,
      currentTime: this.currentTime,
      eventCount: this.timeline.length,
    });

    /*
     * 0秒に設定されたイベントを取りこぼさないよう、
     * 開始時点でも現在時刻までを評価します。
     */
    this._processEvents(
      this.currentTime,
      {
        includePreviousTime: true,
      }
    );

    this._checkCompletion();

    this._debug(
      'Timeline started:',
      this.currentTimelineId,
      this.currentTime
    );
  }


  /**
   * タイムライン実行を一時停止します。
   */
  pause() {
    this._assertReady();

    if (
      !this.isLoaded ||
      !this.isRunning ||
      this.isPaused
    ) {
      return;
    }

    this.isPaused = true;

    this._emit(EVENTS.TIMELINE_PAUSED, {
      timelineId: this.currentTimelineId,
      currentTime: this.currentTime,
    });

    this._debug(
      'Timeline paused:',
      this.currentTimelineId,
      this.currentTime
    );
  }


  /**
   * 一時停止したタイムライン実行を再開します。
   */
  resume() {
    this._assertReady();

    if (
      !this.isLoaded ||
      !this.isRunning ||
      !this.isPaused ||
      this.isCompleted
    ) {
      return;
    }

    this.isPaused = false;

    this._emit(EVENTS.TIMELINE_RESUMED, {
      timelineId: this.currentTimelineId,
      currentTime: this.currentTime,
    });

    this._debug(
      'Timeline resumed:',
      this.currentTimelineId,
      this.currentTime
    );
  }


  /**
   * タイムラインを停止します。
   *
   * 発火済み情報は保持します。
   */
  stop() {
    this._assertReady();

    if (!this.isLoaded) {
      return;
    }

    this.isRunning = false;
    this.isPaused = false;

    this._debug(
      'Timeline stopped:',
      this.currentTimelineId,
      this.currentTime
    );
  }


  /**
   * タイムラインを初期状態へ戻します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.keepRunning=false]
   */
  reset({
    keepRunning = false,
  } = {}) {
    this._assertReady();

    if (!this.isLoaded) {
      return;
    }

    this._resetExecutionState();

    this.isRunning = Boolean(keepRunning);
    this.isPaused = false;

    this._emit(EVENTS.TIMELINE_RESET, {
      timelineId: this.currentTimelineId,
      keepRunning: this.isRunning,
    });

    if (this.isRunning) {
      this._processEvents(
        0,
        {
          includePreviousTime: true,
        }
      );

      this._checkCompletion();
    }

    this._debug(
      'Timeline reset:',
      this.currentTimelineId
    );
  }


  /* ==========================================================================
     Time update
     ========================================================================== */

  /**
   * 動画の現在時刻をタイムラインへ反映します。
   *
   * @param {number} currentTime 秒
   * @returns {ReadonlyArray<Object>} 今回発火したイベント
   */
  update(currentTime) {
    this._assertReady();

    if (
      !this.isLoaded ||
      !this.isRunning ||
      this.isPaused ||
      this.isCompleted
    ) {
      return Object.freeze([]);
    }

    const normalizedTime =
      this._normalizeTime(currentTime);

    const seekedBackward =
      normalizedTime < this.currentTime;

    this.previousTime = this.currentTime;
    this.currentTime = normalizedTime;

    if (seekedBackward) {
      this._handleBackwardSeek(
        normalizedTime
      );
    }

    const firedEvents =
      this._processEvents(
        normalizedTime,
        {
          includePreviousTime:
            seekedBackward,
        }
      );

    this._checkCompletion();

    return firedEvents;
  }


  /**
   * 指定時刻へタイムラインを移動します。
   *
   * @param {number} time
   * @param {Object} [options]
   * @param {boolean} [options.replayEvents=false]
   * @param {boolean} [options.executeEvents=false]
   */
  seek(
    time,
    {
      replayEvents = false,
      executeEvents = false,
    } = {}
  ) {
    this._assertReady();
    this._assertLoaded();

    const normalizedTime =
      this._normalizeTime(time);

    const previousTime =
      this.currentTime;

    this.previousTime = previousTime;
    this.currentTime = normalizedTime;

    if (
      replayEvents &&
      normalizedTime < previousTime
    ) {
      this._removeExecutedEventsAfter(
        normalizedTime
      );
    }

    if (executeEvents) {
      this._processEvents(
        normalizedTime,
        {
          includePreviousTime:
            normalizedTime < previousTime,
        }
      );
    }

    this.isCompleted =
      this._isTimelineCompleted();

    this._debug(
      'Timeline seek:',
      previousTime,
      '->',
      normalizedTime,
      {
        replayEvents,
        executeEvents,
      }
    );
  }


  /* ==========================================================================
     Event processing
     ========================================================================== */

  /**
   * 現在時刻までに到達したイベントを実行します。
   *
   * @param {number} currentTime
   * @param {Object} [options]
   * @param {boolean} [options.includePreviousTime=false]
   * @returns {ReadonlyArray<Object>}
   * @private
   */
  _processEvents(
    currentTime,
    {
      includePreviousTime = false,
    } = {}
  ) {
    const firedEvents = [];

    for (const timelineEvent of this.timeline) {
      if (
        !this._shouldFireEvent(
          timelineEvent,
          currentTime,
          includePreviousTime
        )
      ) {
        continue;
      }

      this._fireTimelineEvent(
        timelineEvent
      );

      firedEvents.push(
        timelineEvent
      );
    }

    return Object.freeze(firedEvents);
  }


  /**
   * イベントを発火すべきか判定します。
   *
   * @param {Readonly<Object>} timelineEvent
   * @param {number} currentTime
   * @param {boolean} includePreviousTime
   * @returns {boolean}
   * @private
   */
  _shouldFireEvent(
    timelineEvent,
    currentTime,
    includePreviousTime
  ) {
    if (
      timelineEvent.once &&
      this.executedEventIds.has(
        timelineEvent.id
      )
    ) {
      return false;
    }

    if (timelineEvent.time > currentTime) {
      return false;
    }

    /*
     * 通常再生では、
     * 前回時刻より後にあるイベントだけを対象とします。
     *
     * 開始時や後方シーク直後などは、
     * includePreviousTimeによって現在時刻までを再評価できます。
     */
    if (
      !includePreviousTime &&
      timelineEvent.time <=
        this.previousTime
    ) {
      return false;
    }

    return true;
  }


  /**
   * TIMELINE_EVENTを発行します。
   *
   * @param {Readonly<Object>} timelineEvent
   * @private
   */
  _fireTimelineEvent(timelineEvent) {
    if (timelineEvent.once) {
      this.executedEventIds.add(
        timelineEvent.id
      );
    }

    const detail = {
      timelineId:
        this.currentTimelineId,

      eventId:
        timelineEvent.id,

      eventTime:
        timelineEvent.time,

      currentTime:
        this.currentTime,

      type:
        timelineEvent.type,

      payload:
        timelineEvent.payload ?? {},

      once:
        timelineEvent.once,
    };

    this._emit(
      EVENTS.TIMELINE_EVENT,
      detail
    );

    this._debugTimeline(
      'Timeline event fired:',
      detail
    );
  }


  /**
   * 後方シーク時の処理です。
   *
   * onceイベントは通常、発火済み状態を維持します。
   * 再発火させたい場合はseek()のreplayEventsを使用します。
   *
   * @param {number} currentTime
   * @private
   */
  _handleBackwardSeek(currentTime) {
    this.isCompleted = false;

    this._debugTimeline(
      'Backward seek detected:',
      {
        from: this.previousTime,
        to: currentTime,
      }
    );
  }


  /**
   * 指定時刻より後のイベントを未実行状態へ戻します。
   *
   * @param {number} time
   * @private
   */
  _removeExecutedEventsAfter(time) {
    for (const timelineEvent of this.timeline) {
      if (timelineEvent.time > time) {
        this.executedEventIds.delete(
          timelineEvent.id
        );
      }
    }
  }


  /* ==========================================================================
     Completion
     ========================================================================== */

  /**
   * タイムライン完了を確認します。
   *
   * @private
   */
  _checkCompletion() {
    if (
      this.isCompleted ||
      !this.isLoaded ||
      !this.isRunning
    ) {
      return;
    }

    if (!this._isTimelineCompleted()) {
      return;
    }

    this.isCompleted = true;
    this.isRunning = false;
    this.isPaused = false;

    this._emit(
      EVENTS.TIMELINE_COMPLETED,
      {
        timelineId:
          this.currentTimelineId,

        currentTime:
          this.currentTime,

        eventCount:
          this.timeline.length,

        executedEventCount:
          this.executedEventIds.size,
      }
    );

    this._debug(
      'Timeline completed:',
      this.currentTimelineId,
      this.currentTime
    );
  }


  /**
   * 現在のタイムラインが完了しているか判定します。
   *
   * タイムラインが空の場合は、
   * 開始された時点で完了と扱います。
   *
   * once:falseのイベントは繰り返し可能なため、
   * 完了判定では時刻到達のみを確認します。
   *
   * @returns {boolean}
   * @private
   */
  _isTimelineCompleted() {
    if (this.timeline.length === 0) {
      return true;
    }

    const lastEvent =
      this.timeline[
        this.timeline.length - 1
      ];

    return (
      this.currentTime >=
      lastEvent.time
    );
  }


  /* ==========================================================================
     Scene event handling
     ========================================================================== */

  /**
   * SceneManagerの時間更新イベントを処理します。
   *
   * detail.currentTimeまたはdetail.timeを受け取ります。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleSceneTimeUpdated(event) {
    const detail =
      event?.detail ?? {};

    const currentTime =
      detail.currentTime ??
      detail.time;

    if (
      typeof currentTime !== 'number' ||
      !Number.isFinite(currentTime)
    ) {
      this._emitError(
        'SCENE_TIME_UPDATED event requires a finite currentTime.',
        {
          detail,
        }
      );

      return;
    }

    /*
     * 別シーンの時間更新が遅れて届いた場合は無視します。
     */
    const incomingTimelineId =
      detail.timelineId ??
      detail.sceneId ??
      null;

    if (
      incomingTimelineId !== null &&
      this.currentTimelineId !== null &&
      incomingTimelineId !==
        this.currentTimelineId
    ) {
      this._debugTimeline(
        'Ignored time update from another timeline:',
        {
          currentTimelineId:
            this.currentTimelineId,
          incomingTimelineId,
        }
      );

      return;
    }

    try {
      this.update(currentTime);
    } catch (error) {
      this._emitError(
        'Failed to update timeline time.',
        {
          error,
          detail,
        }
      );
    }
  }


  /**
   * SceneManagerの再生開始イベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleSceneStarted(event) {
    const detail =
      event?.detail ?? {};

    const timelineId =
      detail.timelineId ??
      detail.sceneId;

    if (
      typeof timelineId !== 'string' ||
      timelineId.trim() === ''
    ) {
      this._emitError(
        'SCENE_STARTED event requires sceneId or timelineId.',
        {
          detail,
        }
      );

      return;
    }

    try {
      if (
        !this.isLoaded ||
        this.currentTimelineId !==
          timelineId
      ) {
        this.load(
          timelineId,
          {
            reset: true,
          }
        );
      }

      this.start({
        startTime:
          detail.currentTime ??
          detail.time ??
          0,
      });
    } catch (error) {
      this._emitError(
        'Failed to start timeline from scene event.',
        {
          error,
          detail,
        }
      );
    }
  }


  /**
   * SceneManagerの一時停止イベントを処理します。
   *
   * @private
   */
  _handleScenePaused() {
    try {
      this.pause();
    } catch (error) {
      this._emitError(
        'Failed to pause timeline.',
        {
          error,
        }
      );
    }
  }


  /**
   * SceneManagerの停止イベントを処理します。
   *
   * @private
   */
  _handleSceneStopped() {
    try {
      this.stop();
    } catch (error) {
      this._emitError(
        'Failed to stop timeline.',
        {
          error,
        }
      );
    }
  }


  /**
   * SceneManagerのシーン終了イベントを処理します。
   *
   * 動画終了時刻が最後のタイムラインイベントより前でも、
   * シーン終了を優先してタイムラインを停止します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleSceneEnded(event) {
    const detail =
      event?.detail ?? {};

    const incomingTimelineId =
      detail.timelineId ??
      detail.sceneId ??
      null;

    if (
      incomingTimelineId !== null &&
      this.currentTimelineId !== null &&
      incomingTimelineId !==
        this.currentTimelineId
    ) {
      return;
    }

    try {
      if (
        typeof detail.currentTime ===
          'number' &&
        Number.isFinite(
          detail.currentTime
        )
      ) {
        this.update(
          detail.currentTime
        );
      }

      this.stop();
    } catch (error) {
      this._emitError(
        'Failed to finish timeline after scene ended.',
        {
          error,
          detail,
        }
      );
    }
  }


  /* ==========================================================================
     Event listener registration
     ========================================================================== */

  /**
   * eventBusのイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    this._addListener(
      this.eventBus,
      EVENTS.SCENE_TIME_UPDATED,
      this._handleSceneTimeUpdated
    );

    this._addListener(
      this.eventBus,
      EVENTS.SCENE_STARTED,
      this._handleSceneStarted
    );

    this._addListener(
      this.eventBus,
      EVENTS.SCENE_PAUSED,
      this._handleScenePaused
    );

    this._addListener(
      this.eventBus,
      EVENTS.SCENE_STOPPED,
      this._handleSceneStopped
    );

    this._addListener(
      this.eventBus,
      EVENTS.SCENE_ENDED,
      this._handleSceneEnded
    );
  }


  /**
   * イベントリスナーを登録し、
   * destroy時に解除できるよう保持します。
   *
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListener} handler
   * @param {boolean|AddEventListenerOptions} [options]
   * @private
   */
  _addListener(
    target,
    type,
    handler,
    options = false
  ) {
    target.addEventListener(
      type,
      handler,
      options
    );

    this.listeners.push({
      target,
      type,
      handler,
      options,
    });
  }


  /* ==========================================================================
     Public getters
     ========================================================================== */

  /**
   * 現在のタイムラインIDを返します。
   *
   * @returns {string|null}
   */
  getCurrentTimelineId() {
    return this.currentTimelineId;
  }


  /**
   * 現在時刻を返します。
   *
   * @returns {number}
   */
  getCurrentTime() {
    return this.currentTime;
  }


  /**
   * 現在のタイムライン設定を返します。
   *
   * @returns {ReadonlyArray<Object>}
   */
  getTimeline() {
    return this.timeline;
  }


  /**
   * タイムラインが読み込まれているか返します。
   *
   * @returns {boolean}
   */
  getLoadedState() {
    return this.isLoaded;
  }


  /**
   * タイムラインが実行中か返します。
   *
   * @returns {boolean}
   */
  getRunningState() {
    return (
      this.isRunning &&
      !this.isPaused &&
      !this.isCompleted
    );
  }


  /**
   * タイムラインが一時停止中か返します。
   *
   * @returns {boolean}
   */
  getPausedState() {
    return this.isPaused;
  }


  /**
   * タイムラインが完了しているか返します。
   *
   * @returns {boolean}
   */
  getCompletedState() {
    return this.isCompleted;
  }


  /**
   * 発火済みのイベントIDを返します。
   *
   * @returns {ReadonlyArray<string>}
   */
  getExecutedEventIds() {
    return Object.freeze(
      Array.from(
        this.executedEventIds
      )
    );
  }


  /**
   * 未発火イベントを返します。
   *
   * @returns {ReadonlyArray<Object>}
   */
  getPendingEvents() {
    return Object.freeze(
      this.timeline.filter(
        timelineEvent =>
          !timelineEvent.once ||
          !this.executedEventIds.has(
            timelineEvent.id
          )
      )
    );
  }


  /* ==========================================================================
     Internal state helpers
     ========================================================================== */

  /**
   * タイムライン実行状態を初期化します。
   *
   * @private
   */
  _resetExecutionState() {
    this.executedEventIds.clear();

    this.currentTime = 0;
    this.previousTime = 0;

    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;
  }


  /**
   * 時刻を0以上の有限値へ正規化します。
   *
   * @param {*} time
   * @returns {number}
   * @private
   */
  _normalizeTime(time) {
    if (
      typeof time !== 'number' ||
      !Number.isFinite(time)
    ) {
      throw new TypeError(
        `[TimelineManager] Time must be a finite number: ${String(time)}`
      );
    }

    return Math.max(
      0,
      time
    );
  }


  /* ==========================================================================
     Event dispatch
     ========================================================================== */

  /**
   * 共通イベントバスへCustomEventを発行します。
   *
   * @param {string} eventName
   * @param {Object} [detail]
   * @private
   */
  _emit(eventName, detail = {}) {
    this.eventBus.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          ...detail,
          timestamp: Date.now(),
        },
      })
    );

    this._debug(
      'Dispatch event:',
      eventName,
      detail
    );
  }


  /**
   * TimelineManagerのエラーイベントを発行します。
   *
   * @param {string} message
   * @param {Object} [context]
   * @private
   */
  _emitError(
    message,
    context = {}
  ) {
    const originalError =
      context.error instanceof Error
        ? context.error
        : null;

    const error =
      originalError ??
      new Error(message);

    console.error(
      '[TimelineManager]',
      message,
      context
    );

    this._emit(
      EVENTS.TIMELINE_ERROR,
      {
        source:
          'timeline-manager',

        timelineId:
          this.currentTimelineId,

        message,
        error,
        context,
      }
    );
  }


  /* ==========================================================================
     General helpers
     ========================================================================== */

  /**
   * TimelineManagerが使用可能か検証します。
   *
   * @private
   */
  _assertReady() {
    if (this.isDestroyed) {
      throw new Error(
        '[TimelineManager] This instance has been destroyed.'
      );
    }

    if (!this.isInitialized) {
      throw new Error(
        '[TimelineManager] init() must be called before using this method.'
      );
    }
  }


  /**
   * タイムラインが読み込まれているか検証します。
   *
   * @private
   */
  _assertLoaded() {
    if (
      !this.isLoaded ||
      this.currentTimelineId === null
    ) {
      throw new Error(
        '[TimelineManager] load() must be called before starting the timeline.'
      );
    }
  }


  /**
   * 通常のデバッグログを出力します。
   *
   * @param {...*} args
   * @private
   */
  _debug(...args) {
    if (
      !DEBUG_CONFIG.enabled ||
      !DEBUG_CONFIG.enableVerboseLogging
    ) {
      return;
    }

    console.debug(
      '[TimelineManager]',
      ...args
    );
  }


  /**
   * タイムライン専用ログを出力します。
   *
   * @param {...*} args
   * @private
   */
  _debugTimeline(...args) {
    if (
      !DEBUG_CONFIG.enabled ||
      (
        !DEBUG_CONFIG.enableVerboseLogging &&
        !DEBUG_CONFIG.enableTimelineLogging
      )
    ) {
      return;
    }

    console.debug(
      '[TimelineManager]',
      ...args
    );
  }
}


export default TimelineManager;
