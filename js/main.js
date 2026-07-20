/**
 * Dream On AirTaxi Player
 * Main Application Controller
 *
 * @file js/main.js
 * @description
 * アプリケーション全体の起動、状態管理、
 * 各Manager間のイベント仲介、シーン遷移、
 * タイムラインイベントの振り分けを担当します。
 *
 * 各Managerは互いを直接呼び出さず、
 * main.jsのみがManager間の調整を行います。
 */

import {
  APP_CONFIG,
  APP_STATES,
  CHOICE_IDS,
  DEBUG_CONFIG,
  EVENTS,
  ROUTE_IDS,
  SCENE_IDS,
  TIMELINE_EVENT_TYPES,
  validateConfig,
} from './config.js';

import SceneManager from './scene-manager.js';
import TimelineManager from './timeline-manager.js';
import MentorManager from './mentor-manager.js';
import RotorManager from './rotor-manager.js';
import UIManager from './ui-manager.js';


/**
 * Dream On AirTaxi Player本体です。
 */
class AirTaxiPlayerApp {
  constructor() {
    /**
     * 全Managerで共有するイベントバスです。
     *
     * @type {EventTarget}
     */
    this.eventBus = new EventTarget();

    /**
     * 各Managerのインスタンスです。
     */
    this.sceneManager = null;
    this.timelineManager = null;
    this.mentorManager = null;
    this.rotorManager = null;
    this.uiManager = null;

    /**
     * main.js自身が登録したイベントリスナーです。
     */
    this.listeners = [];

    this.state = APP_STATES.BOOTING;
    this.selectedRouteId = null;

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isStarting = false;
    this.isChangingScene = false;

    this._handleStartRequested =
      this._handleStartRequested.bind(this);

    this._handleChoiceSelected =
      this._handleChoiceSelected.bind(this);

    this._handleRestartRequested =
      this._handleRestartRequested.bind(this);

    this._handleFullscreenRequested =
      this._handleFullscreenRequested.bind(this);

    this._handleSceneEnded =
      this._handleSceneEnded.bind(this);

    this._handleTimelineEvent =
      this._handleTimelineEvent.bind(this);

    this._handleManagerError =
      this._handleManagerError.bind(this);

    this._handleUnhandledError =
      this._handleUnhandledError.bind(this);

    this._handleUnhandledRejection =
      this._handleUnhandledRejection.bind(this);

    this._handleBeforeUnload =
      this._handleBeforeUnload.bind(this);
  }


  /* ==========================================================================
     Lifecycle
     ========================================================================== */

  /**
   * アプリケーションを初期化します。
   *
   * @returns {Promise<AirTaxiPlayerApp>}
   */
  async init() {
    if (this.isDestroyed) {
      throw new Error(
        '[AirTaxiPlayerApp] Cannot initialize a destroyed application.'
      );
    }

    if (this.isInitialized) {
      this._debug(
        'Initialization skipped: already initialized.'
      );

      return this;
    }

    try {
      this._setState(
        APP_STATES.BOOTING
      );

      this._validateConfiguration();
      this._createManagers();
      this._registerEventListeners();
      this._initializeManagers();

      this.isInitialized = true;

      this.uiManager.showLoading();

      await this.sceneManager.load(
        APP_CONFIG.initialSceneId,
        {
          resetVideo: true,
        }
      );

      this.uiManager.hideLoading();
      this.uiManager.showStartScreen();

      this._setState(
        APP_STATES.READY
      );

      this._debug(
        'Application initialized.'
      );

      return this;
    } catch (error) {
      this._handleFatalError(
        'アプリケーションの初期化に失敗しました。',
        error
      );

      throw error;
    }
  }


  /**
   * アプリケーションを破棄します。
   */
  destroy() {
    if (this.isDestroyed) {
      return;
    }

    for (const listener of this.listeners) {
      listener.target.removeEventListener(
        listener.type,
        listener.handler,
        listener.options
      );
    }

    this.listeners = [];

    this.sceneManager?.destroy();
    this.timelineManager?.destroy();
    this.mentorManager?.destroy();
    this.rotorManager?.destroy();
    this.uiManager?.destroy();

    this.sceneManager = null;
    this.timelineManager = null;
    this.mentorManager = null;
    this.rotorManager = null;
    this.uiManager = null;

    this.isInitialized = false;
    this.isDestroyed = true;
    this.isStarting = false;
    this.isChangingScene = false;

    this.selectedRouteId = null;

    this._setState(
      APP_STATES.DESTROYED
    );

    this._debug(
      'Application destroyed.'
    );
  }


