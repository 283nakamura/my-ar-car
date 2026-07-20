/**
 * Dream On AirTaxi Player
 * Scene Manager
 *
 * @file js/scene-manager.js
 * @description
 * シーンごとの動画読み込み、再生、一時停止、停止、
 * シーン切り替え、再生時刻通知、動画終了検知を担当します。
 *
 * SceneManagerはタイムライン、UI、ソラ教官、
 * ローターを直接制御しません。
 *
 * 状態変化は共通EventBusを通じてmain.jsへ通知します。
 */

import {
  APP_CONFIG,
  DEBUG_CONFIG,
  DOM_IDS,
  EVENTS,
  SCENE_IDS,
  VIDEO_CONFIG,
  getSceneConfig,
  isValidSceneId,
} from './config.js';


/**
 * SceneManager
 *
 * @example
 * const eventBus = new EventTarget();
 *
 * const sceneManager = new SceneManager({
 *   eventBus,
 * });
 *
 * sceneManager.init();
 * await sceneManager.load('intro');
 * await sceneManager.play();
 */
export class SceneManager {
  /**
   * @param {Object} options
   * @param {EventTarget} options.eventBus
   */
  constructor({ eventBus } = {}) {
    if (!(eventBus instanceof EventTarget)) {
      throw new TypeError(
        '[SceneManager] eventBus must be an instance of EventTarget.'
      );
    }

    this.eventBus = eventBus;

    this.elements = Object.create(null);
    this.videoElements = new Map();
    this.listeners = [];

    this.currentSceneId = null;
    this.currentSceneConfig = null;
    this.currentVideo = null;

    this.pendingSceneId = null;
    this.loadRequestId = 0;

    this.timeUpdateTimerId = null;
    this.loadTimeoutId = null;

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isLoading = false;
    this.isLoaded = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.isTransitioning = false;

    this._handleVideoPlaying =
      this._handleVideoPlaying.bind(this);

    this._handleVideoPause =
      this._handleVideoPause.bind(this);

    this._handleVideoEnded =
      this._handleVideoEnded.bind(this);

    this._handleVideoError =
      this._handleVideoError.bind(this);

    this._handleVideoWaiting =
      this._handleVideoWaiting.bind(this);

    this._handleVisibilityChange =
      this._handleVisibilityChange.bind(this);

    this._handleTimeUpdateTick =
      this._handleTimeUpdateTick.bind(this);
  }


  /* ==========================================================================
     Lifecycle
     ========================================================================== */

