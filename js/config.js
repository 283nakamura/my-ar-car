/**
 * Dream On AirTaxi Player
 * Application configuration
 *
 * @file js/config.js
 * @description
 * アプリケーション全体で使用する設定値、定数、イベント名、
 * シーン定義、タイムライン、ソラ教官のメッセージを一元管理します。
 *
 * このファイルではDOM操作やゲーム処理を行いません。
 */


/* ==========================================================================
   Application metadata
   ========================================================================== */

/**
 * アプリケーションの基本情報です。
 */
export const APP_INFO = Object.freeze({
  name: 'Dream On AirTaxi Player',
  version: '1.0.0',
  description:
    'Air taxi flight experience for Maker Faire Tokyo',
  organization: 'Dream On',
});


/* ==========================================================================
   Application states
   ========================================================================== */

/**
 * アプリケーション全体の状態です。
 *
 * 状態変更はmain.jsだけが担当します。
 */
export const APP_STATES = Object.freeze({
  BOOTING: 'booting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WAITING_FOR_CHOICE: 'waiting-for-choice',
  TRANSITIONING: 'transitioning',
  COMPLETED: 'completed',
  ERROR: 'error',
  DESTROYED: 'destroyed',
});


/* ==========================================================================
   Scene identifiers
   ========================================================================== */

/**
 * シーンIDです。
 *
 * シーンを参照するときは文字列を直接記述せず、
 * 必ずこの定数を使用します。
 */
export const SCENE_IDS = Object.freeze({
  INTRO: 'intro',
  DEPARTURE: 'departure',
  FLIGHT: 'flight',
  WAITING_ROUTE: 'waiting-route',
  ALTERNATE_ROUTE: 'alternate-route',
  ARRIVAL: 'arrival',
  COMPLETED: 'completed',
});


/* ==========================================================================
   Route identifiers
   ========================================================================== */

/**
 * ユーザーが選択できるルートです。
 */
export const ROUTE_IDS = Object.freeze({
  WAIT: 'wait',
  ALTERNATE: 'alternate',
});


/* ==========================================================================
   Choice identifiers
   ========================================================================== */

/**
 * 選択肢IDです。
 */
export const CHOICE_IDS = Object.freeze({
  ROUTE: 'route-choice',
});


/* ==========================================================================
   Asset paths
   ========================================================================== */

/**
 * アセットのルートディレクトリです。
 */
export const ASSET_PATHS = Object.freeze({
  models: './models',
  videos: './videos',
  images: './images',
});


/**
 * 動画ファイルのパスです。
 *
 * 実際の動画ファイル名に合わせて、
 * 後からここだけ変更できます。
 */
export const VIDEO_PATHS = Object.freeze({
  intro:
    `${ASSET_PATHS.videos}/intro.mp4`,

  departure:
    `${ASSET_PATHS.videos}/departure.mp4`,

  flight:
    `${ASSET_PATHS.videos}/flight.mp4`,

  waitingRoute:
    `${ASSET_PATHS.videos}/waiting-route.mp4`,

  alternateRoute:
    `${ASSET_PATHS.videos}/alternate-route.mp4`,

  arrival:
    `${ASSET_PATHS.videos}/arrival.mp4`,
});


/**
 * 画像ファイルのパスです。
 */
export const IMAGE_PATHS = Object.freeze({
  mentor:
    `${ASSET_PATHS.images}/sora-mentor.png`,

  logo:
    `${ASSET_PATHS.images}/dream-on-logo.png`,

  poster:
    `${ASSET_PATHS.images}/video-poster.jpg`,
});


/**
 * 3Dモデルファイルのパスです。
 */
export const MODEL_PATHS = Object.freeze({
  aircraft:
    `${ASSET_PATHS.models}/airtaxi.glb`,
});


/* ==========================================================================
   DOM element identifiers
   ========================================================================== */

/**
 * HTML側で使用する要素IDです。
 *
 * 各ManagerではIDを直接記述せず、
 * この定数を使用します。
 */
export const DOM_IDS = Object.freeze({
  /*
   * Application
   */
  app: 'app',

  /*
   * A-Frame
   */
  aframeScene: 'airtaxi-scene',
  assets: 'airtaxi-assets',
  cameraRig: 'camera-rig',
  camera: 'main-camera',

  /*
   * Scene objects
   */
  videoSphere: 'video-sphere',
  aircraftModel: 'aircraft-model',

  /*
   * Asset elements
   */
  videoPoster: 'video-poster',
  aircraftModelAsset: 'aircraft-model-asset',

  /*
   * Video elements
   */
  introVideo: 'video-intro',
  departureVideo: 'video-departure',
  flightVideo: 'video-flight',
  waitingRouteVideo: 'video-waiting-route',
  alternateRouteVideo: 'video-alternate-route',
  arrivalVideo: 'video-arrival',

  /*
   * Loading screen
   */
  loadingScreen: 'loading-screen',
  loadingMessage: 'loading-message',

  /*
   * Start screen
   */
  startScreen: 'start-screen',
  startButton: 'start-button',

  /*
   * Playback controls
   */
  controls: 'controls',
  pauseButton: 'pause-button',
  resumeButton: 'resume-button',
  restartButton: 'restart-button',
  fullscreenButton: 'fullscreen-button',

  /*
   * Route choice
   */
  choicePanel: 'choice-panel',
  choiceTitle: 'choice-title',
  choiceDescription: 'choice-description',
  waitRouteButton: 'wait-route-button',
  alternateRouteButton:
    'alternate-route-button',

  /*
   * Mentor
   */
  mentorContainer: 'mentor-container',
  mentorImage: 'mentor-image',
  mentorName: 'mentor-name',
  mentorMessage: 'mentor-message',

  /*
   * Completion screen
   */
  completionScreen: 'completion-screen',
  completionMessage: 'completion-message',
  replayButton: 'replay-button',

  /*
   * Error screen
   */
  errorScreen: 'error-screen',
  errorMessage: 'error-message',
  errorRetryButton: 'error-retry-button',

  /*
   * Transition overlay
   */
  screenFade: 'screen-fade',
});