  /* ==========================================================================
     Initialization
     ========================================================================== */

  /**
   * config.js全体を検証します。
   *
   * @private
   */
  _validateConfiguration() {
    if (
      typeof validateConfig !==
      'function'
    ) {
      throw new Error(
        '[AirTaxiPlayerApp] validateConfig() is not available.'
      );
    }

    const result =
      validateConfig();

    /*
     * validateConfig()がfalseを返す形式にも対応します。
     * エラー時にthrowする実装であれば、そのまま上位へ伝播します。
     */
    if (result === false) {
      throw new Error(
        '[AirTaxiPlayerApp] Configuration validation failed.'
      );
    }

    this._debug(
      'Configuration validated.'
    );
  }


  /**
   * 各Managerを生成します。
   *
   * @private
   */
  _createManagers() {
    const options = {
      eventBus: this.eventBus,
    };

    this.uiManager =
      new UIManager(options);

    this.sceneManager =
      new SceneManager(options);

    this.timelineManager =
      new TimelineManager(options);

    this.mentorManager =
      new MentorManager(options);

    this.rotorManager =
      new RotorManager(options);
  }


  /**
   * 各Managerを初期化します。
   *
   * @private
   */
  _initializeManagers() {
    /*
     * UIを先に初期化することで、
     * 後続Managerのエラーを画面表示できます。
     */
    this.uiManager.init();
    this.sceneManager.init();
    this.timelineManager.init();
    this.mentorManager.init();

    /*
     * ローター用3Dモデルの読み込みは非同期ですが、
     * RotorManager自身がmodel-loadedを待機します。
     */
    this.rotorManager.init();
  }


  /* ==========================================================================
     Event registration
     ========================================================================== */

  /**
   * main.jsが処理するイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    this._addListener(
      this.eventBus,
      EVENTS.UI_START_REQUESTED,
      this._handleStartRequested
    );

    this._addListener(
      this.eventBus,
      EVENTS.UI_CHOICE_SELECTED,
      this._handleChoiceSelected
    );

    this._addListener(
      this.eventBus,
      EVENTS.UI_RESTART_REQUESTED,
      this._handleRestartRequested
    );

    this._addListener(
      this.eventBus,
      EVENTS.UI_FULLSCREEN_REQUESTED,
      this._handleFullscreenRequested
    );

    this._addListener(
      this.eventBus,
      EVENTS.SCENE_ENDED,
      this._handleSceneEnded
    );

    this._addListener(
      this.eventBus,
      EVENTS.TIMELINE_EVENT,
      this._handleTimelineEvent
    );

    const errorEvents = [
      EVENTS.SCENE_ERROR,
      EVENTS.TIMELINE_ERROR,
      EVENTS.MENTOR_ERROR,
      EVENTS.ROTOR_ERROR,
      EVENTS.UI_ERROR,
    ];

    for (const eventName of errorEvents) {
      if (
        typeof eventName === 'string' &&
        eventName.length > 0
      ) {
        this._addListener(
          this.eventBus,
          eventName,
          this._handleManagerError
        );
      }
    }

    this._addListener(
      window,
      'error',
      this._handleUnhandledError
    );

    this._addListener(
      window,
      'unhandledrejection',
      this._handleUnhandledRejection
    );

    this._addListener(
      window,
      'beforeunload',
      this._handleBeforeUnload
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
    if (
      !target ||
      typeof type !== 'string' ||
      type.length === 0
    ) {
      return;
    }

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
     Application start
     ========================================================================== */

  /**
   * スタート操作を処理します。
   *
   * @private
   */
  async _handleStartRequested() {
    if (
      this.isStarting ||
      this.isChangingScene ||
      this.state !== APP_STATES.READY
    ) {
      return;
    }

    this.isStarting = true;

    try {
      this._setState(
        APP_STATES.PLAYING
      );

      this.uiManager.hideStartScreen();
      this.uiManager.hideControls();
      this.uiManager.hideChoice();
      this.uiManager.hideCompletion();
      this.uiManager.hideError();

      await this._requestFullscreenSafely();

      await this.sceneManager.play({
        unmute: true,
      });

      this._debug(
        'Experience started.'
      );
    } catch (error) {
      this._handleRecoverableError(
        '映像を再生できませんでした。画面をもう一度タップしてください。',
        error
      );

      this._setState(
        APP_STATES.READY
      );

      this.uiManager.showStartScreen();
    } finally {
      this.isStarting = false;
    }
  }