  /**
   * SceneManagerを初期化します。
   *
   * @returns {SceneManager}
   */
  init() {
    if (this.isDestroyed) {
      throw new Error(
        '[SceneManager] Cannot initialize a destroyed instance.'
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

    this._cacheElements();
    this._validateRequiredElements();
    this._configureVideos();
    this._registerEventListeners();

    this.isInitialized = true;

    this._emit(EVENTS.SCENE_READY, {
      initialSceneId: APP_CONFIG.initialSceneId,
      videoCount: this.videoElements.size,
    });

    this._debug('Initialized.');

    return this;
  }


  /**
   * 再生、タイマー、イベントリスナーを破棄します。
   */
  destroy() {
    this._stopTimeUpdateTimer();
    this._clearLoadTimeout();

    /*
     * 実行中のload()を無効化します。
     */
    this.loadRequestId += 1;

    if (this.currentVideo) {
      try {
        this.currentVideo.pause();
      } catch (error) {
        this._debug(
          'Failed to pause video during destroy:',
          error
        );
      }
    }

    for (const listener of this.listeners) {
      listener.target.removeEventListener(
        listener.type,
        listener.handler,
        listener.options
      );
    }

    this.listeners = [];

    this.videoElements.clear();
    this.elements = Object.create(null);

    this.currentSceneId = null;
    this.currentSceneConfig = null;
    this.currentVideo = null;
    this.pendingSceneId = null;

    this.isInitialized = false;
    this.isDestroyed = true;
    this.isLoading = false;
    this.isLoaded = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.isTransitioning = false;

    this._debug('Destroyed.');
  }


  /* ==========================================================================
     Scene loading
     ========================================================================== */

  /**
   * 指定したシーンを読み込みます。
   *
   * @param {string} sceneId
   * @param {Object} [options]
   * @param {boolean} [options.forceReload=false]
   * @param {boolean} [options.resetVideo]
   * @returns {Promise<Readonly<Object>>}
   */
  async load(
    sceneId,
    {
      forceReload = false,
      resetVideo,
    } = {}
  ) {
    this._assertReady();

    if (!isValidSceneId(sceneId)) {
      throw new Error(
        `[SceneManager] Unknown scene ID: ${String(sceneId)}`
      );
    }

    if (
      !forceReload &&
      this.isLoaded &&
      this.currentSceneId === sceneId &&
      this.currentSceneConfig
    ) {
      this._debug(
        'Load skipped: scene already loaded.',
        sceneId
      );

      return this.currentSceneConfig;
    }

    const requestId =
      ++this.loadRequestId;

    const sceneConfig =
      getSceneConfig(sceneId);

    const video =
      this.videoElements.get(
        sceneConfig.videoElementId
      );

    if (!video) {
      throw new Error(
        `[SceneManager] Video element was not found: ${sceneConfig.videoElementId}`
      );
    }

    this.isLoading = true;
    this.isLoaded = false;
    this.isTransitioning = true;
    this.pendingSceneId = sceneId;

    this._emit(EVENTS.SCENE_LOADING, {
      sceneId,
      timelineId: sceneConfig.timelineId,
      videoElementId: sceneConfig.videoElementId,
      videoPath: sceneConfig.videoPath,
    });

    try {
      this._deactivateCurrentVideo({
        reset:
          this.currentSceneConfig?.resetOnLoad ??
          true,
      });

      if (requestId !== this.loadRequestId) {
        throw new DOMException(
          'Scene loading was superseded by another request.',
          'AbortError'
        );
      }

      this.currentSceneId = sceneId;
      this.currentSceneConfig =
        sceneConfig;

      this.currentVideo = video;

      this._activateVideo(video);

      const shouldReset =
        resetVideo ??
        sceneConfig.resetOnLoad;

      if (shouldReset) {
        this._setVideoTime(
          video,
          0
        );
      }

      video.loop =
        Boolean(sceneConfig.loop);

      video.volume =
        this._normalizeVolume(
          sceneConfig.volume
        );

      video.muted =
        VIDEO_CONFIG.mutedAtStartup;

      await this._ensureVideoReady(
        video,
        sceneConfig,
        requestId
      );

      if (requestId !== this.loadRequestId) {
        throw new DOMException(
          'Scene loading was superseded by another request.',
          'AbortError'
        );
      }

      this.isLoading = false;
      this.isLoaded = true;
      this.isTransitioning = false;
      this.pendingSceneId = null;

      this._emit(EVENTS.SCENE_LOADED, {
        sceneId,
        timelineId: sceneConfig.timelineId,
        videoElementId: sceneConfig.videoElementId,
        duration:
          this._getVideoDuration(video),
        currentTime: video.currentTime,
        nextSceneId: sceneConfig.nextSceneId,
      });

      this._debug(
        'Scene loaded:',
        sceneId
      );

      return sceneConfig;
    } catch (error) {
      if (requestId === this.loadRequestId) {
        this.isLoading = false;
        this.isLoaded = false;
        this.isTransitioning = false;
        this.pendingSceneId = null;
      }

      if (error?.name === 'AbortError') {
        this._debug(
          'Scene load aborted:',
          sceneId
        );

        throw error;
      }

      this._emitError(
        'Failed to load scene.',
        {
          sceneId,
          error,
        }
      );

      throw error;
    }
  }


  /**
   * 指定したシーンへ切り替え、そのまま再生します。
   *
   * @param {string} sceneId
   * @param {Object} [options]
   * @param {boolean} [options.forceReload=false]
   * @param {boolean} [options.resetVideo=true]
   * @param {boolean} [options.unmute=true]
   * @returns {Promise<void>}
   */
  async change(
    sceneId,
    {
      forceReload = false,
      resetVideo = true,
      unmute = true,
    } = {}
  ) {
    this._assertReady();

    await this.load(sceneId, {
      forceReload,
      resetVideo,
    });

    await this.play({
      unmute,
    });
  }


  /* ==========================================================================
     Playback control
     ========================================================================== */

  /**
   * 現在のシーンを再生します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.unmute=true]
   * @returns {Promise<void>}
   */
  async play({
    unmute = true,
  } = {}) {
    this._assertReady();
    this._assertLoaded();

    if (!this.currentVideo) {
      throw new Error(
        '[SceneManager] Current video is not available.'
      );
    }

    if (
      unmute &&
      this.currentVideo.muted
    ) {
      this.currentVideo.muted = false;
    }

    try {
      await this.currentVideo.play();

      /*
       * playingイベントが発火しない環境に備えて、
       * ここでも状態を確定します。
       */
      this._setPlaybackState({
        playing: true,
        paused: false,
      });

      this._startTimeUpdateTimer();
      this._emitSceneStarted();

      this._debug(
        'Scene playback started:',
        this.currentSceneId
      );
    } catch (error) {
      this._setPlaybackState({
        playing: false,
        paused: true,
      });

      this._emitError(
        'Video playback could not be started.',
        {
          sceneId: this.currentSceneId,
          error,
        }
      );

      throw error;
    }
  }


  /**
   * 現在のシーンを一時停止します。
   */
  pause() {
    this._assertReady();

    if (
      !this.currentVideo ||
      !this.isLoaded
    ) {
      return;
    }

    if (this.currentVideo.paused) {
      this._setPlaybackState({
        playing: false,
        paused: true,
      });

      this._stopTimeUpdateTimer();

      return;
    }

    this.currentVideo.pause();

    /*
     * pauseイベントが発火しない環境に備えて、
     * ここでも状態を確定します。
     */
    this._setPlaybackState({
      playing: false,
      paused: true,
    });

    this._stopTimeUpdateTimer();

    this._emit(EVENTS.SCENE_PAUSED, {
      sceneId: this.currentSceneId,
      timelineId:
        this.currentSceneConfig?.timelineId ??
        null,
      currentTime:
        this.currentVideo.currentTime,
    });

    this._debug(
      'Scene paused:',
      this.currentSceneId
    );
  }


  /**
   * 一時停止したシーンを再開します。
   *
   * @returns {Promise<void>}
   */
  async resume() {
    this._assertReady();
    this._assertLoaded();

    if (
      this.currentVideo &&
      !this.currentVideo.paused &&
      !this.currentVideo.ended
    ) {
      return;
    }

    await this.play({
      unmute: false,
    });
  }


  /**
   * 現在のシーンを停止します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.reset=true]
   */
  stop({
    reset = true,
  } = {}) {
    this._assertReady();

    if (!this.currentVideo) {
      return;
    }

    this._stopTimeUpdateTimer();

    this.currentVideo.pause();

    if (reset) {
      this._setVideoTime(
        this.currentVideo,
        0
      );
    }

    this._setPlaybackState({
      playing: false,
      paused: false,
    });

    this._emit(EVENTS.SCENE_STOPPED, {
      sceneId: this.currentSceneId,
      timelineId:
        this.currentSceneConfig?.timelineId ??
        null,
      currentTime:
        this.currentVideo.currentTime,
      reset,
    });

    this._debug(
      'Scene stopped:',
      this.currentSceneId
    );
  }


  /**
   * 現在のシーンを先頭から再生します。
   *
   * @returns {Promise<void>}
   */
  async restart() {
    this._assertReady();
    this._assertLoaded();

    this.stop({
      reset: true,
    });

    await this.play({
      unmute: false,
    });
  }


  /**
   * 現在の動画を指定時刻へ移動します。
   *
   * @param {number} time 秒
   */
  seek(time) {
    this._assertReady();
    this._assertLoaded();

    if (!this.currentVideo) {
      return;
    }

    const normalizedTime =
      this._normalizeTime(
        time,
        this._getVideoDuration(
          this.currentVideo
        )
      );

    this._setVideoTime(
      this.currentVideo,
      normalizedTime
    );

    this._emitTimeUpdated();

    this._debug(
      'Scene seek:',
      this.currentSceneId,
      normalizedTime
    );
  }


  /**
   * 音量を設定します。
   *
   * @param {number} volume
   * @returns {number}
   */
  setVolume(volume) {
    this._assertReady();

    const normalizedVolume =
      this._normalizeVolume(volume);

    if (this.currentVideo) {
      this.currentVideo.volume =
        normalizedVolume;
    }

    return normalizedVolume;
  }


  /**
   * ミュート状態を設定します。
   *
   * @param {boolean} muted
   */
  setMuted(muted) {
    this._assertReady();

    if (!this.currentVideo) {
      return;
    }

    this.currentVideo.muted =
      Boolean(muted);
  }


  /* ==========================================================================
     Scene progression
     ========================================================================== */

  /**
   * 現在のシーン設定に基づき、次のシーンIDを返します。
   *
   * @returns {string|null}
   */
  getNextSceneId() {
    return (
      this.currentSceneConfig
        ?.nextSceneId ??
      null
    );
  }


  /**
   * 現在のシーン設定に従い次へ進みます。
   *
   * 完了状態の場合はSCENE_IDS.COMPLETEDを返し、
   * 実際の完了画面表示はmain.jsが行います。
   *
   * @param {Object} [options]
   * @param {boolean} [options.autoplay=true]
   * @returns {Promise<string|null>}
   */
  async goToNext({
    autoplay = true,
  } = {}) {
    this._assertReady();
    this._assertLoaded();

    const nextSceneId =
      this.getNextSceneId();

    if (!nextSceneId) {
      return null;
    }

    if (
      nextSceneId ===
      SCENE_IDS.COMPLETED
    ) {
      return SCENE_IDS.COMPLETED;
    }

    if (autoplay) {
      await this.change(
        nextSceneId
      );
    } else {
      await this.load(
        nextSceneId
      );
    }

    return nextSceneId;
  }


  /* ==========================================================================
     Public getters
     ========================================================================== */

  /**
   * 現在のシーンIDを返します。
   *
   * @returns {string|null}
   */
  getCurrentSceneId() {
    return this.currentSceneId;
  }


  /**
   * 現在のシーン設定を返します。
   *
   * @returns {Readonly<Object>|null}
   */
  getCurrentSceneConfig() {
    return this.currentSceneConfig;
  }


  /**
   * 現在の動画要素を返します。
   *
   * @returns {HTMLVideoElement|null}
   */
  getCurrentVideo() {
    return this.currentVideo;
  }


  /**
   * 現在の再生時刻を返します。
   *
   * @returns {number}
   */
  getCurrentTime() {
    return (
      this.currentVideo
        ?.currentTime ??
      0
    );
  }


  /**
   * 現在の動画時間を返します。
   *
   * @returns {number|null}
   */
  getDuration() {
    if (!this.currentVideo) {
      return null;
    }

    return this._getVideoDuration(
      this.currentVideo
    );
  }


  /**
   * シーン読み込み済みか返します。
   *
   * @returns {boolean}
   */
  getLoadedState() {
    return this.isLoaded;
  }


  /**
   * シーンが再生中か返します。
   *
   * @returns {boolean}
   */
  getPlayingState() {
    return (
      this.isPlaying &&
      !this.isPaused
    );
  }


  /**
   * シーンが一時停止中か返します。
   *
   * @returns {boolean}
   */
  getPausedState() {
    return this.isPaused;
  }


  /**
   * シーン読み込み中か返します。
   *
   * @returns {boolean}
   */
  getLoadingState() {
    return this.isLoading;
  }


  /**
   * シーン切り替え中か返します。
   *
   * @returns {boolean}
   */
  getTransitioningState() {
    return this.isTransitioning;
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
    this.elements.aframeScene =
      document.getElementById(
        DOM_IDS.aframeScene
      );

    this.elements.videoSphere =
      document.getElementById(
        DOM_IDS.videoSphere
      );

    const videoIds = [
      DOM_IDS.introVideo,
      DOM_IDS.departureVideo,
      DOM_IDS.flightVideo,
      DOM_IDS.waitingRouteVideo,
      DOM_IDS.alternateRouteVideo,
      DOM_IDS.arrivalVideo,
    ];

    for (const videoId of videoIds) {
      const video =
        document.getElementById(
          videoId
        );

      if (video) {
        this.videoElements.set(
          videoId,
          video
        );
      }
    }
  }


  /**
   * 必須DOM要素を検証します。
   *
   * @private
   */
  _validateRequiredElements() {
    const missingElements = [];

    if (!this.elements.aframeScene) {
      missingElements.push(
        DOM_IDS.aframeScene
      );
    }

    if (!this.elements.videoSphere) {
      missingElements.push(
        DOM_IDS.videoSphere
      );
    }

    const requiredVideoIds = [
      DOM_IDS.introVideo,
      DOM_IDS.departureVideo,
      DOM_IDS.flightVideo,
      DOM_IDS.waitingRouteVideo,
      DOM_IDS.alternateRouteVideo,
      DOM_IDS.arrivalVideo,
    ];

    for (const videoId of requiredVideoIds) {
      if (
        !this.videoElements.has(
          videoId
        )
      ) {
        missingElements.push(
          videoId
        );
      }
    }

    if (missingElements.length > 0) {
      throw new Error(
        `[SceneManager] Missing required DOM elements: ${missingElements.join(', ')}`
      );
    }
  }


  /**
   * 動画要素の共通設定を適用します。
   *
   * @private
   */
  _configureVideos() {
    for (const video of this.videoElements.values()) {
      video.autoplay =
        VIDEO_CONFIG.autoplay;

      video.muted =
        VIDEO_CONFIG.mutedAtStartup;

      video.playsInline =
        VIDEO_CONFIG.playsInline;

      video.preload =
        VIDEO_CONFIG.preload;

      video.crossOrigin =
        VIDEO_CONFIG.crossOrigin;

      video.volume =
        VIDEO_CONFIG.defaultVolume;

      video.setAttribute(
        'playsinline',
        ''
      );

      video.setAttribute(
        'webkit-playsinline',
        ''
      );
    }
  }


  /* ==========================================================================
     Video activation
     ========================================================================== */

  /**
   * 現在の動画を非アクティブ化します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.reset=true]
   * @private
   */
  _deactivateCurrentVideo({
    reset = true,
  } = {}) {
    this._stopTimeUpdateTimer();

    if (!this.currentVideo) {
      return;
    }

    this.currentVideo.pause();

    if (reset) {
      this._setVideoTime(
        this.currentVideo,
        0
      );
    }

    this._setPlaybackState({
      playing: false,
      paused: false,
    });
  }


  /**
   * A-Frameの映像球へ動画を設定します。
   *
   * @param {HTMLVideoElement} video
   * @private
   */
  _activateVideo(video) {
    const selector =
      `#${video.id}`;

    this.elements.videoSphere.setAttribute(
      'src',
      selector
    );

    /*
     * A-Frameのmaterial更新が遅延する環境向けに、
     * material属性側にもsrcを設定します。
     */
    this.elements.videoSphere.setAttribute(
      'material',
      'src',
      selector
    );
  }


  /* ==========================================================================
     Video readiness
     ========================================================================== */

  /**
   * 動画が再生可能になるまで待機します。
   *
   * @param {HTMLVideoElement} video
   * @param {Readonly<Object>} sceneConfig
   * @param {number} requestId
   * @returns {Promise<void>}
   * @private
   */
  _ensureVideoReady(
    video,
    sceneConfig,
    requestId
  ) {
    if (
      video.readyState >=
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return Promise.resolve();
    }

    return new Promise(
      (resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          video.removeEventListener(
            'loadeddata',
            handleReady
          );

          video.removeEventListener(
            'canplay',
            handleReady
          );

          video.removeEventListener(
            'error',
            handleError
          );

          this._clearLoadTimeout();
        };

        const finish = callback => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          callback();
        };

        const handleReady = () => {
          if (
            requestId !==
            this.loadRequestId
          ) {
            finish(() => {
              reject(
                new DOMException(
                  'Scene loading was superseded.',
                  'AbortError'
                )
              );
            });

            return;
          }

          finish(resolve);
        };

        const handleError = () => {
          finish(() => {
            reject(
              this._createVideoError(
                sceneConfig,
                video
              )
            );
          });
        };

        video.addEventListener(
          'loadeddata',
          handleReady,
          {
            once: true,
          }
        );

        video.addEventListener(
          'canplay',
          handleReady,
          {
            once: true,
          }
        );

        video.addEventListener(
          'error',
          handleError,
          {
            once: true,
          }
        );

        this._startLoadTimeout(
          () => {
            finish(() => {
              reject(
                new Error(
                  `[SceneManager] Video loading timed out: ${sceneConfig.id}`
                )
              );
            });
          }
        );

        /*
         * HTML側のsrcを利用して、明示的に読み込みを開始します。
         */
        try {
          video.load();
        } catch (error) {
          finish(() => {
            reject(error);
          });
        }
      }
    );
  }