/* ==========================================================================
   Custom event names
   ========================================================================== */

/**
 * アプリケーション内で使用するカスタムイベント名です。
 *
 * イベント名は以下の形式に統一します。
 *
 * namespace:action
 */
export const EVENTS = Object.freeze({
  /*
   * Application
   */
  APP_STATE_CHANGED:
    'app:state-changed',

  APP_READY:
    'app:ready',

  APP_COMPLETED:
    'app:completed',

  APP_ERROR:
    'app:error',

  /*
   * UI requests
   *
   * UIManagerからmain.jsへ送信されるイベントです。
   */
  UI_START_REQUESTED:
    'ui:start-requested',

  UI_PAUSE_REQUESTED:
    'ui:pause-requested',

  UI_RESUME_REQUESTED:
    'ui:resume-requested',

  UI_RESTART_REQUESTED:
    'ui:restart-requested',

  UI_REPLAY_REQUESTED:
    'ui:replay-requested',

  UI_CHOICE_SELECTED:
    'ui:choice-selected',

  UI_FULLSCREEN_REQUESTED:
    'ui:fullscreen-requested',

  UI_RETRY_REQUESTED:
    'ui:retry-requested',

  UI_ERROR:
    'ui:error',

  /*
   * UI event aliases
   *
   * 以前のUIManagerが旧名称を参照していても
   * 同じイベント文字列を使用できるようにしています。
   */
  UI_START:
    'ui:start-requested',

  UI_PAUSE:
    'ui:pause-requested',

  UI_RESUME:
    'ui:resume-requested',

  UI_RESTART:
    'ui:restart-requested',

  UI_REPLAY:
    'ui:replay-requested',

  UI_CHOICE:
    'ui:choice-selected',

  UI_FULLSCREEN:
    'ui:fullscreen-requested',

  UI_RETRY:
    'ui:retry-requested',

  /*
   * Scene
   */
  SCENE_READY:
    'scene:ready',

  SCENE_LOADING:
    'scene:loading',

  SCENE_LOADED:
    'scene:loaded',

  SCENE_STARTED:
    'scene:started',

  SCENE_PAUSED:
    'scene:paused',

  SCENE_STOPPED:
    'scene:stopped',

  SCENE_TIME_UPDATED:
    'scene:time-updated',

  SCENE_ENDED:
    'scene:ended',

  SCENE_ERROR:
    'scene:error',

  /*
   * Timeline
   */
  TIMELINE_STARTED:
    'timeline:started',

  TIMELINE_PAUSED:
    'timeline:paused',

  TIMELINE_RESUMED:
    'timeline:resumed',

  TIMELINE_RESET:
    'timeline:reset',

  TIMELINE_EVENT:
    'timeline:event',

  TIMELINE_COMPLETED:
    'timeline:completed',

  TIMELINE_ERROR:
    'timeline:error',

  /*
   * Mentor requests and lifecycle
   */
  MENTOR_SHOW:
    'mentor:show',

  MENTOR_HIDE:
    'mentor:hide',

  MENTOR_SHOWN:
    'mentor:shown',

  MENTOR_HIDDEN:
    'mentor:hidden',

  MENTOR_COMPLETED:
    'mentor:completed',

  MENTOR_ERROR:
    'mentor:error',

  /*
   * Rotor requests and lifecycle
   */
  ROTOR_READY:
    'rotor:ready',

  ROTOR_START:
    'rotor:start',

  ROTOR_STOP:
    'rotor:stop',

  ROTOR_SPEED_CHANGE:
    'rotor:speed-change',

  ROTOR_STARTED:
    'rotor:started',

  ROTOR_STOPPED:
    'rotor:stopped',

  ROTOR_ERROR:
    'rotor:error',
});


/* ==========================================================================
   Application configuration
   ========================================================================== */

/**
 * アプリケーション共通設定です。
 */
export const APP_CONFIG = Object.freeze({
  initialState:
    APP_STATES.BOOTING,

  initialSceneId:
    SCENE_IDS.INTRO,

  autoPauseOnVisibilityChange: true,
  preventMultipleInitialization: true,
  resumeAfterVisibilityChange: false,

  defaultVolume: 0.3,
  minimumVolume: 0,
  maximumVolume: 1,

  videoLoadTimeoutMs: 15000,
  modelLoadTimeoutMs: 15000,
  sceneLoadTimeoutMs: 15000,

  timelineUpdateIntervalMs: 100,

  fadeDurationMs: 500,
  mentorDefaultDurationMs: 5000,

  enableFullscreen: true,
  enableKeyboardControls: true,
});


/* ==========================================================================
   Video configuration
   ========================================================================== */

/**
 * 映像表示に関する設定です。
 */
export const VIDEO_CONFIG = Object.freeze({
  autoplay: false,
  mutedAtStartup: true,
  playsInline: true,
  preload: 'auto',
  crossOrigin: 'anonymous',

  defaultVolume:
    APP_CONFIG.defaultVolume,

  sphereRadius: 100,

  sphereRotation: Object.freeze({
    x: 0,
    y: -90,
    z: 0,
  }),

  fadeDurationMs:
    APP_CONFIG.fadeDurationMs,
});


/* ==========================================================================
   Mentor configuration
   ========================================================================== */

/**
 * ソラ教官の表示設定です。
 */
export const MENTOR_CONFIG = Object.freeze({
  name: 'ソラ教官',

  imagePath:
    IMAGE_PATHS.mentor,

  defaultDurationMs:
    APP_CONFIG.mentorDefaultDurationMs,

  fadeDurationMs: 300,

  allowManualDismiss: false,
  hideOnSceneChange: true,
  useAriaLive: true,
});


/**
 * ソラ教官のメッセージ定義です。
 *
 * durationMsがnullの場合は、
 * 自動では非表示にしません。
 */
