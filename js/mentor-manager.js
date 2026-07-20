/**
 * Dream On AirTaxi Player
 * Mentor Manager
 *
 * @file js/mentor-manager.js
 * @description
 * ソラ教官の表示、非表示、メッセージ切り替え、
 * 自動非表示タイマーの管理を担当します。
 *
 * MentorManagerはシーン遷移、映像再生、UI全体の制御を行いません。
 */

import {
  APP_CONFIG,
  DEBUG_CONFIG,
  DOM_IDS,
  EVENTS,
  MENTOR_CONFIG,
  getMentorMessage,
} from './config.js';


/**
 * MentorManager
 *
 * @example
 * const eventBus = new EventTarget();
 *
 * const mentorManager = new MentorManager({
 *   eventBus,
 * });
 *
 * mentorManager.init();
 * mentorManager.show('welcome');
 */
export class MentorManager {
  /**
   * @param {Object} options
   * @param {EventTarget} options.eventBus
   */
  constructor({ eventBus } = {}) {
    if (!(eventBus instanceof EventTarget)) {
      throw new TypeError(
        '[MentorManager] eventBus must be an instance of EventTarget.'
      );
    }

    this.eventBus = eventBus;

    this.elements = Object.create(null);
    this.listeners = [];

    this.currentMessageId = null;
    this.currentMessage = null;

    this.hideTimerId = null;
    this.completionTimerId = null;

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isVisible = false;
    this.isPaused = false;

    this.remainingDurationMs = null;
    this.timerStartedAt = null;

    this._handleMentorShowEvent =
      this._handleMentorShowEvent.bind(this);

    this._handleMentorHideEvent =
      this._handleMentorHideEvent.bind(this);
  }


  /* ==========================================================================
     Lifecycle
     ========================================================================== */

  /**
   * MentorManagerを初期化します。
   *
   * @returns {MentorManager}
   */
  init() {
    if (this.isDestroyed) {
      throw new Error(
        '[MentorManager] Cannot initialize a destroyed instance.'
      );
    }

    if (this.isInitialized) {
      if (APP_CONFIG.preventMultipleInitialization) {
        this._debug('Initialization skipped: already initialized.');
        return this;
      }

      this.destroy();
      this.isDestroyed = false;
    }

    this._cacheElements();
    this._validateRequiredElements();
    this._applyInitialState();
    this._registerEventListeners();

    this.isInitialized = true;

    this._debug('Initialized.');

    return this;
  }


  /**
   * イベントリスナーとタイマーを破棄します。
   */
  destroy() {
    this._clearTimers();

    for (const listener of this.listeners) {
      listener.target.removeEventListener(
        listener.type,
        listener.handler,
        listener.options
      );
    }

    this.listeners = [];

    this.elements = Object.create(null);

    this.currentMessageId = null;
    this.currentMessage = null;

    this.isVisible = false;
    this.isPaused = false;
    this.isInitialized = false;
    this.isDestroyed = true;

    this.remainingDurationMs = null;
    this.timerStartedAt = null;

    this._debug('Destroyed.');
  }


  /* ==========================================================================
     Public display control
     ========================================================================== */

  /**
   * 指定したメッセージを表示します。
   *
   * @param {string} messageId
   * @param {Object} [options]
   * @param {number|null} [options.durationMs]
   * @param {boolean} [options.restart=true]
   * @returns {Readonly<Object>}
   */
  show(
    messageId,
    {
      durationMs,
      restart = true,
    } = {}
  ) {
    this._assertReady();

    const message = getMentorMessage(messageId);

    if (
      !restart &&
      this.isVisible &&
      this.currentMessageId === message.id
    ) {
      this._debug(
        'Show skipped: message is already visible.',
        message.id
      );

      return message;
    }

    this._clearTimers();

    this.currentMessageId = message.id;
    this.currentMessage = message;
    this.isPaused = false;

    this._renderMessage(message);
    this._setVisible(true);

    const resolvedDuration = this._resolveDuration(
      durationMs,
      message.durationMs
    );

    this._emit(EVENTS.MENTOR_SHOWN, {
      messageId: message.id,
      speaker: message.speaker,
      text: message.text,
      durationMs: resolvedDuration,
    });

    if (resolvedDuration !== null) {
      this._startHideTimer(resolvedDuration);
    } else {
      this.remainingDurationMs = null;
      this.timerStartedAt = null;
    }

    this._debug(
      'Message shown:',
      message.id,
      resolvedDuration
    );

    return message;
  }