  /**
   * 動画エラーを生成します。
   *
   * @param {Readonly<Object>} sceneConfig
   * @param {HTMLVideoElement} video
   * @returns {Error}
   * @private
   */
  _createVideoError(
    sceneConfig,
    video
  ) {
    const mediaError =
      video.error;

    const mediaErrorCode =
      mediaError?.code ??
      'unknown';

    return new Error(
      `[SceneManager] Video failed to load: ${sceneConfig.id} / media error code ${mediaErrorCode}`
    );
  }


  /* ==========================================================================
     Video events
     ========================================================================== */

  /**
   * playingイベントを処理します。
   *
   * @param {Event} event
   * @private
   */
  _handleVideoPlaying(event) {
    if (
      !this._isCurrentVideoEventTarget(
        event
      )
    ) {
      return;
    }

    this._setPlaybackState({
      playing: true,
      paused: false,
    });

    this._startTimeUpdateTimer();
  }


  /**
   * pauseイベントを処理します。
   *
   * @param {Event} event
   * @private
   */
  _handleVideoPause(event) {
    if (
      !this._isCurrentVideoEventTarget(
        event
      )
    ) {
      return;
    }

    if (this.currentVideo?.ended) {
      return;
    }

    this._setPlaybackState({
      playing: false,
      paused: true,
    });

    this._stopTimeUpdateTimer();
  }