export const MENTOR_MESSAGES = Object.freeze({
  WELCOME: Object.freeze({
    id: 'welcome',
    speaker: MENTOR_CONFIG.name,
    text:
      'ようこそ。これからエアタクシーのフライトを体験してもらいます。',
    durationMs: 6000,
  }),

  PREPARE_DEPARTURE: Object.freeze({
    id: 'prepare-departure',
    speaker: MENTOR_CONFIG.name,
    text:
      'まもなく出発します。周囲を見渡して、機体の中からの景色を確認してください。',
    durationMs: 6000,
  }),

  TAKEOFF: Object.freeze({
    id: 'takeoff',
    speaker: MENTOR_CONFIG.name,
    text:
      '離陸します。エアタクシーが上昇する様子を体験してください。',
    durationMs: 5000,
  }),

  FLIGHT_GUIDE: Object.freeze({
    id: 'flight-guide',
    speaker: MENTOR_CONFIG.name,
    text:
      '順調に飛行しています。首を動かすと、周囲の景色を見渡せます。',
    durationMs: 6000,
  }),

  ROUTE_CHOICE: Object.freeze({
    id: 'route-choice',
    speaker: MENTOR_CONFIG.name,
    text:
      '前方の状況が変化しました。ここで待機するか、別のルートへ向かうかを選んでください。',
    durationMs: null,
  }),

  WAIT_ROUTE_SELECTED: Object.freeze({
    id: 'wait-route-selected',
    speaker: MENTOR_CONFIG.name,
    text:
      '待機するルートを選びました。安全が確認できるまで、この場所で待ちましょう。',
    durationMs: 6000,
  }),

  ALTERNATE_ROUTE_SELECTED: Object.freeze({
    id: 'alternate-route-selected',
    speaker: MENTOR_CONFIG.name,
    text:
      '別のルートを選びました。安全な経路を通って目的地へ向かいます。',
    durationMs: 6000,
  }),

  PREPARE_ARRIVAL: Object.freeze({
    id: 'prepare-arrival',
    speaker: MENTOR_CONFIG.name,
    text:
      'まもなく目的地に到着します。着陸するまでそのままお待ちください。',
    durationMs: 6000,
  }),

  ARRIVAL_COMPLETE: Object.freeze({
    id: 'arrival-complete',
    speaker: MENTOR_CONFIG.name,
    text:
      '目的地に到着しました。エアタクシーの旅はいかがでしたか？',
    durationMs: 7000,
  }),
});


/* ==========================================================================
   Choice configuration
   ========================================================================== */

/**
 * 分岐選択肢の設定です。
 */
export const CHOICES = Object.freeze({
  ROUTE: Object.freeze({
    id:
      CHOICE_IDS.ROUTE,

    title:
      'どうしますか？',

    description:
      '安全な移動方法を選んでください。',

    options: Object.freeze([
      Object.freeze({
        id:
          ROUTE_IDS.WAIT,

        label:
          'ここで待機する',

        targetSceneId:
          SCENE_IDS.WAITING_ROUTE,
      }),

      Object.freeze({
        id:
          ROUTE_IDS.ALTERNATE,

        label:
          '別の場所へ向かう',

        targetSceneId:
          SCENE_IDS.ALTERNATE_ROUTE,
      }),
    ]),
  }),
});


/* ==========================================================================
   Timeline event types
   ========================================================================== */

/**
 * タイムラインから発行されるイベント種別です。
 *
 * TimelineManagerはこの値を解釈せず、
 * main.jsがイベント内容に応じて処理を振り分けます。
 */
export const TIMELINE_EVENT_TYPES =
  Object.freeze({
    /*
     * Mentor
     */
    MENTOR_SHOW:
      'mentor:show',

    MENTOR_HIDE:
      'mentor:hide',

    /*
     * UI
     */
    UI_SHOW_CONTROLS:
      'ui:show-controls',

    UI_HIDE_CONTROLS:
      'ui:hide-controls',

    UI_SHOW_CHOICE:
      'ui:show-choice',

    UI_HIDE_CHOICE:
      'ui:hide-choice',

    /*
     * Rotor
     */
    ROTOR_START:
      'rotor:start',

    ROTOR_STOP:
      'rotor:stop',

    ROTOR_SPEED_CHANGE:
      'rotor:speed-change',

    /*
     * Scene
     */
    SCENE_PAUSE:
      'scene:pause',

    SCENE_RESUME:
      'scene:resume',

    SCENE_CHANGE:
      'scene:change',

    /*
     * Application
     */
    COMPLETE:
      'app:complete',

    /*
     * 旧名称との互換用です。
     */
    APP_COMPLETE:
      'app:complete',
  });


/* ==========================================================================
   Timeline definitions
   ========================================================================== */

/**
 * 時間イベントの定義です。
 *
 * 各イベントには必ず一意のidを付与します。
 *
 * @property {string} id
 * @property {number} time
 * @property {string} type
 * @property {Object} payload
 * @property {boolean} once
 */
