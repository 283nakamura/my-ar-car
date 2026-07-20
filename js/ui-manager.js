/**
 * Dream On AirTaxi Player
 * UI Manager
 *
 * @file js/ui-manager.js
 * @description
 * HTML UIの取得、表示・非表示、ユーザー操作の受付、
 * カスタムイベントの発行を担当します。
 *
 * UIManagerはゲーム進行、映像再生、タイムライン制御を行いません。
 */

import {
  APP_CONFIG,
  CHOICES,
  DEBUG_CONFIG,
  DOM_IDS,
  EVENTS,
  KEYBOARD_CONFIG,
  UI_CONFIG,
} from './config.js';


/**
 * UIManager
 *
 * @example
 * const eventBus = new EventTarget();
 * const uiManager = new UIManager({ eventBus });
 * uiManager.init();
 */
export class UIManager {
  /**
   * @param {Object} options
   * @param {EventTarget} options.eventBus
   */
  constructor({ eventBus } = {}) {
    if (!(eventBus instanceof EventTarget)) {
      throw new TypeError(
        '[UIManager] eventBus must be an instance of EventTarget.'
      );
    }

    this.eventBus = eventBus;

    this.elements = Object.create(null);
    this.listeners = [];

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isInteractionEnabled = true;
    this.isFullscreen = false;

    this.lastInteractionTime = 0;
    this.activeChoiceId = null;
    this.previousFocusedElement = null;

    this._handleStartClick = this._handleStartClick.bind(this);
    this._handlePauseClick = this._handlePauseClick.bind(this);
    this._handleResumeClick = this._handleResumeClick.bind(this);
    this._handleRestartClick = this._handleRestartClick.bind(this);
    this._handleReplayClick = this._handleReplayClick.bind(this);
    this._handleRetryClick = this._handleRetryClick.bind(this);
    this._handleFullscreenClick = this._handleFullscreenClick.bind(this);
    this._handleWaitRouteClick = this._handleWaitRouteClick.bind(this);
    this._handleAlternateRouteClick =
      this._handleAlternateRouteClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleFullscreenChange =
      this._handleFullscreenChange.bind(this);
  }


  /* ==========================================================================
     Public lifecycle
     ========================================================================== */