  /**
   * endedイベントを処理します。
   *
   * @param {Event} event
   * @private
   */
  _handleVideoEnded(event) {
    if (
      !this._isCurrentVideoEventTarget(
        event
      )
    ) {
      return;
    }

    this._stopTimeUpdateTimer();

    this._setPlaybackState({
      playing: false,
      paused: false,
    });

    this._emitTimeUpdated();

    this._emit(EVENTS.SCENE_ENDED, {
      sceneId:
        this.currentSceneId,

      timelineId:
        this.currentSceneConfig?.timelineId ??
        null,

      currentTime:
        this.currentVideo?.currentTime ??
        0,

      duration:
        this.currentVideo
          ? this._getVideoDuration(
              this.currentVideo
            )
          : null,

      nextSceneId:
        this.currentSceneConfig?.nextSceneId ??
        null,
    });

    this._debug(
      'Scene ended:',
      this.currentSceneId
    );
  }


  /**
   * errorイベントを処理します。
   *
   * @param {Event} event
   * @private
   */
  _handleVideoError(event) {
    if (
      !this._isCurrentVideoEventTarget(
        event
      )
    ) {
      return;
    }

    this._stopTimeUpdateTimer();

    this._setPlaybackState({
      playing: false,
      paused: false,
    });

    this._emitError(
      'Current scene video encountered an error.',
      {
        sceneId:
          this.currentSceneId,

        mediaError:
          this.currentVideo?.error ??
          null,
      }
    );
  }