  /**
   * 現在のメッセージを非表示にします。
   *
   * @param {Object} [options]
   * @param {string} [options.reason='manual']
   * @param {boolean} [options.emitCompleted=false]
   */
  hide({
    reason = 'manual',
    emitCompleted = false,
  } = {}) {
    this._assertReady();

    if (!this.isVisible && !this.currentMessageId) {
      return;
    }

    const hiddenMessageId = this.currentMessageId;
    const hiddenMessage = this.currentMessage;

    this._clearTimers();
    this._setVisible(false);

    this.currentMessageId = null;
    this.currentMessage = null;
    this.remainingDurationMs = null;
    this.timerStartedAt = null;
    this.isPaused = false;

    this._emit(EVENTS.MENTOR_HIDDEN, {
      messageId: hiddenMessageId,
      reason,
    });

    if (emitCompleted && hiddenMessageId) {
      this._emit(EVENTS.MENTOR_COMPLETED, {
        messageId: hiddenMessageId,
        speaker: hiddenMessage?.speaker ?? null,
        text: hiddenMessage?.text ?? null,
        reason,
      });
    }

    this._debug(
      'Message hidden:',
      hiddenMessageId,
      reason
    );
  }


  /**
   * 表示中のメッセージを即座に置き換えます。
   *
   * @param {string} messageId
   * @param {Object} [options]
   * @returns {Readonly<Object>}
   */
  replace(messageId, options = {}) {
    this._assertReady();

    return this.show(messageId, {
      ...options,
      restart: true,
    });
  }


  /**
   * 現在の表示を一時停止します。
   *
   * 自動非表示までの残り時間を保持します。
   */
  pause() {
    this._assertReady();

    if (
      !this.isVisible ||
      this.isPaused ||
      this.hideTimerId === null
    ) {
      return;
    }

    const elapsed = this.timerStartedAt !== null
      ? performance.now() - this.timerStartedAt
      : 0;

    this.remainingDurationMs = Math.max(
      0,
      (this.remainingDurationMs ?? 0) - elapsed
    );

    window.clearTimeout(this.hideTimerId);

    this.hideTimerId = null;
    this.timerStartedAt = null;
    this.isPaused = true;

    this._debug(
      'Paused:',
      this.currentMessageId,
      this.remainingDurationMs
    );
  }


  /**
   * 一時停止中の自動非表示タイマーを再開します。
   */
  resume() {
    this._assertReady();

    if (
      !this.isVisible ||
      !this.isPaused ||
      this.remainingDurationMs === null
    ) {
      return;
    }

    this.isPaused = false;

    if (this.remainingDurationMs <= 0) {
      this._handleAutoHide();
      return;
    }

    this._startHideTimer(this.remainingDurationMs);

    this._debug(
      'Resumed:',
      this.currentMessageId,
      this.remainingDurationMs
    );
  }


  /**
   * メッセージ表示を初期状態へ戻します。
   */
  reset() {
    this._assertReady();

    this._clearTimers();

    this.currentMessageId = null;
    this.currentMessage = null;

    this.isVisible = false;
    this.isPaused = false;

    this.remainingDurationMs = null;
    this.timerStartedAt = null;

    this.elements.mentorName.textContent =
      MENTOR_CONFIG.name;

    this.elements.mentorMessage.textContent = '';

    this.elements.mentorImage.src =
      MENTOR_CONFIG.imagePath;

    this._setVisible(false);

    this._debug('Reset.');
  }


  /* ==========================================================================
     State getters
     ========================================================================== */

  /**
   * 現在表示中のメッセージIDを返します。
   *
   * @returns {string|null}
   */
  getCurrentMessageId() {
    return this.currentMessageId;
  }


  /**
   * 現在表示中のメッセージ設定を返します。
   *
   * @returns {Readonly<Object>|null}
   */
  getCurrentMessage() {
    return this.currentMessage;
  }


  /**
   * ソラ教官が表示中か返します。
   *
   * @returns {boolean}
   */
  getVisibleState() {
    return this.isVisible;
  }


  /**
   * 自動非表示タイマーが一時停止中か返します。
   *
   * @returns {boolean}
   */
  getPausedState() {
    return this.isPaused;
  }


  /**
   * 自動非表示までの残り時間を返します。
   *
   * @returns {number|null}
   */
  getRemainingDurationMs() {
    if (
      this.hideTimerId !== null &&
      this.timerStartedAt !== null &&
      this.remainingDurationMs !== null
    ) {
      const elapsed =
        performance.now() - this.timerStartedAt;

      return Math.max(
        0,
        this.remainingDurationMs - elapsed
      );
    }

    return this.remainingDurationMs;
  }