export const TIMELINES = Object.freeze({
  [SCENE_IDS.INTRO]:
    Object.freeze([
      Object.freeze({
        id:
          'intro-mentor-welcome',

        time: 0.5,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.WELCOME.id,
        }),

        once: true,
      }),
    ]),

  [SCENE_IDS.DEPARTURE]:
    Object.freeze([
      Object.freeze({
        id:
          'departure-mentor-prepare',

        time: 0.5,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES
              .PREPARE_DEPARTURE.id,
        }),

        once: true,
      }),

      Object.freeze({
        id:
          'departure-rotor-start',

        time: 2,

        type:
          TIMELINE_EVENT_TYPES.ROTOR_START,

        payload: Object.freeze({
          speed: 20,
        }),

        once: true,
      }),

      Object.freeze({
        id:
          'departure-mentor-takeoff',

        time: 6,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.TAKEOFF.id,
        }),

        once: true,
      }),
    ]),

  [SCENE_IDS.FLIGHT]:
    Object.freeze([
      Object.freeze({
        id:
          'flight-mentor-guide',

        time: 3,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.FLIGHT_GUIDE.id,
        }),

        once: true,
      }),

      /*
       * 同一時刻のイベントは配列順に処理されます。
       *
       * 先にソラ教官を表示し、
       * 続けて選択肢を表示して動画を停止します。
       */
      Object.freeze({
        id:
          'flight-route-choice-mentor',

        time: 15,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.ROUTE_CHOICE.id,
        }),

        once: true,
      }),

      Object.freeze({
        id:
          'flight-route-choice',

        time: 15,

        type:
          TIMELINE_EVENT_TYPES.UI_SHOW_CHOICE,

        payload: Object.freeze({
          choiceId:
            CHOICE_IDS.ROUTE,

          pauseScene: true,
        }),

        once: true,
      }),
    ]),

  [SCENE_IDS.WAITING_ROUTE]:
    Object.freeze([
      Object.freeze({
        id:
          'waiting-route-mentor',

        time: 0.5,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES
              .WAIT_ROUTE_SELECTED.id,
        }),

        once: true,
      }),
    ]),

  [SCENE_IDS.ALTERNATE_ROUTE]:
    Object.freeze([
      Object.freeze({
        id:
          'alternate-route-mentor',

        time: 0.5,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES
              .ALTERNATE_ROUTE_SELECTED.id,
        }),

        once: true,
      }),
    ]),

  [SCENE_IDS.ARRIVAL]:
    Object.freeze([
      Object.freeze({
        id:
          'arrival-mentor-prepare',

        time: 1,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.PREPARE_ARRIVAL.id,
        }),

        once: true,
      }),

      Object.freeze({
        id:
          'arrival-rotor-stop',

        time: 12,

        type:
          TIMELINE_EVENT_TYPES.ROTOR_STOP,

        payload: Object.freeze({
          immediate: false,
        }),

        once: true,
      }),

      Object.freeze({
        id:
          'arrival-mentor-complete',

        time: 14,

        type:
          TIMELINE_EVENT_TYPES.MENTOR_SHOW,

        payload: Object.freeze({
          messageId:
            MENTOR_MESSAGES.ARRIVAL_COMPLETE.id,
        }),

        once: true,
      }),
    ]),
});


/* ==========================================================================
   Scene configuration
   ========================================================================== */

/**
 * シーン設定です。
 *
 * @property {string} id
 * @property {string} videoElementId
 * @property {string} videoPath
 * @property {string} timelineId
 * @property {boolean} loop
 * @property {number} volume
 * @property {boolean} resetOnLoad
 * @property {string|null} nextSceneId
 */
export const SCENES = Object.freeze({
  [SCENE_IDS.INTRO]:
    Object.freeze({
      id:
        SCENE_IDS.INTRO,

      videoElementId:
        DOM_IDS.introVideo,

      videoPath:
        VIDEO_PATHS.intro,

      timelineId:
        SCENE_IDS.INTRO,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      nextSceneId:
        SCENE_IDS.DEPARTURE,
    }),

  [SCENE_IDS.DEPARTURE]:
    Object.freeze({
      id:
        SCENE_IDS.DEPARTURE,

      videoElementId:
        DOM_IDS.departureVideo,

      videoPath:
        VIDEO_PATHS.departure,

      timelineId:
        SCENE_IDS.DEPARTURE,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      nextSceneId:
        SCENE_IDS.FLIGHT,
    }),

  [SCENE_IDS.FLIGHT]:
    Object.freeze({
      id:
        SCENE_IDS.FLIGHT,

      videoElementId:
        DOM_IDS.flightVideo,

      videoPath:
        VIDEO_PATHS.flight,

      timelineId:
        SCENE_IDS.FLIGHT,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      /*
       * このシーンはユーザー選択によって
       * 次のシーンが決まるためnullです。
       */
      nextSceneId: null,
    }),

  [SCENE_IDS.WAITING_ROUTE]:
    Object.freeze({
      id:
        SCENE_IDS.WAITING_ROUTE,

      videoElementId:
        DOM_IDS.waitingRouteVideo,

      videoPath:
        VIDEO_PATHS.waitingRoute,

      timelineId:
        SCENE_IDS.WAITING_ROUTE,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      nextSceneId:
        SCENE_IDS.ARRIVAL,
    }),

  [SCENE_IDS.ALTERNATE_ROUTE]:
    Object.freeze({
      id:
        SCENE_IDS.ALTERNATE_ROUTE,

      videoElementId:
        DOM_IDS.alternateRouteVideo,

      videoPath:
        VIDEO_PATHS.alternateRoute,

      timelineId:
        SCENE_IDS.ALTERNATE_ROUTE,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      nextSceneId:
        SCENE_IDS.ARRIVAL,
    }),

  [SCENE_IDS.ARRIVAL]:
    Object.freeze({
      id:
        SCENE_IDS.ARRIVAL,

      videoElementId:
        DOM_IDS.arrivalVideo,

      videoPath:
        VIDEO_PATHS.arrival,

      timelineId:
        SCENE_IDS.ARRIVAL,

      loop: false,
      volume: 0.3,
      resetOnLoad: true,

      nextSceneId:
        SCENE_IDS.COMPLETED,
    }),
});


/* ==========================================================================
   Rotor configuration
   ========================================================================== */

/**
 * プロペラ制御設定です。
 */
export const ROTOR_CONFIG = Object.freeze({
  componentName:
    'rotor-spin',

  defaultSpeed: 20,
  minimumSpeed: 0,
  maximumSpeed: 100,

  defaultAxis: 'y',

  /**
   * GLTFモデル内のプロペラノード名を
   * 検索するための文字列です。
   *
   * 大文字・小文字は区別しません。
   * 実際のモデルのノード名に合わせて調整してください。
   */
  nodeNamePatterns: Object.freeze([
    'rotor',
    'propeller',
    'prop',
    'blade',
  ]),

  /**
   * プロペラごとの回転方向です。
   *
   * 1  = 正方向
   * -1 = 逆方向
   */
  rotationDirections: Object.freeze([
    1,
    -1,
    -1,
    1,
  ]),

  stopImmediately: true,
});