  /**
   * waitingイベントを処理します。
   *
   * @param {Event} event
   * @private
   */
  _handleVideoWaiting(event) {
    if (
      !this._isCurrentVideoEventTarget(
        event
      )
    ) {
      return;
    }

    this._debug(
      'Video buffering:',
      this.currentSceneId,
      this.currentVideo?.currentTime
    );
  }


  /**
   * イベント発生元が現在の動画か確認します。
   *
   * @param {Event} event
   * @returns {boolean}
   * @private
   */
  _isCurrentVideoEventTarget(event) {
    return (
      Boolean(this.currentVideo) &&
      event?.currentTarget ===
        this.currentVideo
    );
  }


  /* ==========================================================================
     Time updates
     ========================================================================== */

  /**
   * 定期的な再生時刻通知を開始します。
   *
   * @private
   */
  _startTimeUpdateTimer() {
    if (
      this.timeUpdateTimerId !== null
    ) {
      return;
    }

    this.timeUpdateTimerId =
      window.setInterval(
        this._handleTimeUpdateTick,
        APP_CONFIG.timelineUpdateIntervalMs
      );
  }


  /**
   * 再生時刻通知を停止します。
   *
   * @private
   */
  _stopTimeUpdateTimer() {
    if (
      this.timeUpdateTimerId !== null
    ) {
      window.clearInterval(
        this.timeUpdateTimerId
      );

      this.timeUpdateTimerId = null;
    }
  }