  /**
   * UIManagerを初期化します。
   *
   * @returns {UIManager}
   */
  init() {
    if (this.isDestroyed) {
      throw new Error(
        '[UIManager] Cannot initialize a destroyed instance.'
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
    this._registerEventListeners();
    this._applyInitialState();

    this.isInitialized = true;

    this._debug('Initialized.');

    return this;
  }


  /**
   * イベントリスナーと内部参照を破棄します。
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

    this.elements = Object.create(null);
    this.activeChoiceId = null;
    this.previousFocusedElement = null;

    this.isInitialized = false;
    this.isDestroyed = true;

    this._debug('Destroyed.');
  }


  /* ==========================================================================
     Loading screen
     ========================================================================== */

  /**
   * ローディング画面を表示します。
   *
   * @param {string} [message]
   */
  showLoading(message = UI_CONFIG.loadingMessage) {
    this._assertReady();

    this.setLoadingMessage(message);

    this.elements.loadingScreen.setAttribute('aria-busy', 'true');
    this._showElement(this.elements.loadingScreen);
  }


  /**
   * ローディング画面を非表示にします。
   */
  hideLoading() {
    this._assertReady();

    this.elements.loadingScreen.setAttribute('aria-busy', 'false');
    this._hideElement(this.elements.loadingScreen);
  }


  /**
   * ローディングメッセージを変更します。
   *
   * @param {string} message
   */
  setLoadingMessage(message) {
    this._assertReady();

    this.elements.loadingMessage.textContent =
      this._normalizeText(message, UI_CONFIG.loadingMessage);
  }


  /* ==========================================================================
     Start screen
     ========================================================================== */

  /**
   * スタート画面を表示します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.focus=true]
   */
  showStartScreen({ focus = true } = {}) {
    this._assertReady();

    this.hideCompletionScreen();
    this.hideError();
    this.hideChoice();
    this.hideControls();

    this._showElement(this.elements.startScreen);

    if (focus) {
      this._focusElement(this.elements.startButton);
    }
  }


  /**
   * スタート画面を非表示にします。
   */
  hideStartScreen() {
    this._assertReady();
    this._hideElement(this.elements.startScreen);
  }


  /* ==========================================================================
     Playback controls
     ========================================================================== */

  /**
   * 再生操作UIを表示します。
   */
  showControls() {
    this._assertReady();
    this._showElement(this.elements.controls);
  }


  /**
   * 再生操作UIを非表示にします。
   */
  hideControls() {
    this._assertReady();
    this._hideElement(this.elements.controls);
  }


  /**
   * 再生中のボタン状態にします。
   *
   * 一時停止ボタンを表示し、再開ボタンを非表示にします。
   */
  setPlayingState() {
    this._assertReady();

    this._showElement(this.elements.pauseButton);
    this._hideElement(this.elements.resumeButton);

    this.elements.pauseButton.disabled = !this.isInteractionEnabled;
    this.elements.resumeButton.disabled = true;
  }


  /**
   * 一時停止中のボタン状態にします。
   *
   * 一時停止ボタンを非表示にし、再開ボタンを表示します。
   */
  setPausedState() {
    this._assertReady();

    this._hideElement(this.elements.pauseButton);
    this._showElement(this.elements.resumeButton);

    this.elements.pauseButton.disabled = true;
    this.elements.resumeButton.disabled = !this.isInteractionEnabled;
  }


  /* ==========================================================================
     Route choice
     ========================================================================== */

  /**
   * 選択肢パネルを表示します。
   *
   * @param {string} choiceId
   * @param {Object} [options]
   * @param {boolean} [options.focus=true]
   */
  showChoice(choiceId, { focus = true } = {}) {
    this._assertReady();

    const choice = this._getChoiceConfig(choiceId);

    this.activeChoiceId = choice.id;
    this.previousFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this.elements.choiceTitle.textContent = choice.title;
    this.elements.choiceDescription.textContent = choice.description;

    this._applyChoiceOption(
      this.elements.waitRouteButton,
      choice.options[0]
    );

    this._applyChoiceOption(
      this.elements.alternateRouteButton,
      choice.options[1]
    );

    this._showElement(this.elements.choicePanel);

    if (focus) {
      this._focusElement(this.elements.waitRouteButton);
    }
  }


  /**
   * 選択肢パネルを非表示にします。
   *
   * @param {Object} [options]
   * @param {boolean} [options.restoreFocus=false]
   */
  hideChoice({ restoreFocus = false } = {}) {
    this._assertReady();

    this._hideElement(this.elements.choicePanel);
    this.activeChoiceId = null;

    if (
      restoreFocus &&
      this.previousFocusedElement &&
      document.contains(this.previousFocusedElement)
    ) {
      this._focusElement(this.previousFocusedElement);
    }

    this.previousFocusedElement = null;
  }


  /* ==========================================================================
     Completion screen
     ========================================================================== */

  /**
   * 完了画面を表示します。
   *
   * @param {string} [message]
   * @param {Object} [options]
   * @param {boolean} [options.focus=true]
   */
  showCompletionScreen(
    message = UI_CONFIG.completionMessage,
    { focus = true } = {}
  ) {
    this._assertReady();

    this.hideLoading();
    this.hideStartScreen();
    this.hideControls();
    this.hideChoice();

    this.elements.completionMessage.textContent =
      this._normalizeText(message, UI_CONFIG.completionMessage);

    this._showElement(this.elements.completionScreen);

    if (focus) {
      this._focusElement(this.elements.replayButton);
    }
  }


  /**
   * 完了画面を非表示にします。
   */
  hideCompletionScreen() {
    this._assertReady();
    this._hideElement(this.elements.completionScreen);
  }


  /* ==========================================================================
     Error screen
     ========================================================================== */

  /**
   * エラー画面を表示します。
   *
   * @param {string} [message]
   * @param {Object} [options]
   * @param {boolean} [options.focus=true]
   */
  showError(
    message = UI_CONFIG.genericErrorMessage,
    { focus = true } = {}
  ) {
    this._assertReady();

    this.hideLoading();
    this.hideStartScreen();
    this.hideControls();
    this.hideChoice();
    this.hideCompletionScreen();

    this.elements.errorMessage.textContent =
      this._normalizeText(message, UI_CONFIG.genericErrorMessage);

    this._showElement(this.elements.errorScreen);

    if (focus) {
      this._focusElement(this.elements.errorRetryButton);
    }
  }


  /**
   * エラー画面を非表示にします。
   */
  hideError() {
    this._assertReady();
    this._hideElement(this.elements.errorScreen);
  }


  /* ==========================================================================
     Scene fade
     ========================================================================== */

  /**
   * フェード用オーバーレイを表示します。
   *
   * @param {number} [durationMs]
   * @returns {Promise<void>}
   */
  async fadeOut(durationMs = APP_CONFIG.fadeDurationMs) {
    this._assertReady();

    const duration = this._normalizeDuration(
      durationMs,
      APP_CONFIG.fadeDurationMs
    );

    this.elements.screenFade.style.transitionDuration = `${duration}ms`;

    this._showElement(this.elements.screenFade);

    await this._wait(duration);
  }


  /**
   * フェード用オーバーレイを非表示にします。
   *
   * @param {number} [durationMs]
   * @returns {Promise<void>}
   */
  async fadeIn(durationMs = APP_CONFIG.fadeDurationMs) {
    this._assertReady();

    const duration = this._normalizeDuration(
      durationMs,
      APP_CONFIG.fadeDurationMs
    );

    this.elements.screenFade.style.transitionDuration = `${duration}ms`;

    this._hideElement(this.elements.screenFade);

    await this._wait(duration);
  }


  /**
   * フェードオーバーレイを即座に非表示にします。
   */
  resetFade() {
    this._assertReady();

    const element = this.elements.screenFade;
    const previousTransition = element.style.transitionDuration;

    element.style.transitionDuration = '0ms';
    this._hideElement(element);

    requestAnimationFrame(() => {
      element.style.transitionDuration = previousTransition;
    });
  }


  /* ==========================================================================
     Interaction control
     ========================================================================== */

  /**
   * UI操作を有効・無効にします。
   *
   * @param {boolean} enabled
   */
  setInteractionEnabled(enabled) {
    this._assertReady();

    this.isInteractionEnabled = Boolean(enabled);

    const interactiveElements = [
      this.elements.startButton,
      this.elements.pauseButton,
      this.elements.resumeButton,
      this.elements.restartButton,
      this.elements.fullscreenButton,
      this.elements.waitRouteButton,
      this.elements.alternateRouteButton,
      this.elements.replayButton,
      this.elements.errorRetryButton,
    ];

    for (const element of interactiveElements) {
      if (!element) {
        continue;
      }

      element.disabled = !this.isInteractionEnabled;
      element.classList.toggle(
        UI_CONFIG.disabledClass,
        !this.isInteractionEnabled
      );
    }

    if (this.isInteractionEnabled) {
      if (
        !this.elements.pauseButton.classList.contains(
          UI_CONFIG.hiddenClass
        )
      ) {
        this.elements.pauseButton.disabled = false;
      }

      if (
        !this.elements.resumeButton.classList.contains(
          UI_CONFIG.hiddenClass
        )
      ) {
        this.elements.resumeButton.disabled = false;
      }
    }
  }


  /**
   * 全画面表示ボタンの表示を切り替えます。
   *
   * @param {boolean} visible
   */
  setFullscreenButtonVisible(visible) {
    this._assertReady();

    if (visible && APP_CONFIG.enableFullscreen) {
      this._showElement(this.elements.fullscreenButton);
    } else {
      this._hideElement(this.elements.fullscreenButton);
    }
  }


  /**
   * 全画面状態を返します。
   *
   * @returns {boolean}
   */
  getFullscreenState() {
    return this.isFullscreen;
  }


  /**
   * UIを初期状態へ戻します。
   */
  reset() {
    this._assertReady();

    this.activeChoiceId = null;
    this.previousFocusedElement = null;
    this.lastInteractionTime = 0;

    this.hideLoading();
    this.hideStartScreen();
    this.hideControls();
    this.hideChoice();
    this.hideCompletionScreen();
    this.hideError();
    this.resetFade();

    this.setPlayingState();
    this.setInteractionEnabled(true);
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
    const ids = {
      app: DOM_IDS.app,

      loadingScreen: DOM_IDS.loadingScreen,
      loadingMessage: DOM_IDS.loadingMessage,

      startScreen: DOM_IDS.startScreen,
      startButton: DOM_IDS.startButton,

      controls: DOM_IDS.controls,
      pauseButton: DOM_IDS.pauseButton,
      resumeButton: DOM_IDS.resumeButton,
      restartButton: DOM_IDS.restartButton,
      fullscreenButton: DOM_IDS.fullscreenButton,

      choicePanel: DOM_IDS.choicePanel,
      choiceTitle: DOM_IDS.choiceTitle,
      choiceDescription: DOM_IDS.choiceDescription,
      waitRouteButton: DOM_IDS.waitRouteButton,
      alternateRouteButton: DOM_IDS.alternateRouteButton,

      completionScreen: DOM_IDS.completionScreen,
      completionMessage: DOM_IDS.completionMessage,
      replayButton: DOM_IDS.replayButton,

      errorScreen: DOM_IDS.errorScreen,
      errorMessage: DOM_IDS.errorMessage,
      errorRetryButton: DOM_IDS.errorRetryButton,

      screenFade: DOM_IDS.screenFade,
    };

    for (const [key, id] of Object.entries(ids)) {
      this.elements[key] =
        typeof id === 'string' ? document.getElementById(id) : null;
    }
  }


  /**
   * 必須DOM要素が存在するか検証します。
   *
   * @private
   */
  _validateRequiredElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(
        `[UIManager] Missing required DOM elements: ${missingElements.join(', ')}`
      );
    }
  }