  /* ==========================================================================
     Timeline event routing
     ========================================================================== */

  /**
   * TimelineManagerから届いたイベントを振り分けます。
   *
   * @param {CustomEvent} event
   * @private
   */
  async _handleTimelineEvent(event) {
    const detail =
      event?.detail ?? {};

    const type =
      detail.type;

    const payload =
      detail.payload ?? {};

    if (
      typeof type !== 'string' ||
      type.length === 0
    ) {
      this._handleRecoverableError(
        'タイムラインイベントの種類が設定されていません。',
        new Error(
          '[AirTaxiPlayerApp] Timeline event type is missing.'
        )
      );

      return;
    }

    this._debug(
      'Timeline event received:',
      type,
      payload
    );

    try {
      switch (type) {
        case TIMELINE_EVENT_TYPES.MENTOR_SHOW:
          this._showMentorFromTimeline(
            payload
          );
          break;

        case TIMELINE_EVENT_TYPES.MENTOR_HIDE:
          this.mentorManager.hide({
            reason: 'timeline',
          });
          break;

        case TIMELINE_EVENT_TYPES.ROTOR_START:
          this.rotorManager.start(
            payload.speed
          );
          break;

        case TIMELINE_EVENT_TYPES.ROTOR_STOP:
          this.rotorManager.stop({
            immediate:
              payload.immediate,
          });
          break;

        case TIMELINE_EVENT_TYPES.ROTOR_SPEED_CHANGE:
          this.rotorManager.setSpeed(
            payload.speed
          );
          break;

        case TIMELINE_EVENT_TYPES.UI_SHOW_CONTROLS:
          this.uiManager.showControls(
            payload
          );
          break;

        case TIMELINE_EVENT_TYPES.UI_HIDE_CONTROLS:
          this.uiManager.hideControls();
          break;

        case TIMELINE_EVENT_TYPES.UI_SHOW_CHOICE:
          await this._showChoiceFromTimeline(
            payload
          );
          break;

        case TIMELINE_EVENT_TYPES.UI_HIDE_CHOICE:
          this.uiManager.hideChoice();
          break;

        case TIMELINE_EVENT_TYPES.SCENE_PAUSE:
          this.sceneManager.pause();
          this._setState(
            APP_STATES.PAUSED
          );
          break;

        case TIMELINE_EVENT_TYPES.SCENE_RESUME:
          await this.sceneManager.resume();
          this._setState(
            APP_STATES.PLAYING
          );
          break;

        case TIMELINE_EVENT_TYPES.SCENE_CHANGE:
          await this._changeScene(
            payload.sceneId
          );
          break;

        case TIMELINE_EVENT_TYPES.COMPLETE:
          await this._completeExperience();
          break;

        default:
          this._debug(
            'Unsupported timeline event type:',
            type
          );
          break;
      }
    } catch (error) {
      this._handleRecoverableError(
        '体験中の処理に失敗しました。',
        error
      );
    }
  }


  /**
   * タイムライン設定に従いソラ教官を表示します。
   *
   * @param {Object} payload
   * @private
   */
  _showMentorFromTimeline(payload) {
    const messageId =
      payload.messageId;

    if (
      typeof messageId !== 'string' ||
      messageId.length === 0
    ) {
      throw new Error(
        '[AirTaxiPlayerApp] Mentor timeline event requires messageId.'
      );
    }

    this.mentorManager.show(
      messageId,
      {
        durationMs:
          payload.durationMs,

        restart:
          payload.restart ??
          true,
      }
    );
  }


  /**
   * 選択肢を表示し、必要に応じて動画を一時停止します。
   *
   * @param {Object} payload
   * @private
   */
  async _showChoiceFromTimeline(payload) {
    const choiceId =
      payload.choiceId;

    if (
      typeof choiceId !== 'string' ||
      choiceId.length === 0
    ) {
      throw new Error(
        '[AirTaxiPlayerApp] Choice timeline event requires choiceId.'
      );
    }

    const pauseScene =
      payload.pauseScene ??
      true;

    if (pauseScene) {
      this.sceneManager.pause();

      this._setState(
        APP_STATES.WAITING_FOR_CHOICE
      );
    }

    this.uiManager.showChoice(
      choiceId
    );
  }