  /**
   * タイマー更新時の処理です。
   *
   * @private
   */
  _handleTimeUpdateTick() {
    if (
      !this.currentVideo ||
      !this.isPlaying ||
      this.isPaused
    ) {
      return;
    }

    this._emitTimeUpdated();
  }


  /**
   * SCENE_TIME_UPDATEDを発行します。
   *
   * @private
   */
  _emitTimeUpdated() {
    if (
      !this.currentVideo ||
      !this.currentSceneConfig
    ) {
      return;
    }

    this._emit(
      EVENTS.SCENE_TIME_UPDATED,
      {
        sceneId:
          this.currentSceneId,

        timelineId:
          this.currentSceneConfig.timelineId,

        currentTime:
          this.currentVideo.currentTime,

        duration:
          this._getVideoDuration(
            this.currentVideo
          ),

        paused:
          this.currentVideo.paused,

        ended:
          this.currentVideo.ended,
      }
    );
  }


  /**
   * SCENE_STARTEDを発行します。
   *
   * @private
   */
  _emitSceneStarted() {
    if (
      !this.currentVideo ||
      !this.currentSceneConfig
    ) {
      return;
    }

    this._emit(
      EVENTS.SCENE_STARTED,
      {
        sceneId:
          this.currentSceneId,

        timelineId:
          this.currentSceneConfig.timelineId,

        currentTime:
          this.currentVideo.currentTime,

        duration:
          this._getVideoDuration(
            this.currentVideo
          ),
      }
    );
  }