  /* ==========================================================================
     DOM initialization
     ========================================================================== */

  /**
   * 必要なDOM要素を取得します。
   *
   * @private
   */
  _cacheElements() {
    this.elements.mentorContainer =
      document.getElementById(DOM_IDS.mentorContainer);

    this.elements.mentorImage =
      document.getElementById(DOM_IDS.mentorImage);

    this.elements.mentorName =
      document.getElementById(DOM_IDS.mentorName);

    this.elements.mentorMessage =
      document.getElementById(DOM_IDS.mentorMessage);
  }


  /**
   * 必須DOM要素を検証します。
   *
   * @private
   */
  _validateRequiredElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(
        `[MentorManager] Missing required DOM elements: ${missingElements.join(', ')}`
      );
    }
  }


  /**
   * 初期表示を設定します。
   *
   * @private
   */
  _applyInitialState() {
    this.elements.mentorName.textContent =
      MENTOR_CONFIG.name;

    this.elements.mentorMessage.textContent = '';

    this.elements.mentorImage.src =
      MENTOR_CONFIG.imagePath;

    this.elements.mentorImage.alt =
      `${MENTOR_CONFIG.name}のイメージ`;

    if (MENTOR_CONFIG.useAriaLive) {
      this.elements.mentorContainer.setAttribute(
        'aria-live',
        'polite'
      );

      this.elements.mentorContainer.setAttribute(
        'aria-atomic',
        'true'
      );
    } else {
      this.elements.mentorContainer.removeAttribute(
        'aria-live'
      );

      this.elements.mentorContainer.removeAttribute(
        'aria-atomic'
      );
    }

    this._setVisible(false);
  }


  /* ==========================================================================
     Event bus listeners
     ========================================================================== */

  /**
   * eventBusのイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    this._addListener(
      this.eventBus,
      EVENTS.MENTOR_SHOW,
      this._handleMentorShowEvent
    );

    this._addListener(
      this.eventBus,
      EVENTS.MENTOR_HIDE,
      this._handleMentorHideEvent
    );
  }


  /**
   * イベントリスナーを登録し、destroy時に解除できるよう保持します。
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


  /**
   * mentor:showイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleMentorShowEvent(event) {
    const detail = event?.detail ?? {};
    const messageId = detail.messageId;

    if (typeof messageId !== 'string') {
      this._emitError(
        'MENTOR_SHOW event requires messageId.',
        {
          detail,
        }
      );

      return;
    }

    try {
      this.show(messageId, {
        durationMs: detail.durationMs,
        restart: detail.restart ?? true,
      });
    } catch (error) {
      this._emitError(
        'Failed to show mentor message.',
        {
          messageId,
          error,
        }
      );
    }
  }


  /**
   * mentor:hideイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleMentorHideEvent(event) {
    const detail = event?.detail ?? {};

    try {
      this.hide({
        reason: detail.reason ?? 'event',
        emitCompleted:
          detail.emitCompleted ?? false,
      });
    } catch (error) {
      this._emitError(
        'Failed to hide mentor message.',
        {
          error,
        }
      );
    }
  }


  /* ==========================================================================
     Rendering
     ========================================================================== */

  /**
   * メッセージ設定をDOMへ反映します。
   *
   * @param {Readonly<Object>} message
   * @private
   */
  _renderMessage(message) {
    this.elements.mentorName.textContent =
      message.speaker || MENTOR_CONFIG.name;

    this.elements.mentorMessage.textContent =
      message.text;

    if (
      this.elements.mentorImage.src !==
      new URL(
        MENTOR_CONFIG.imagePath,
        window.location.href
      ).href
    ) {
      this.elements.mentorImage.src =
        MENTOR_CONFIG.imagePath;
    }
  }


  /**
   * 表示状態を設定します。
   *
   * @param {boolean} visible
   * @private
   */
  _setVisible(visible) {
    const element =
      this.elements.mentorContainer;

    this.isVisible = Boolean(visible);

    if (this.isVisible) {
      element.classList.remove('is-hidden');
      element.classList.add('is-visible');

      element.removeAttribute('hidden');
      element.setAttribute('aria-hidden', 'false');
    } else {
      element.classList.remove('is-visible');
      element.classList.add('is-hidden');

      element.setAttribute('aria-hidden', 'true');
    }
  }


  /* ==========================================================================
     Timer control
     ========================================================================== */

  /**
   * 自動非表示タイマーを開始します。
   *
   * @param {number} durationMs
   * @private
   */
  _startHideTimer(durationMs) {
    this._clearHideTimer();

    this.remainingDurationMs = durationMs;
    this.timerStartedAt = performance.now();
    this.isPaused = false;

    this.hideTimerId = window.setTimeout(
      () => {
        this.hideTimerId = null;
        this.timerStartedAt = null;
        this.remainingDurationMs = 0;

        this._handleAutoHide();
      },
      durationMs
    );
  }


  /**
   * 自動非表示を処理します。
   *
   * @private
   */
  _handleAutoHide() {
    const completedMessageId =
      this.currentMessageId;

    const completedMessage =
      this.currentMessage;

    if (!completedMessageId) {
      return;
    }

    this.hide({
      reason: 'duration-completed',
      emitCompleted: false,
    });

    /*
     * CSSの非表示遷移後に完了イベントを発行します。
     */
    this.completionTimerId = window.setTimeout(
      () => {
        this.completionTimerId = null;

        this._emit(EVENTS.MENTOR_COMPLETED, {
          messageId: completedMessageId,
          speaker:
            completedMessage?.speaker ?? null,
          text:
            completedMessage?.text ?? null,
          reason: 'duration-completed',
        });
      },
      MENTOR_CONFIG.fadeDurationMs
    );
  }


  /**
   * 自動非表示タイマーを解除します。
   *
   * @private
   */
  _clearHideTimer() {
    if (this.hideTimerId !== null) {
      window.clearTimeout(this.hideTimerId);
      this.hideTimerId = null;
    }

    this.timerStartedAt = null;
  }


  /**
   * 完了通知タイマーを解除します。
   *
   * @private
   */
  _clearCompletionTimer() {
    if (this.completionTimerId !== null) {
      window.clearTimeout(
        this.completionTimerId
      );

      this.completionTimerId = null;
    }
  }


  /**
   * すべてのタイマーを解除します。
   *
   * @private
   */
  _clearTimers() {
    this._clearHideTimer();
    this._clearCompletionTimer();
  }


  /* ==========================================================================
     Duration helpers
     ========================================================================== */

  /**
   * 表示時間を決定します。
   *
   * 優先順位:
   * 1. show()のdurationMs
   * 2. メッセージ設定のdurationMs
   * 3. MENTOR_CONFIG.defaultDurationMs
   *
   * 明示的にnullの場合は自動非表示しません。
   *
   * @param {number|null|undefined} requestedDuration
   * @param {number|null|undefined} messageDuration
   * @returns {number|null}
   * @private
   */
  _resolveDuration(
    requestedDuration,
    messageDuration
  ) {
    if (requestedDuration === null) {
      return null;
    }

    if (requestedDuration !== undefined) {
      return this._normalizeDuration(
        requestedDuration,
        MENTOR_CONFIG.defaultDurationMs
      );
    }

    if (messageDuration === null) {
      return null;
    }

    if (messageDuration !== undefined) {
      return this._normalizeDuration(
        messageDuration,
        MENTOR_CONFIG.defaultDurationMs
      );
    }

    return MENTOR_CONFIG.defaultDurationMs;
  }


  /**
   * 時間値を正規化します。
   *
   * @param {*} value
   * @param {number} fallback
   * @returns {number}
   * @private
   */
  _normalizeDuration(value, fallback) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      return fallback;
    }

    return value;
  }


  /* ==========================================================================
     Event dispatch
     ========================================================================== */

  /**
   * カスタムイベントを発行します。
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
   * エラーイベントを発行します。
   *
   * @param {string} message
   * @param {Object} [context]
   * @private
   */
  _emitError(message, context = {}) {
    const originalError =
      context.error instanceof Error
        ? context.error
        : null;

    const error =
      originalError ??
      new Error(message);

    console.error(
      '[MentorManager]',
      message,
      context
    );

    this._emit(EVENTS.MENTOR_ERROR, {
      source: 'mentor-manager',
      message,
      error,
      context,
    });
  }


  /* ==========================================================================
     General helpers
     ========================================================================== */

  /**
   * MentorManagerが使用可能な状態か検証します。
   *
   * @private
   */
  _assertReady() {
    if (this.isDestroyed) {
      throw new Error(
        '[MentorManager] This instance has been destroyed.'
      );
    }

    if (!this.isInitialized) {
      throw new Error(
        '[MentorManager] init() must be called before using this method.'
      );
    }
  }


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
      '[MentorManager]',
      ...args
    );
  }
}


export default MentorManager;