  /* ==========================================================================
     Choice handling
     ========================================================================== */

  /**
   * UIManagerから届いた選択結果を処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  async _handleChoiceSelected(event) {
    if (this.isChangingScene) {
      return;
    }

    const detail =
      event?.detail ?? {};

    const choiceId =
      detail.choiceId;

    const optionId =
      detail.optionId ??
      detail.value ??
      detail.routeId;

    if (
      typeof choiceId !== 'string' ||
      typeof optionId !== 'string'
    ) {
      this._handleRecoverableError(
        '選択結果を正しく取得できませんでした。',
        new Error(
          '[AirTaxiPlayerApp] Choice selection requires choiceId and optionId.'
        )
      );

      return;
    }

    this.uiManager.hideChoice();

    try {
      switch (choiceId) {
        case CHOICE_IDS.ROUTE:
          await this._handleRouteChoice(
            optionId
          );
          break;

        default:
          throw new Error(
            `[AirTaxiPlayerApp] Unsupported choice ID: ${choiceId}`
          );
      }
    } catch (error) {
      this._handleRecoverableError(
        'ルートの切り替えに失敗しました。',
        error
      );
    }
  }


  /**
   * ルート選択を処理します。
   *
   * @param {string} routeId
   * @private
   */
  async _handleRouteChoice(routeId) {
    this.selectedRouteId =
      routeId;

    switch (routeId) {
      case ROUTE_IDS.WAIT:
        await this._changeScene(
          SCENE_IDS.WAITING_ROUTE
        );
        break;

      case ROUTE_IDS.ALTERNATE:
        await this._changeScene(
          SCENE_IDS.ALTERNATE_ROUTE
        );
        break;

      default:
        throw new Error(
          `[AirTaxiPlayerApp] Unsupported route ID: ${routeId}`
        );
    }
  }


  /* ==========================================================================
     Scene transitions
     ========================================================================== */

  /**
   * シーン終了時の遷移を処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  async _handleSceneEnded(event) {
    if (
      this.isChangingScene ||
      this.state === APP_STATES.COMPLETED ||
      this.state === APP_STATES.ERROR
    ) {
      return;
    }

    const detail =
      event?.detail ?? {};

    const endedSceneId =
      detail.sceneId;

    const nextSceneId =
      detail.nextSceneId;

    this._debug(
      'Scene ended:',
      endedSceneId,
      'next:',
      nextSceneId
    );

    try {
      if (
        !nextSceneId ||
        nextSceneId ===
          SCENE_IDS.COMPLETED
      ) {
        await this._completeExperience();
        return;
      }

      await this._changeScene(
        nextSceneId
      );
    } catch (error) {
      this._handleRecoverableError(
        '次のシーンへ進めませんでした。',
        error
      );
    }
  }


  /**
   * 指定シーンへ切り替えます。
   *
   * @param {string} sceneId
   * @private
   */
  async _changeScene(sceneId) {
    if (
      this.isChangingScene ||
      typeof sceneId !== 'string' ||
      sceneId.length === 0
    ) {
      return;
    }

    if (
      sceneId ===
      SCENE_IDS.COMPLETED
    ) {
      await this._completeExperience();
      return;
    }

    this.isChangingScene = true;

    try {
      this._setState(
        APP_STATES.TRANSITIONING
      );

      this.uiManager.hideChoice();
      this.uiManager.hideControls();

      this.mentorManager.hide({
        reason: 'scene-change',
      });

      await this.uiManager.fadeOut();

      await this.sceneManager.change(
        sceneId,
        {
          forceReload: true,
          resetVideo: true,
          unmute: false,
        }
      );

      await this.uiManager.fadeIn();

      this._setState(
        APP_STATES.PLAYING
      );

      this._debug(
        'Scene changed:',
        sceneId
      );
    } finally {
      this.isChangingScene = false;
    }
  }


  /* ==========================================================================
     Completion and restart
     ========================================================================== */