  /* ==========================================================================
     Visibility handling
     ========================================================================== */

  /**
   * ページ表示状態の変化を処理します。
   *
   * @private
   */
  _handleVisibilityChange() {
    if (
      !APP_CONFIG.autoPauseOnVisibilityChange ||
      !this.isLoaded
    ) {
      return;
    }

    if (
      document.visibilityState ===
      'hidden'
    ) {
      if (this.isPlaying) {
        this.pause();
      }

      return;
    }

    if (
      document.visibilityState ===
        'visible' &&
      APP_CONFIG.resumeAfterVisibilityChange &&
      this.isPaused
    ) {
      this.resume().catch(error => {
        this._emitError(
          'Failed to resume video after visibility change.',
          {
            error,
          }
        );
      });
    }
  }


  /* ==========================================================================
     Event listener registration
     ========================================================================== */

  /**
   * 動画およびDocumentイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    for (
      const video of
      this.videoElements.values()
    ) {
      this._addListener(
        video,
        'playing',
        this._handleVideoPlaying
      );

      this._addListener(
        video,
        'pause',
        this._handleVideoPause
      );

      this._addListener(
        video,
        'ended',
        this._handleVideoEnded
      );

      this._addListener(
        video,
        'error',
        this._handleVideoError
      );

      this._addListener(
        video,
        'waiting',
        this._handleVideoWaiting
      );
    }

    this._addListener(
      document,
      'visibilitychange',
      this._handleVisibilityChange
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
     Load timeout
     ========================================================================== */

  /**
   * 読み込みタイムアウトを開始します。
   *
   * @param {Function} callback
   * @private
   */
  _startLoadTimeout(callback) {
    this._clearLoadTimeout();

    this.loadTimeoutId =
      window.setTimeout(
        callback,
        APP_CONFIG.videoLoadTimeoutMs
      );
  }