/* ==========================================================================
   UI configuration
   ========================================================================== */

/**
 * UI共通設定です。
 */
export const UI_CONFIG = Object.freeze({
  hiddenClass:
    'is-hidden',

  visibleClass:
    'is-visible',

  disabledClass:
    'is-disabled',

  activeClass:
    'is-active',

  transitionDurationMs: 300,
  preventMultipleClicksMs: 500,

  loadingMessage:
    '読み込み中です…',

  readyMessage:
    '準備ができました',

  completionMessage:
    'フライト体験は終了です。ご参加ありがとうございました。',

  genericErrorMessage:
    'アプリケーションでエラーが発生しました。もう一度お試しください。',

  videoLoadErrorMessage:
    '映像を読み込めませんでした。通信環境またはファイルを確認してください。',

  modelLoadErrorMessage:
    '機体モデルを読み込めませんでした。',

  fullscreenErrorMessage:
    '全画面表示を開始できませんでした。',
});


/* ==========================================================================
   Keyboard configuration
   ========================================================================== */

/**
 * キーボード操作設定です。
 */
export const KEYBOARD_CONFIG = Object.freeze({
  enabled:
    APP_CONFIG.enableKeyboardControls,

  keys: Object.freeze({
    start: Object.freeze([
      'Enter',
    ]),

    pause: Object.freeze([
      'Escape',
      'Space',
    ]),

    resume: Object.freeze([
      'Space',
    ]),

    restart: Object.freeze([
      'KeyR',
    ]),

    fullscreen: Object.freeze([
      'KeyF',
    ]),

    waitRoute: Object.freeze([
      'Digit1',
      'Numpad1',
    ]),

    alternateRoute: Object.freeze([
      'Digit2',
      'Numpad2',
    ]),
  }),
});


/* ==========================================================================
   Debug configuration
   ========================================================================== */

/**
 * 開発時のデバッグ設定です。
 *
 * Maker Faire本番運用時はenabledをfalseにします。
 */
export const DEBUG_CONFIG = Object.freeze({
  enabled: false,

  showAFrameStats: false,

  enableVerboseLogging: false,
  enableTimelineLogging: false,
  enableSceneLogging: false,
  enableRotorLogging: false,

  allowSceneSkipping: false,

  /**
   * trueの場合、main.jsから
   * window.airTaxiPlayerAppとして公開します。
   */
  exposeAppToWindow: false,
});


/* ==========================================================================
   Shared empty values
   ========================================================================== */

/**
 * 空のタイムラインを返す際に使用する共有配列です。
 */
const EMPTY_TIMELINE =
  Object.freeze([]);


/* ==========================================================================
   Lookup helpers
   ========================================================================== */

/**
 * 指定されたシーンIDが存在するか確認します。
 *
 * COMPLETEDはアプリケーション終了状態を表すため、
 * SCENES内には実体を持ちません。
 *
 * @param {string} sceneId
 * @returns {boolean}
 */
export function isValidSceneId(sceneId) {
  return (
    typeof sceneId === 'string' &&
    Object.prototype.hasOwnProperty.call(
      SCENES,
      sceneId
    )
  );
}


/**
 * 指定されたシーンIDが、
 * 実在するシーンまたは完了状態か確認します。
 *
 * @param {string} sceneId
 * @returns {boolean}
 */
export function isValidSceneDestination(
  sceneId
) {
  return (
    isValidSceneId(sceneId) ||
    sceneId ===
      SCENE_IDS.COMPLETED
  );
}


/**
 * 指定されたアプリケーション状態が
 * 有効か確認します。
 *
 * @param {string} state
 * @returns {boolean}
 */
export function isValidAppState(state) {
  return Object.values(
    APP_STATES
  ).includes(state);
}


/**
 * シーン設定を取得します。
 *
 * 存在しないシーンIDが指定された場合は
 * 例外を投げます。
 *
 * @param {string} sceneId
 * @returns {Readonly<Object>}
 */
export function getSceneConfig(sceneId) {
  if (!isValidSceneId(sceneId)) {
    throw new Error(
      `[Config] Unknown scene ID: ${String(sceneId)}`
    );
  }

  return SCENES[sceneId];
}


/**
 * 指定されたタイムラインを取得します。
 *
 * タイムラインが設定されていない場合は
 * 空配列を返します。
 *
 * @param {string} timelineId
 * @returns {ReadonlyArray<Object>}
 */
export function getTimelineConfig(
  timelineId
) {
  if (
    typeof timelineId !== 'string'
  ) {
    return EMPTY_TIMELINE;
  }

  return (
    TIMELINES[timelineId] ??
    EMPTY_TIMELINE
  );
}


/**
 * ソラ教官のメッセージをIDから取得します。
 *
 * @param {string} messageId
 * @returns {Readonly<Object>}
 */
export function getMentorMessage(
  messageId
) {
  const message =
    Object.values(
      MENTOR_MESSAGES
    ).find(
      item =>
        item.id === messageId
    );

  if (!message) {
    throw new Error(
      `[Config] Unknown mentor message ID: ${String(messageId)}`
    );
  }

  return message;
}


/**
 * 選択肢設定をIDから取得します。
 *
 * @param {string} choiceId
 * @returns {Readonly<Object>}
 */
export function getChoiceConfig(
  choiceId
) {
  const choice =
    Object.values(
      CHOICES
    ).find(
      item =>
        item.id === choiceId
    );

  if (!choice) {
    throw new Error(
      `[Config] Unknown choice ID: ${String(choiceId)}`
    );
  }

  return choice;
}