  /**
   * 初期表示を設定します。
   *
   * @private
   */
  _applyInitialState() {
    this._showElement(this.elements.loadingScreen);

    this._hideElement(this.elements.startScreen);
    this._hideElement(this.elements.controls);
    this._hideElement(this.elements.choicePanel);
    this._hideElement(this.elements.completionScreen);
    this._hideElement(this.elements.errorScreen);
    this._hideElement(this.elements.screenFade);

    this._showElement(this.elements.pauseButton);
    this._hideElement(this.elements.resumeButton);

    this.elements.loadingScreen.setAttribute('aria-busy', 'true');

    this.setFullscreenButtonVisible(
      APP_CONFIG.enableFullscreen &&
      this._isFullscreenSupported()
    );
  }


  /* ==========================================================================
     Event listener registration
     ========================================================================== */

  /**
   * DOMイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    this._addListener(
      this.elements.startButton,
      'click',
      this._handleStartClick
    );

    this._addListener(
      this.elements.pauseButton,
      'click',
      this._handlePauseClick
    );

    this._addListener(
      this.elements.resumeButton,
      'click',
      this._handleResumeClick
    );

    this._addListener(
      this.elements.restartButton,
      'click',
      this._handleRestartClick
    );

    this._addListener(
      this.elements.replayButton,
      'click',
      this._handleReplayClick
    );

    this._addListener(
      this.elements.errorRetryButton,
      'click',
      this._handleRetryClick
    );

    this._addListener(
      this.elements.fullscreenButton,
      'click',
      this._handleFullscreenClick
    );

    this._addListener(
      this.elements.waitRouteButton,
      'click',
      this._handleWaitRouteClick
    );

    this._addListener(
      this.elements.alternateRouteButton,
      'click',
      this._handleAlternateRouteClick
    );

    if (KEYBOARD_CONFIG.enabled) {
      this._addListener(document, 'keydown', this._handleKeyDown);
    }

    this._addListener(
      document,
      'fullscreenchange',
      this._handleFullscreenChange
    );

    this._addListener(
      document,
      'webkitfullscreenchange',
      this._handleFullscreenChange
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
  _addListener(target, type, handler, options = false) {
    target.addEventListener(type, handler, options);

    this.listeners.push({
      target,
      type,
      handler,
      options,
    });
  }


  /* ==========================================================================
     Click handlers
     ========================================================================== */