  /**
   * 体験完了処理を行います。
   *
   * @private
   */
  async _completeExperience() {
    if (
      this.state ===
      APP_STATES.COMPLETED
    ) {
      return;
    }

    this._setState(
      APP_STATES.COMPLETED
    );

    try {
      this.sceneManager.stop({
        reset: false,
      });
    } catch (error) {
      this._debug(
        'Scene stop during completion failed:',
        error
      );
    }

    try {
      this.rotorManager.stop({
        immediate: false,
      });
    } catch (error) {
      this._debug(
        'Rotor stop during completion failed:',
        error
      );
    }

    this.mentorManager.hide({
      reason: 'experience-completed',
    });

    this.uiManager.hideChoice();
    this.uiManager.hideControls();

    await this.uiManager.fadeOut();

    this.uiManager.showCompletion({
      routeId:
        this.selectedRouteId,
    });

    await this.uiManager.fadeIn();

    this._debug(
      'Experience completed.'
    );
  }


  /**
   * もう一度体験する操作を処理します。
   *
   * @private
   */
  async _handleRestartRequested() {
    if (this.isChangingScene) {
      return;
    }

    this.isChangingScene = true;

    try {
      this._setState(
        APP_STATES.TRANSITIONING
      );

      this.selectedRouteId = null;

      this.uiManager.hideCompletion();
      this.uiManager.hideChoice();
      this.uiManager.hideControls();
      this.uiManager.hideError();

      this.mentorManager.reset();
      this.rotorManager.reset();

      await this.uiManager.fadeOut();

      await this.sceneManager.load(
        APP_CONFIG.initialSceneId,
        {
          forceReload: true,
          resetVideo: true,
        }
      );

      await this.uiManager.fadeIn();

      this.uiManager.showStartScreen();

      this._setState(
        APP_STATES.READY
      );

      this._debug(
        'Experience reset.'
      );
    } catch (error) {
      this._handleFatalError(
        '体験を最初から読み込み直せませんでした。',
        error
      );
    } finally {
      this.isChangingScene = false;
    }
  }


  /* ==========================================================================
     Fullscreen
     ========================================================================== */

  /**
   * 全画面表示ボタンを処理します。
   *
   * @private
   */
  async _handleFullscreenRequested() {
    await this._requestFullscreenSafely();
  }


  /**
   * 全画面表示を安全に要求します。
   *
   * iOS SafariなどFullscreen APIが利用できない環境では、
   * エラーにせず通常表示を継続します。
   *
   * @returns {Promise<boolean>}
   * @private
   */
  async _requestFullscreenSafely() {
    if (document.fullscreenElement) {
      return true;
    }

    const target =
      document.documentElement;

    const requestFullscreen =
      target.requestFullscreen ??
      target.webkitRequestFullscreen ??
      target.msRequestFullscreen;

    if (
      typeof requestFullscreen !==
      'function'
    ) {
      this._debug(
        'Fullscreen API is not supported.'
      );

      return false;
    }

    try {
      await requestFullscreen.call(
        target
      );

      return true;
    } catch (error) {
      /*
       * 全画面表示拒否は体験継続可能なため、
       * エラー画面には遷移しません。
       */
      this._debug(
        'Fullscreen request was rejected:',
        error
      );

      return false;
    }
  }


  /* ==========================================================================
     Error handling
     ========================================================================== */

  /**
   * Managerが発行したエラーを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleManagerError(event) {
    const detail =
      event?.detail ?? {};

    const error =
      detail.error instanceof Error
        ? detail.error
        : new Error(
            detail.message ??
            'Unknown manager error.'
          );

    /*
     * RotorManagerのローター未検出などは、
     * 映像体験自体を止める必要がないため警告扱いにします。
     */
    if (
      detail.source ===
      'rotor-manager'
    ) {
      console.warn(
        '[AirTaxiPlayerApp]',
        detail.message,
        detail.context
      );

      return;
    }