/**
 * 選択肢IDとオプションIDから
 * 遷移先シーンを取得します。
 *
 * @param {string} choiceId
 * @param {string} optionId
 * @returns {string}
 */
export function getChoiceTargetSceneId(
  choiceId,
  optionId
) {
  const choice =
    getChoiceConfig(choiceId);

  const option =
    choice.options.find(
      item =>
        item.id === optionId
    );

  if (!option) {
    throw new Error(
      `[Config] Unknown choice option: ${String(choiceId)} / ${String(optionId)}`
    );
  }

  return option.targetSceneId;
}


/* ==========================================================================
   Configuration validation
   ========================================================================== */

/**
 * 設定値の整合性を検証します。
 *
 * main.jsの初期化時に一度だけ実行します。
 *
 * @returns {true}
 * @throws {Error}
 */
export function validateConfig() {
  validateInitialState();
  validateInitialScene();
  validateApplicationConfig();
  validateVideoConfig();
  validateEvents();
  validateScenes();
  validateMentorMessages();
  validateChoices();
  validateTimelines();
  validateRotorConfig();

  return true;
}


/**
 * 初期状態を検証します。
 *
 * @private
 */
function validateInitialState() {
  if (
    !isValidAppState(
      APP_CONFIG.initialState
    )
  ) {
    throw new Error(
      `[Config] Invalid initial application state: ${APP_CONFIG.initialState}`
    );
  }
}


/**
 * 初期シーンを検証します。
 *
 * @private
 */
function validateInitialScene() {
  if (
    !isValidSceneId(
      APP_CONFIG.initialSceneId
    )
  ) {
    throw new Error(
      `[Config] Invalid initial scene ID: ${APP_CONFIG.initialSceneId}`
    );
  }
}


/**
 * アプリケーション共通設定を検証します。
 *
 * @private
 */
function validateApplicationConfig() {
  if (
    typeof APP_CONFIG.defaultVolume !==
      'number' ||
    !Number.isFinite(
      APP_CONFIG.defaultVolume
    ) ||
    APP_CONFIG.defaultVolume <
      APP_CONFIG.minimumVolume ||
    APP_CONFIG.defaultVolume >
      APP_CONFIG.maximumVolume
  ) {
    throw new Error(
      `[Config] Invalid default volume: ${APP_CONFIG.defaultVolume}`
    );
  }

  const positiveNumberKeys = [
    'videoLoadTimeoutMs',
    'modelLoadTimeoutMs',
    'sceneLoadTimeoutMs',
    'timelineUpdateIntervalMs',
    'fadeDurationMs',
    'mentorDefaultDurationMs',
  ];

  for (
    const key of
    positiveNumberKeys
  ) {
    const value =
      APP_CONFIG[key];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new Error(
        `[Config] Invalid APP_CONFIG value: ${key} = ${String(value)}`
      );
    }
  }
}


/**
 * 動画設定を検証します。
 *
 * @private
 */
function validateVideoConfig() {
  if (
    typeof VIDEO_CONFIG.preload !==
      'string'
  ) {
    throw new Error(
      '[Config] VIDEO_CONFIG.preload must be a string.'
    );
  }

  if (
    typeof VIDEO_CONFIG.sphereRadius !==
      'number' ||
    !Number.isFinite(
      VIDEO_CONFIG.sphereRadius
    ) ||
    VIDEO_CONFIG.sphereRadius <= 0
  ) {
    throw new Error(
      `[Config] Invalid video sphere radius: ${VIDEO_CONFIG.sphereRadius}`
    );
  }

  for (
    const axis of
    ['x', 'y', 'z']
  ) {
    const value =
      VIDEO_CONFIG.sphereRotation[
        axis
      ];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      throw new Error(
        `[Config] Invalid video sphere rotation: ${axis} = ${String(value)}`
      );
    }
  }
}


/**
 * カスタムイベント名を検証します。
 *
 * 同一文字列を持つ後方互換エイリアスは許可します。
 *
 * @private
 */
function validateEvents() {
  for (
    const [eventKey, eventName] of
    Object.entries(EVENTS)
  ) {
    if (
      typeof eventName !== 'string' ||
      eventName.trim() === ''
    ) {
      throw new Error(
        `[Config] Invalid event name: ${eventKey}`
      );
    }

    if (
      !eventName.includes(':')
    ) {
      throw new Error(
        `[Config] Event name must use namespace:action format: ${eventKey} = ${eventName}`
      );
    }
  }
}


/**
 * シーン設定を検証します。
 *
 * @private
 */
function validateScenes() {
  for (
    const [sceneId, scene] of
    Object.entries(SCENES)
  ) {
    if (scene.id !== sceneId) {
      throw new Error(
        `[Config] Scene key and scene.id do not match: ${sceneId}`
      );
    }

    if (
      typeof scene.videoElementId !==
        'string' ||
      scene.videoElementId.trim() === ''
    ) {
      throw new Error(
        `[Config] videoElementId is required for scene: ${sceneId}`
      );
    }

    if (
      typeof scene.videoPath !==
        'string' ||
      scene.videoPath.trim() === ''
    ) {
      throw new Error(
        `[Config] videoPath is required for scene: ${sceneId}`
      );
    }

    if (
      typeof scene.timelineId !==
        'string' ||
      scene.timelineId.trim() === ''
    ) {
      throw new Error(
        `[Config] timelineId is required for scene: ${sceneId}`
      );
    }

    if (
      !Array.isArray(
        TIMELINES[
          scene.timelineId
        ]
      )
    ) {
      throw new Error(
        `[Config] Timeline does not exist for scene "${sceneId}": ${scene.timelineId}`
      );
    }

    if (
      typeof scene.loop !==
      'boolean'
    ) {
      throw new Error(
        `[Config] loop must be a boolean for scene: ${sceneId}`
      );
    }

    if (
      typeof scene.resetOnLoad !==
      'boolean'
    ) {
      throw new Error(
        `[Config] resetOnLoad must be a boolean for scene: ${sceneId}`
      );
    }

    if (
      typeof scene.volume !==
        'number' ||
      !Number.isFinite(
        scene.volume
      ) ||
      scene.volume <
        APP_CONFIG.minimumVolume ||
      scene.volume >
        APP_CONFIG.maximumVolume
    ) {
      throw new Error(
        `[Config] Invalid volume for scene "${sceneId}": ${scene.volume}`
      );
    }

    if (
      scene.nextSceneId !== null &&
      !isValidSceneDestination(
        scene.nextSceneId
      )
    ) {
      throw new Error(
        `[Config] Invalid nextSceneId "${scene.nextSceneId}" in scene "${sceneId}"`
      );
    }
  }
}