  /**
   * @private
   */
  _handleStartClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_START, {
      source: 'start-button',
    });
  }


  /**
   * @private
   */
  _handlePauseClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_PAUSE, {
      source: 'pause-button',
    });
  }


  /**
   * @private
   */
  _handleResumeClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_RESUME, {
      source: 'resume-button',
    });
  }


  /**
   * @private
   */
  _handleRestartClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_RESTART, {
      source: 'restart-button',
    });
  }


  /**
   * @private
   */
  _handleReplayClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_REPLAY, {
      source: 'replay-button',
    });
  }


  /**
   * @private
   */
  _handleRetryClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_RETRY, {
      source: 'error-retry-button',
    });
  }


  /**
   * @private
   */
  _handleFullscreenClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emit(EVENTS.UI_FULLSCREEN, {
      source: 'fullscreen-button',
      isFullscreen: this.isFullscreen,
    });
  }


  /**
   * @private
   */
  _handleWaitRouteClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emitChoiceFromElement(this.elements.waitRouteButton);
  }


  /**
   * @private
   */
  _handleAlternateRouteClick() {
    if (!this._canAcceptInteraction()) {
      return;
    }

    this._emitChoiceFromElement(
      this.elements.alternateRouteButton
    );
  }


  /**
   * 選択肢ボタンのdatasetからイベントを発行します。
   *
   * @param {HTMLElement} element
   * @private
   */
  _emitChoiceFromElement(element) {
    const choiceId =
      element.dataset.choiceId || this.activeChoiceId;

    const optionId = element.dataset.optionId;

    if (!choiceId || !optionId) {
      this._emit(EVENTS.APP_ERROR, {
        source: 'ui-manager',
        message: 'Choice button configuration is invalid.',
      });

      return;
    }

    this._emit(EVENTS.UI_CHOICE, {
      source: element.id,
      choiceId,
      optionId,
    });
  }


  /* ==========================================================================
     Keyboard handling
     ========================================================================== */

  /**
   * キーボード操作を処理します。
   *
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyDown(event) {
    if (!this.isInteractionEnabled) {
      return;
    }

    if (this._isTextInputElement(event.target)) {
      return;
    }

    const code = event.code;
    const key = event.key;

    if (
      this._matchesKey(KEYBOARD_CONFIG.keys.start, code, key) &&
      !this._isHidden(this.elements.startScreen)
    ) {
      event.preventDefault();
      this._handleStartClick();
      return;
    }

    if (
      this._matchesKey(KEYBOARD_CONFIG.keys.pause, code, key) &&
      !this._isHidden(this.elements.controls)
    ) {
      event.preventDefault();

      if (!this._isHidden(this.elements.resumeButton)) {
        this._handleResumeClick();
      } else {
        this._handlePauseClick();
      }

      return;
    }

    if (
      this._matchesKey(KEYBOARD_CONFIG.keys.restart, code, key)
    ) {
      event.preventDefault();
      this._handleRestartClick();
      return;
    }

    if (
      this._matchesKey(KEYBOARD_CONFIG.keys.fullscreen, code, key)
    ) {
      event.preventDefault();
      this._handleFullscreenClick();
      return;
    }

    if (!this._isHidden(this.elements.choicePanel)) {
      if (
        this._matchesKey(
          KEYBOARD_CONFIG.keys.waitRoute,
          code,
          key
        )
      ) {
        event.preventDefault();
        this._handleWaitRouteClick();
        return;
      }

      if (
        this._matchesKey(
          KEYBOARD_CONFIG.keys.alternateRoute,
          code,
          key
        )
      ) {
        event.preventDefault();
        this._handleAlternateRouteClick();
      }
    }
  }


  /**
   * 指定キーが設定値と一致するか確認します。
   *
   * @param {ReadonlyArray<string>} configuredKeys
   * @param {string} code
   * @param {string} key
   * @returns {boolean}
   * @private
   */
  _matchesKey(configuredKeys, code, key) {
    return configuredKeys.some(
      configuredKey =>
        configuredKey === code ||
        configuredKey === key ||
        (
          configuredKey === 'Space' &&
          key === ' '
        )
    );
  }


  /**
   * 入力欄へのキー入力か確認します。
   *
   * @param {EventTarget|null} target
   * @returns {boolean}
   * @private
   */
  _isTextInputElement(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return (
      target.isContentEditable ||
      target.matches(
        'input, textarea, select, [role="textbox"]'
      )
    );
  }


  /* ==========================================================================
     Fullscreen state
     ========================================================================== */

  /**
   * 全画面状態の変更を反映します。
   *
   * @private
   */
  _handleFullscreenChange() {
    this.isFullscreen = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement
    );

    this.elements.fullscreenButton.setAttribute(
      'aria-label',
      this.isFullscreen ? '全画面表示を終了' : '全画面表示'
    );

    this.elements.fullscreenButton.setAttribute(
      'title',
      this.isFullscreen ? '全画面表示を終了' : '全画面表示'
    );

    this.elements.fullscreenButton.classList.toggle(
      UI_CONFIG.activeClass,
      this.isFullscreen
    );
  }


  /**
   * 全画面APIが使用できるか確認します。
   *
   * @returns {boolean}
   * @private
   */
  _isFullscreenSupported() {
    return Boolean(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      this.elements.app.requestFullscreen ||
      this.elements.app.webkitRequestFullscreen
    );
  }


  /* ==========================================================================
     Choice helpers
     ========================================================================== */

  /**
   * 選択肢設定を取得します。
   *
   * @param {string} choiceId
   * @returns {Readonly<Object>}
   * @private
   */
  _getChoiceConfig(choiceId) {
    const choice = Object.values(CHOICES).find(
      item => item.id === choiceId
    );

    if (!choice) {
      throw new Error(
        `[UIManager] Unknown choice ID: ${String(choiceId)}`
      );
    }

    if (!Array.isArray(choice.options) || choice.options.length < 2) {
      throw new Error(
        `[UIManager] Choice "${choiceId}" must contain at least two options.`
      );
    }

    return choice;
  }


  /**
   * 選択肢設定をボタンへ反映します。
   *
   * @param {HTMLButtonElement} button
   * @param {Object} option
   * @private
   */
  _applyChoiceOption(button, option) {
    if (!button || !option) {
      return;
    }

    button.dataset.choiceId = this.activeChoiceId;
    button.dataset.optionId = option.id;

    const labelElement = button.querySelector('.button__label');

    if (labelElement) {
      labelElement.textContent = option.label;
    } else {
      button.textContent = option.label;
    }

    button.setAttribute(
      'aria-label',
      option.label
    );
  }


  /* ==========================================================================
     Visibility helpers
     ========================================================================== */

  /**
   * 要素を表示します。
   *
   * @param {HTMLElement} element
   * @private
   */
  _showElement(element) {
    if (!element) {
      return;
    }

    element.classList.remove(UI_CONFIG.hiddenClass);
    element.classList.add(UI_CONFIG.visibleClass);

    element.removeAttribute('hidden');
    element.setAttribute('aria-hidden', 'false');
  }


  /**
   * 要素を非表示にします。
   *
   * @param {HTMLElement} element
   * @private
   */
  _hideElement(element) {
    if (!element) {
      return;
    }

    element.classList.remove(UI_CONFIG.visibleClass);
    element.classList.add(UI_CONFIG.hiddenClass);

    element.setAttribute('aria-hidden', 'true');
  }


  /**
   * 要素が非表示か確認します。
   *
   * @param {HTMLElement} element
   * @returns {boolean}
   * @private
   */
  _isHidden(element) {
    return (
      !element ||
      element.classList.contains(UI_CONFIG.hiddenClass) ||
      element.getAttribute('aria-hidden') === 'true'
    );
  }


  /* ==========================================================================
     Interaction helpers
     ========================================================================== */

  /**
   * 現在の操作を受け付けられるか確認します。
   *
   * 多重クリック防止もここで行います。
   *
   * @returns {boolean}
   * @private
   */
  _canAcceptInteraction() {
    if (
      !this.isInitialized ||
      this.isDestroyed ||
      !this.isInteractionEnabled
    ) {
      return false;
    }

    const now = performance.now();
    const elapsed = now - this.lastInteractionTime;

    if (elapsed < UI_CONFIG.preventMultipleClicksMs) {
      return false;
    }

    this.lastInteractionTime = now;

    return true;
  }


  /**
   * 要素へ安全にフォーカスします。
   *
   * @param {HTMLElement} element
   * @private
   */
  _focusElement(element) {
    if (
      !element ||
      typeof element.focus !== 'function' ||
      element.disabled
    ) {
      return;
    }

    requestAnimationFrame(() => {
      try {
        element.focus({
          preventScroll: true,
        });
      } catch {
        element.focus();
      }
    });
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
    if (!eventName) {
      throw new Error(
        '[UIManager] Event name is required.'
      );
    }

    this._debug('Dispatch event:', eventName, detail);

    this.eventBus.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          ...detail,
          timestamp: Date.now(),
        },
      })
    );
  }


  /* ==========================================================================
     General helpers
     ========================================================================== */

  /**
   * UIManagerが使用可能な状態か検証します。
   *
   * @private
   */
  _assertReady() {
    if (this.isDestroyed) {
      throw new Error(
        '[UIManager] This instance has been destroyed.'
      );
    }

    if (!this.isInitialized) {
      throw new Error(
        '[UIManager] init() must be called before using this method.'
      );
    }
  }


  /**
   * 表示用文字列を正規化します。
   *
   * @param {*} value
   * @param {string} fallback
   * @returns {string}
   * @private
   */
  _normalizeText(value, fallback) {
    if (typeof value !== 'string') {
      return fallback;
    }

    const normalized = value.trim();

    return normalized || fallback;
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


  /**
   * 指定時間待機します。
   *
   * @param {number} durationMs
   * @returns {Promise<void>}
   * @private
   */
  _wait(durationMs) {
    return new Promise(resolve => {
      window.setTimeout(resolve, durationMs);
    });
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

    console.debug('[UIManager]', ...args);
  }
}


export default UIManager;