    this._handleRecoverableError(
      detail.message ??
      '体験中にエラーが発生しました。',
      error
    );
  }


  /**
   * window.errorを処理します。
   *
   * @param {ErrorEvent} event
   * @private
   */
  _handleUnhandledError(event) {
    const error =
      event?.error instanceof Error
        ? event.error
        : new Error(
            event?.message ??
            'Unhandled application error.'
          );

    this._handleFatalError(
      '予期しないエラーが発生しました。',
      error
    );
  }


  /**
   * 未処理Promise rejectionを処理します。
   *
   * @param {PromiseRejectionEvent} event
   * @private
   */
  _handleUnhandledRejection(event) {
    const reason =
      event?.reason;

    const error =
      reason instanceof Error
        ? reason
        : new Error(
            String(
              reason ??
              'Unhandled promise rejection.'
            )
          );

    this._handleFatalError(
      '処理を完了できませんでした。',
      error
    );
  }


  /**
   * 復旧可能なエラーを表示します。
   *
   * @param {string} userMessage
   * @param {Error} error
   * @private
   */
  _handleRecoverableError(
    userMessage,
    error
  ) {
    console.error(
      '[AirTaxiPlayerApp]',
      userMessage,
      error
    );

    this.uiManager?.showError({
      title:
        'エラーが発生しました',

      message:
        userMessage,

      recoverable:
        true,
    });
  }


  /**
   * 致命的なエラーを処理します。
   *
   * @param {string} userMessage
   * @param {Error} error
   * @private
   */
  _handleFatalError(
    userMessage,
    error
  ) {
    console.error(
      '[AirTaxiPlayerApp]',
      userMessage,
      error
    );

    this._setState(
      APP_STATES.ERROR
    );

    try {
      this.sceneManager?.stop({
        reset: false,
      });
    } catch {
      // エラー処理中の追加例外は無視します。
    }

    try {
      this.rotorManager?.stop({
        immediate: true,
      });
    } catch {
      // エラー処理中の追加例外は無視します。
    }

    try {
      this.mentorManager?.hide({
        reason: 'fatal-error',
      });
    } catch {
      // エラー処理中の追加例外は無視します。
    }

    this.uiManager?.hideLoading();
    this.uiManager?.hideStartScreen();
    this.uiManager?.hideChoice();
    this.uiManager?.hideControls();

    this.uiManager?.showError({
      title:
        '体験を続けられません',

      message:
        userMessage,

      recoverable:
        false,
    });
  }


  /* ==========================================================================
     Application state
     ========================================================================== */

  /**
   * アプリケーション状態を変更します。
   *
   * @param {string} nextState
   * @private
   */
  _setState(nextState) {
    const previousState =
      this.state;

    this.state =
      nextState;

    this._debug(
      'State changed:',
      previousState,
      '->',
      nextState
    );

    if (
      typeof EVENTS.APP_STATE_CHANGED ===
      'string'
    ) {
      this.eventBus.dispatchEvent(
        new CustomEvent(
          EVENTS.APP_STATE_CHANGED,
          {
            detail: {
              previousState,
              state: nextState,
              timestamp: Date.now(),
            },
          }
        )
      );
    }
  }


  /**
   * 現在のアプリケーション状態を返します。
   *
   * @returns {string}
   */
  getState() {
    return this.state;
  }


  /**
   * 選択されたルートIDを返します。
   *
   * @returns {string|null}
   */
  getSelectedRouteId() {
    return this.selectedRouteId;
  }


  /* ==========================================================================
     Cleanup
     ========================================================================== */

  /**
   * ページ離脱時にManagerを破棄します。
   *
   * @private
   */
  _handleBeforeUnload() {
    this.destroy();
  }


  /* ==========================================================================
     Debug
     ========================================================================== */

  /**
   * デバッグログを出力します。
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
      '[AirTaxiPlayerApp]',
      ...args
    );
  }
}


/* ==========================================================================
   Application bootstrap
   ========================================================================== */

/**
 * アプリケーションインスタンスです。
 *
 * デバッグ時にブラウザコンソールから状態を確認できるよう、
 * DEBUG_CONFIG.exposeAppToWindowがtrueの場合のみwindowへ公開します。
 */
const app =
  new AirTaxiPlayerApp();


/**
 * DOM構築完了後にアプリケーションを起動します。
 */
async function bootstrap() {
  try {
    await app.init();

    if (
      DEBUG_CONFIG.enabled &&
      DEBUG_CONFIG.exposeAppToWindow
    ) {
      window.airTaxiPlayerApp =
        app;
    }
  } catch (error) {
    /*
     * init()内でエラー画面表示まで実施するため、
     * ここではコンソール出力だけに留めます。
     */
    console.error(
      '[Dream On AirTaxi Player] Bootstrap failed.',
      error
    );
  }
}


if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    bootstrap,
    {
      once: true,
    }
  );
} else {
  bootstrap();
}


export {
  AirTaxiPlayerApp,
  app,
};

export default app;