/**
 * ソラ教官メッセージを検証します。
 *
 * @private
 */
function validateMentorMessages() {
  const messageIds =
    new Set();

  for (
    const message of
    Object.values(
      MENTOR_MESSAGES
    )
  ) {
    if (
      typeof message.id !==
        'string' ||
      message.id.trim() === ''
    ) {
      throw new Error(
        '[Config] Mentor message ID is required.'
      );
    }

    if (
      messageIds.has(
        message.id
      )
    ) {
      throw new Error(
        `[Config] Duplicate mentor message ID: ${message.id}`
      );
    }

    messageIds.add(
      message.id
    );

    if (
      typeof message.speaker !==
        'string' ||
      message.speaker.trim() === ''
    ) {
      throw new Error(
        `[Config] Mentor speaker is required: ${message.id}`
      );
    }

    if (
      typeof message.text !==
        'string' ||
      message.text.trim() === ''
    ) {
      throw new Error(
        `[Config] Mentor message text is required: ${message.id}`
      );
    }

    if (
      message.durationMs !== null &&
      (
        typeof message.durationMs !==
          'number' ||
        !Number.isFinite(
          message.durationMs
        ) ||
        message.durationMs < 0
      )
    ) {
      throw new Error(
        `[Config] Invalid mentor duration: ${message.id}`
      );
    }
  }
}


/**
 * 選択肢設定を検証します。
 *
 * @private
 */
function validateChoices() {
  const choiceIds =
    new Set();

  for (
    const choice of
    Object.values(CHOICES)
  ) {
    if (
      typeof choice.id !==
        'string' ||
      choice.id.trim() === ''
    ) {
      throw new Error(
        '[Config] Choice ID is required.'
      );
    }

    if (
      choiceIds.has(
        choice.id
      )
    ) {
      throw new Error(
        `[Config] Duplicate choice ID: ${choice.id}`
      );
    }

    choiceIds.add(
      choice.id
    );

    if (
      typeof choice.title !==
        'string' ||
      choice.title.trim() === ''
    ) {
      throw new Error(
        `[Config] Choice title is required: ${choice.id}`
      );
    }

    if (
      typeof choice.description !==
        'string' ||
      choice.description.trim() === ''
    ) {
      throw new Error(
        `[Config] Choice description is required: ${choice.id}`
      );
    }

    if (
      !Array.isArray(
        choice.options
      ) ||
      choice.options.length < 2
    ) {
      throw new Error(
        `[Config] Choice "${choice.id}" must contain at least two options.`
      );
    }

    const optionIds =
      new Set();

    for (
      const option of
      choice.options
    ) {
      if (
        typeof option.id !==
          'string' ||
        option.id.trim() === ''
      ) {
        throw new Error(
          `[Config] Choice option ID is required: ${choice.id}`
        );
      }

      if (
        optionIds.has(
          option.id
        )
      ) {
        throw new Error(
          `[Config] Duplicate choice option ID: ${choice.id} / ${option.id}`
        );
      }

      optionIds.add(
        option.id
      );

      if (
        typeof option.label !==
          'string' ||
        option.label.trim() === ''
      ) {
        throw new Error(
          `[Config] Choice option label is required: ${choice.id} / ${option.id}`
        );
      }

      if (
        !isValidSceneId(
          option.targetSceneId
        )
      ) {
        throw new Error(
          `[Config] Invalid target scene ID: ${choice.id} / ${option.id}`
        );
      }
    }
  }
}


/**
 * タイムライン設定を検証します。
 *
 * @private
 */
function validateTimelines() {
  const eventIds =
    new Set();

  const validTimelineTypes =
    Object.values(
      TIMELINE_EVENT_TYPES
    );

  for (
    const [timelineId, timeline] of
    Object.entries(TIMELINES)
  ) {
    if (
      !Array.isArray(timeline)
    ) {
      throw new Error(
        `[Config] Timeline must be an array: ${timelineId}`
      );
    }

    let previousTime = -1;

    for (
      const timelineEvent of
      timeline
    ) {
      if (
        typeof timelineEvent.id !==
          'string' ||
        timelineEvent.id.trim() === ''
      ) {
        throw new Error(
          `[Config] Timeline event ID is required: ${timelineId}`
        );
      }

      if (
        eventIds.has(
          timelineEvent.id
        )
      ) {
        throw new Error(
          `[Config] Duplicate timeline event ID: ${timelineEvent.id}`
        );
      }

      eventIds.add(
        timelineEvent.id
      );

      if (
        typeof timelineEvent.time !==
          'number' ||
        !Number.isFinite(
          timelineEvent.time
        ) ||
        timelineEvent.time < 0
      ) {
        throw new Error(
          `[Config] Invalid event time in "${timelineEvent.id}": ${timelineEvent.time}`
        );
      }

      if (
        timelineEvent.time <
        previousTime
      ) {
        throw new Error(
          `[Config] Timeline "${timelineId}" is not sorted by time`
        );
      }

      if (
        !validTimelineTypes.includes(
          timelineEvent.type
        )
      ) {
        throw new Error(
          `[Config] Unknown timeline event type in "${timelineEvent.id}": ${timelineEvent.type}`
        );
      }

      if (
        typeof timelineEvent.once !==
        'boolean'
      ) {
        throw new Error(
          `[Config] Timeline event once must be a boolean: ${timelineEvent.id}`
        );
      }

      if (
        timelineEvent.payload !==
          undefined &&
        (
          timelineEvent.payload ===
            null ||
          typeof timelineEvent.payload !==
            'object' ||
          Array.isArray(
            timelineEvent.payload
          )
        )
      ) {
        throw new Error(
          `[Config] Timeline payload must be an object: ${timelineEvent.id}`
        );
      }

      validateTimelinePayload(
        timelineEvent
      );

      previousTime =
        timelineEvent.time;
    }
  }
}