  /**
   * 読み込みタイムアウトを解除します。
   *
   * @private
   */
  _clearLoadTimeout() {
    if (
      this.loadTimeoutId !== null
    ) {
      window.clearTimeout(
        this.loadTimeoutId
      );

      this.loadTimeoutId = null;
    }
  }


  /* ==========================================================================
     Value helpers
     ========================================================================== */

  /**
   * 再生状態を設定します。
   *
   * @param {Object} state
   * @param {boolean} state.playing
   * @param {boolean} state.paused
   * @private
   */
  _setPlaybackState({
    playing,
    paused,
  }) {
    this.isPlaying =
      Boolean(playing);

    this.isPaused =
      Boolean(paused);
  }


  /**
   * 動画の現在時刻を安全に設定します。
   *
   * @param {HTMLVideoElement} video
   * @param {number} time
   * @private
   */
  _setVideoTime(video, time) {
    try {
      video.currentTime =
        Math.max(0, time);
    } catch (error) {
      this._debug(
        'Video currentTime could not be changed:',
        error
      );
    }
  }


  /**
   * 動画時間を取得します。
   *
   * @param {HTMLVideoElement} video
   * @returns {number|null}
   * @private
   */
  _getVideoDuration(video) {
    if (
      typeof video.duration !==
        'number' ||
      !Number.isFinite(
        video.duration
      )
    ) {
      return null;
    }

    return video.duration;
  }


  /**
   * 時刻を有効範囲へ正規化します。
   *
   * @param {*} time
   * @param {number|null} duration
   * @returns {number}
   * @private
   */
  _normalizeTime(
    time,
    duration
  ) {
    if (
      typeof time !== 'number' ||
      !Number.isFinite(time)
    ) {
      throw new TypeError(
        `[SceneManager] Time must be a finite number: ${String(time)}`
      );
    }

    const minimum =
      Math.max(0, time);

    if (
      typeof duration !== 'number' ||
      !Number.isFinite(duration)
    ) {
      return minimum;
    }

    return Math.min(
      minimum,
      duration
    );
  }


  /**
   * 音量を0〜1へ正規化します。
   *
   * @param {*} volume
   * @returns {number}
   * @private
   */
  _normalizeVolume(volume) {
    if (
      typeof volume !== 'number' ||
      !Number.isFinite(volume)
    ) {
      return APP_CONFIG.defaultVolume;
    }

    return Math.min(
      Math.max(
        volume,
        APP_CONFIG.minimumVolume
      ),
      APP_CONFIG.maximumVolume
    );
  }


  /* ==========================================================================
     Event dispatch
     ========================================================================== */

  /**
   * 共通EventBusへイベントを発行します。
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
   * SceneManagerのエラーイベントを発行します。
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
      '[SceneManager]',
      message,
      context
    );

    this._emit(
      EVENTS.SCENE_ERROR,
      {
        source:
          'scene-manager',

        sceneId:
          this.currentSceneId,

        message,
        error,
        context,
      }
    );
  }


  /* ==========================================================================
     State assertions
     ========================================================================== */

  /**
   * SceneManagerが使用可能か検証します。
   *
   * @private
   */
  _assertReady() {
    if (this.isDestroyed) {
      throw new Error(
        '[SceneManager] This instance has been destroyed.'
      );
    }

    if (!this.isInitialized) {
      throw new Error(
        '[SceneManager] init() must be called before using this method.'
      );
    }
  }


  /**
   * シーンが読み込まれているか検証します。
   *
   * @private
   */
  _assertLoaded() {
    if (
      !this.isLoaded ||
      !this.currentSceneId ||
      !this.currentSceneConfig ||
      !this.currentVideo
    ) {
      throw new Error(
        '[SceneManager] load() must be called before controlling playback.'
      );
    }
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
      (
        !DEBUG_CONFIG.enableVerboseLogging &&
        !DEBUG_CONFIG.enableSceneLogging
      )
    ) {
      return;
    }

    console.debug(
      '[SceneManager]',
      ...args
    );
  }
}


export default SceneManager;