/**
 * タイムラインイベントのpayloadを検証します。
 *
 * @param {Object} timelineEvent
 * @private
 */
function validateTimelinePayload(
  timelineEvent
) {
  const payload =
    timelineEvent.payload ??
    {};

  switch (
    timelineEvent.type
  ) {
    case TIMELINE_EVENT_TYPES.MENTOR_SHOW:
      getMentorMessage(
        payload.messageId
      );
      break;

    case TIMELINE_EVENT_TYPES.UI_SHOW_CHOICE:
      getChoiceConfig(
        payload.choiceId
      );

      if (
        payload.pauseScene !==
          undefined &&
        typeof payload.pauseScene !==
          'boolean'
      ) {
        throw new Error(
          `[Config] pauseScene must be a boolean: ${timelineEvent.id}`
        );
      }

      break;

    case TIMELINE_EVENT_TYPES.ROTOR_START:
    case TIMELINE_EVENT_TYPES.ROTOR_SPEED_CHANGE:
      validateRotorSpeedPayload(
        timelineEvent.id,
        payload.speed
      );
      break;

    case TIMELINE_EVENT_TYPES.ROTOR_STOP:
      if (
        payload.immediate !==
          undefined &&
        typeof payload.immediate !==
          'boolean'
      ) {
        throw new Error(
          `[Config] Rotor stop immediate must be a boolean: ${timelineEvent.id}`
        );
      }

      break;

    case TIMELINE_EVENT_TYPES.SCENE_CHANGE:
      if (
        !isValidSceneDestination(
          payload.sceneId
        )
      ) {
        throw new Error(
          `[Config] Invalid timeline scene ID: ${timelineEvent.id}`
        );
      }

      break;

    default:
      break;
  }
}


/**
 * タイムライン内のローター速度を検証します。
 *
 * @param {string} eventId
 * @param {*} speed
 * @private
 */
function validateRotorSpeedPayload(
  eventId,
  speed
) {
  if (
    typeof speed !== 'number' ||
    !Number.isFinite(speed) ||
    speed <
      ROTOR_CONFIG.minimumSpeed ||
    speed >
      ROTOR_CONFIG.maximumSpeed
  ) {
    throw new Error(
      `[Config] Invalid rotor speed in "${eventId}": ${String(speed)}`
    );
  }
}


/**
 * プロペラ設定を検証します。
 *
 * @private
 */
function validateRotorConfig() {
  if (
    typeof ROTOR_CONFIG.minimumSpeed !==
      'number' ||
    !Number.isFinite(
      ROTOR_CONFIG.minimumSpeed
    )
  ) {
    throw new Error(
      '[Config] Invalid minimum rotor speed.'
    );
  }

  if (
    typeof ROTOR_CONFIG.maximumSpeed !==
      'number' ||
    !Number.isFinite(
      ROTOR_CONFIG.maximumSpeed
    ) ||
    ROTOR_CONFIG.maximumSpeed <
      ROTOR_CONFIG.minimumSpeed
  ) {
    throw new Error(
      '[Config] Invalid maximum rotor speed.'
    );
  }

  if (
    typeof ROTOR_CONFIG.defaultSpeed !==
      'number' ||
    !Number.isFinite(
      ROTOR_CONFIG.defaultSpeed
    ) ||
    ROTOR_CONFIG.defaultSpeed <
      ROTOR_CONFIG.minimumSpeed ||
    ROTOR_CONFIG.defaultSpeed >
      ROTOR_CONFIG.maximumSpeed
  ) {
    throw new Error(
      `[Config] Invalid default rotor speed: ${ROTOR_CONFIG.defaultSpeed}`
    );
  }

  if (
    !['x', 'y', 'z'].includes(
      ROTOR_CONFIG.defaultAxis
    )
  ) {
    throw new Error(
      `[Config] Invalid rotor axis: ${ROTOR_CONFIG.defaultAxis}`
    );
  }

  if (
    !Array.isArray(
      ROTOR_CONFIG.nodeNamePatterns
    ) ||
    ROTOR_CONFIG
      .nodeNamePatterns
      .length === 0
  ) {
    throw new Error(
      '[Config] At least one rotor node name pattern is required.'
    );
  }

  for (
    const pattern of
    ROTOR_CONFIG.nodeNamePatterns
  ) {
    if (
      typeof pattern !==
        'string' ||
      pattern.trim() === ''
    ) {
      throw new Error(
        '[Config] Rotor node name patterns must be non-empty strings.'
      );
    }
  }

  if (
    !Array.isArray(
      ROTOR_CONFIG.rotationDirections
    ) ||
    ROTOR_CONFIG
      .rotationDirections
      .length === 0
  ) {
    throw new Error(
      '[Config] At least one rotor rotation direction is required.'
    );
  }

  for (
    const direction of
    ROTOR_CONFIG.rotationDirections
  ) {
    if (
      direction !== 1 &&
      direction !== -1
    ) {
      throw new Error(
        `[Config] Rotor rotation direction must be 1 or -1: ${direction}`
      );
    }
  }

  if (
    typeof ROTOR_CONFIG.stopImmediately !==
    'boolean'
  ) {
    throw new Error(
      '[Config] ROTOR_CONFIG.stopImmediately must be a boolean.'
    );
  }
}
