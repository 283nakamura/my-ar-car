/**
 * Dream On AirTaxi Player
 * Rotor Manager
 *
 * @file js/rotor-manager.js
 * @description
 * A-Frame上のGLTF機体モデルからプロペラ／ローターのノードを検出し、
 * 回転開始、停止、速度変更、回転方向の管理を行います。
 *
 * RotorManagerはシーン遷移、映像再生、UI制御を行いません。
 */

import {
  APP_CONFIG,
  DEBUG_CONFIG,
  DOM_IDS,
  EVENTS,
  ROTOR_CONFIG,
} from './config.js';


/**
 * RotorManager
 *
 * @example
 * const eventBus = new EventTarget();
 *
 * const rotorManager = new RotorManager({
 *   eventBus,
 * });
 *
 * rotorManager.init();
 * rotorManager.start(20);
 */
export class RotorManager {
  /**
   * @param {Object} options
   * @param {EventTarget} options.eventBus
   */
  constructor({ eventBus } = {}) {
    if (!(eventBus instanceof EventTarget)) {
      throw new TypeError(
        '[RotorManager] eventBus must be an instance of EventTarget.'
      );
    }

    this.eventBus = eventBus;

    this.elements = Object.create(null);
    this.listeners = [];

    /**
     * 検出されたローターノード情報です。
     *
     * @type {Array<{
     *   object: THREE.Object3D,
     *   name: string,
     *   axis: string,
     *   direction: number,
     *   initialRotation: {x: number, y: number, z: number}
     * }>}
     */
    this.rotors = [];

    this.animationFrameId = null;
    this.lastFrameTime = null;

    this.currentSpeed = 0;
    this.targetSpeed = 0;

    this.isInitialized = false;
    this.isDestroyed = false;
    this.isModelReady = false;
    this.isRunning = false;
    this.isPaused = false;

    this.modelLoadTimeoutId = null;

    this._handleModelLoaded =
      this._handleModelLoaded.bind(this);

    this._handleModelError =
      this._handleModelError.bind(this);

    this._handleRotorStartEvent =
      this._handleRotorStartEvent.bind(this);

    this._handleRotorStopEvent =
      this._handleRotorStopEvent.bind(this);

    this._handleRotorSpeedChangeEvent =
      this._handleRotorSpeedChangeEvent.bind(this);

    this._animationLoop =
      this._animationLoop.bind(this);
  }


  /* ==========================================================================
     Lifecycle
     ========================================================================== */

  /**
   * RotorManagerを初期化します。
   *
   * 機体モデルがすでに読み込まれている場合は即座にローターを検出し、
   * まだの場合はmodel-loadedイベントを待機します。
   *
   * @returns {RotorManager}
   */
  init() {
    if (this.isDestroyed) {
      throw new Error(
        '[RotorManager] Cannot initialize a destroyed instance.'
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

    this.isInitialized = true;

    this._prepareModel();

    this._debug('Initialized.');

    return this;
  }


  /**
   * アニメーション、タイマー、イベントリスナーを破棄します。
   */
  destroy() {
    this._stopAnimationLoop();
    this._clearModelLoadTimeout();

    for (const listener of this.listeners) {
      listener.target.removeEventListener(
        listener.type,
        listener.handler,
        listener.options
      );
    }

    this.listeners = [];

    this.rotors = [];
    this.elements = Object.create(null);

    this.currentSpeed = 0;
    this.targetSpeed = 0;

    this.isInitialized = false;
    this.isDestroyed = true;
    this.isModelReady = false;
    this.isRunning = false;
    this.isPaused = false;

    this.lastFrameTime = null;

    this._debug('Destroyed.');
  }


  /* ==========================================================================
     Public rotor control
     ========================================================================== */

  /**
   * ローター回転を開始します。
   *
   * @param {number} [speed=ROTOR_CONFIG.defaultSpeed]
   * @returns {number} 適用された速度
   */
  start(speed = ROTOR_CONFIG.defaultSpeed) {
    this._assertReady();

    if (!this.isModelReady) {
      this._emitError(
        'Rotor model is not ready.',
        {
          requestedSpeed: speed,
        }
      );

      return this.currentSpeed;
    }

    if (this.rotors.length === 0) {
      this._emitError(
        'No rotor nodes were detected in the aircraft model.'
      );

      return this.currentSpeed;
    }

    const normalizedSpeed =
      this._normalizeSpeed(
        speed,
        ROTOR_CONFIG.defaultSpeed
      );

    this.currentSpeed = normalizedSpeed;
    this.targetSpeed = normalizedSpeed;

    this.isRunning = normalizedSpeed > 0;
    this.isPaused = false;

    if (this.isRunning) {
      this._startAnimationLoop();
    } else {
      this._stopAnimationLoop();
    }

    this._emit(EVENTS.ROTOR_STARTED, {
      speed: this.currentSpeed,
      rotorCount: this.rotors.length,
    });

    this._debug(
      'Rotor started:',
      this.currentSpeed
    );

    return this.currentSpeed;
  }


  /**
   * ローター回転を停止します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.immediate=ROTOR_CONFIG.stopImmediately]
   */
  stop({
    immediate = ROTOR_CONFIG.stopImmediately,
  } = {}) {
    this._assertReady();

    if (immediate) {
      this.currentSpeed = 0;
      this.targetSpeed = 0;

      this.isRunning = false;
      this.isPaused = false;

      this._stopAnimationLoop();

      this._emit(EVENTS.ROTOR_STOPPED, {
        speed: 0,
        immediate: true,
      });

      this._debug('Rotor stopped immediately.');

      return;
    }

    /*
     * 将来的に緩やかな減速処理を行えるよう、
     * targetSpeedのみを0へ変更します。
     */
    this.targetSpeed = 0;

    if (!this.isRunning) {
      this.currentSpeed = 0;
      this._stopAnimationLoop();

      this._emit(EVENTS.ROTOR_STOPPED, {
        speed: 0,
        immediate: false,
      });
    }

    this._debug('Rotor deceleration requested.');
  }


  /**
   * ローター速度を変更します。
   *
   * @param {number} speed
   * @returns {number} 適用された速度
   */
  setSpeed(speed) {
    this._assertReady();

    const normalizedSpeed =
      this._normalizeSpeed(
        speed,
        this.currentSpeed
      );

    const previousSpeed = this.currentSpeed;

    this.currentSpeed = normalizedSpeed;
    this.targetSpeed = normalizedSpeed;

    if (normalizedSpeed > 0) {
      this.isRunning = true;
      this.isPaused = false;

      if (
        this.isModelReady &&
        this.rotors.length > 0
      ) {
        this._startAnimationLoop();
      }
    } else {
      this.isRunning = false;
      this.isPaused = false;

      this._stopAnimationLoop();
    }

    this._emit(EVENTS.ROTOR_SPEED_CHANGE, {
      previousSpeed,
      speed: normalizedSpeed,
      rotorCount: this.rotors.length,
    });

    if (
      normalizedSpeed === 0 &&
      previousSpeed > 0
    ) {
      this._emit(EVENTS.ROTOR_STOPPED, {
        speed: 0,
        immediate: true,
      });
    }

    this._debug(
      'Rotor speed changed:',
      previousSpeed,
      '->',
      normalizedSpeed
    );

    return normalizedSpeed;
  }


  /**
   * ローター回転を一時停止します。
   *
   * 現在の速度は保持します。
   */
  pause() {
    this._assertReady();

    if (
      !this.isRunning ||
      this.isPaused
    ) {
      return;
    }

    this.isPaused = true;
    this._stopAnimationLoop();

    this._debug(
      'Rotor paused:',
      this.currentSpeed
    );
  }


  /**
   * 一時停止したローター回転を再開します。
   */
  resume() {
    this._assertReady();

    if (
      !this.isPaused ||
      this.currentSpeed <= 0 ||
      !this.isModelReady ||
      this.rotors.length === 0
    ) {
      return;
    }

    this.isPaused = false;
    this.isRunning = true;

    this._startAnimationLoop();

    this._debug(
      'Rotor resumed:',
      this.currentSpeed
    );
  }


  /**
   * ローターを初期回転角へ戻します。
   *
   * @param {Object} [options]
   * @param {boolean} [options.stop=true]
   */
  reset({
    stop = true,
  } = {}) {
    this._assertReady();

    if (stop) {
      this.currentSpeed = 0;
      this.targetSpeed = 0;

      this.isRunning = false;
      this.isPaused = false;

      this._stopAnimationLoop();
    }

    for (const rotor of this.rotors) {
      rotor.object.rotation.set(
        rotor.initialRotation.x,
        rotor.initialRotation.y,
        rotor.initialRotation.z
      );
    }

    this.lastFrameTime = null;

    this._debug('Rotor reset.');
  }


  /**
   * 機体モデルからローターを再検出します。
   *
   * GLTFモデルを差し替えた場合などに使用します。
   *
   * @returns {number} 検出されたローター数
   */
  refreshRotors() {
    this._assertReady();

    const model = this._getModelObject();

    if (!model) {
      this.rotors = [];
      this.isModelReady = false;

      this._emitError(
        'Aircraft model object is not available.'
      );

      return 0;
    }

    this._detectRotors(model);

    return this.rotors.length;
  }


  /* ==========================================================================
     Public getters
     ========================================================================== */

  /**
   * 現在の速度を返します。
   *
   * @returns {number}
   */
  getSpeed() {
    return this.currentSpeed;
  }


  /**
   * 検出されたローター数を返します。
   *
   * @returns {number}
   */
  getRotorCount() {
    return this.rotors.length;
  }


  /**
   * ローターが回転中か返します。
   *
   * @returns {boolean}
   */
  getRunningState() {
    return (
      this.isRunning &&
      !this.isPaused &&
      this.currentSpeed > 0
    );
  }


  /**
   * ローターが一時停止中か返します。
   *
   * @returns {boolean}
   */
  getPausedState() {
    return this.isPaused;
  }


  /**
   * 機体モデルが利用可能か返します。
   *
   * @returns {boolean}
   */
  getModelReadyState() {
    return this.isModelReady;
  }


  /**
   * 検出されたローター情報を返します。
   *
   * Three.jsオブジェクトそのものは外部で変更しないでください。
   *
   * @returns {ReadonlyArray<Object>}
   */
  getRotorInfo() {
    return this.rotors.map(
      rotor => Object.freeze({
        name: rotor.name,
        axis: rotor.axis,
        direction: rotor.direction,
      })
    );
  }


  /* ==========================================================================
     DOM and model initialization
     ========================================================================== */

  /**
   * 必要なDOM要素を取得します。
   *
   * @private
   */
  _cacheElements() {
    this.elements.aircraftModel =
      document.getElementById(
        DOM_IDS.aircraftModel
      );
  }


  /**
   * 必須DOM要素を検証します。
   *
   * @private
   */
  _validateRequiredElements() {
    if (!this.elements.aircraftModel) {
      throw new Error(
        `[RotorManager] Missing required DOM element: ${DOM_IDS.aircraftModel}`
      );
    }
  }


  /**
   * モデル読み込み状態を確認します。
   *
   * @private
   */
  _prepareModel() {
    const model = this._getModelObject();

    if (model) {
      this._handleModelReady(model);
      return;
    }

    this._startModelLoadTimeout();

    this._debug(
      'Waiting for model-loaded event.'
    );
  }


  /**
   * A-FrameエンティティからGLTFモデルオブジェクトを取得します。
   *
   * @returns {THREE.Object3D|null}
   * @private
   */
  _getModelObject() {
    const entity =
      this.elements.aircraftModel;

    if (!entity) {
      return null;
    }

    if (
      typeof entity.getObject3D === 'function'
    ) {
      return (
        entity.getObject3D('mesh') ||
        entity.getObject3D('model') ||
        null
      );
    }

    return null;
  }


  /**
   * モデル準備完了処理です。
   *
   * @param {THREE.Object3D} model
   * @private
   */
  _handleModelReady(model) {
    this._clearModelLoadTimeout();

    this.isModelReady = true;

    this._detectRotors(model);

    this._emit(EVENTS.ROTOR_READY, {
      rotorCount: this.rotors.length,
      rotorNames: this.rotors.map(
        rotor => rotor.name
      ),
    });

    this._debug(
      'Model ready. Rotor count:',
      this.rotors.length
    );
  }


  /* ==========================================================================
     Rotor detection
     ========================================================================== */

  /**
   * GLTFモデル内からローターノードを検出します。
   *
   * @param {THREE.Object3D} model
   * @private
   */
  _detectRotors(model) {
    this.rotors = [];

    if (
      !model ||
      typeof model.traverse !== 'function'
    ) {
      this._emitError(
        'Invalid aircraft model object.'
      );

      return;
    }

    const candidates = [];

    model.traverse(object => {
      if (!object) {
        return;
      }

      const name =
        typeof object.name === 'string'
          ? object.name.trim()
          : '';

      if (!name) {
        return;
      }

      if (!this._matchesRotorName(name)) {
        return;
      }

      /*
       * GroupやObject3Dとしてプロペラが構成されている場合もあるため、
       * Meshだけに限定しません。
       */
      candidates.push(object);
    });

    const uniqueCandidates =
      this._removeNestedDuplicates(candidates);

    uniqueCandidates.forEach(
      (object, index) => {
        const direction =
          this._resolveDirection(index);

        const axis =
          this._resolveAxis(object);

        this.rotors.push({
          object,
          name:
            object.name ||
            `rotor-${index + 1}`,
          axis,
          direction,
          initialRotation: {
            x: object.rotation.x,
            y: object.rotation.y,
            z: object.rotation.z,
          },
        });
      }
    );

    if (this.rotors.length === 0) {
      this._emitError(
        'No rotor nodes matched the configured name patterns.',
        {
          patterns:
            ROTOR_CONFIG.nodeNamePatterns,
        }
      );
    } else {
      this._debug(
        'Detected rotor nodes:',
        this.rotors.map(
          rotor => ({
            name: rotor.name,
            axis: rotor.axis,
            direction: rotor.direction,
          })
        )
      );
    }
  }


  /**
   * ノード名がローターパターンに一致するか確認します。
   *
   * @param {string} objectName
   * @returns {boolean}
   * @private
   */
  _matchesRotorName(objectName) {
    const normalizedName =
      objectName.toLowerCase();

    return ROTOR_CONFIG.nodeNamePatterns.some(
      pattern =>
        normalizedName.includes(
          pattern.toLowerCase()
        )
    );
  }


  /**
   * 親子双方がローター名に一致した場合、
   * 親側だけを残して二重回転を防止します。
   *
   * @param {THREE.Object3D[]} candidates
   * @returns {THREE.Object3D[]}
   * @private
   */
  _removeNestedDuplicates(candidates) {
    const candidateSet =
      new Set(candidates);

    return candidates.filter(candidate => {
      let parent = candidate.parent;

      while (parent) {
        if (candidateSet.has(parent)) {
          return false;
        }

        parent = parent.parent;
      }

      return true;
    });
  }


  /**
   * ローターの回転方向を決定します。
   *
   * @param {number} index
   * @returns {number}
   * @private
   */
  _resolveDirection(index) {
    const directions =
      ROTOR_CONFIG.rotationDirections;

    if (directions.length === 0) {
      return 1;
    }

    return directions[
      index % directions.length
    ];
  }


  /**
   * 回転軸を決定します。
   *
   * 現在はconfig.jsのdefaultAxisを使用します。
   * GLTFノードごとのuserData.rotorAxisにx/y/zが設定されている場合は、
   * その値を優先します。
   *
   * @param {THREE.Object3D} object
   * @returns {'x'|'y'|'z'}
   * @private
   */
  _resolveAxis(object) {
    const configuredAxis =
      object?.userData?.rotorAxis;

    if (
      configuredAxis === 'x' ||
      configuredAxis === 'y' ||
      configuredAxis === 'z'
    ) {
      return configuredAxis;
    }

    return ROTOR_CONFIG.defaultAxis;
  }


  /* ==========================================================================
     Animation
     ========================================================================== */

  /**
   * アニメーションループを開始します。
   *
   * @private
   */
  _startAnimationLoop() {
    if (
      this.animationFrameId !== null ||
      !this.isRunning ||
      this.isPaused
    ) {
      return;
    }

    this.lastFrameTime = null;

    this.animationFrameId =
      window.requestAnimationFrame(
        this._animationLoop
      );
  }


  /**
   * アニメーションループを停止します。
   *
   * @private
   */
  _stopAnimationLoop() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(
        this.animationFrameId
      );

      this.animationFrameId = null;
    }

    this.lastFrameTime = null;
  }


  /**
   * ローターアニメーションを更新します。
   *
   * @param {DOMHighResTimeStamp} timestamp
   * @private
   */
  _animationLoop(timestamp) {
    this.animationFrameId = null;

    if (
      !this.isRunning ||
      this.isPaused ||
      this.currentSpeed <= 0 ||
      !this.isModelReady ||
      this.rotors.length === 0
    ) {
      return;
    }

    if (this.lastFrameTime === null) {
      this.lastFrameTime = timestamp;
    }

    const deltaSeconds = Math.min(
      Math.max(
        (timestamp - this.lastFrameTime) /
          1000,
        0
      ),
      0.1
    );

    this.lastFrameTime = timestamp;

    this._updateSpeed(deltaSeconds);
    this._rotateRotors(deltaSeconds);

    if (this.currentSpeed <= 0) {
      this.currentSpeed = 0;
      this.targetSpeed = 0;
      this.isRunning = false;

      this._emit(EVENTS.ROTOR_STOPPED, {
        speed: 0,
        immediate: false,
      });

      return;
    }

    this.animationFrameId =
      window.requestAnimationFrame(
        this._animationLoop
      );
  }


  /**
   * 現在速度を目標速度へ近づけます。
   *
   * stop({ immediate:false })用の簡易減速処理です。
   *
   * @param {number} deltaSeconds
   * @private
   */
  _updateSpeed(deltaSeconds) {
    if (
      this.currentSpeed ===
      this.targetSpeed
    ) {
      return;
    }

    const decelerationPerSecond =
      ROTOR_CONFIG.maximumSpeed;

    const difference =
      this.targetSpeed -
      this.currentSpeed;

    const maximumChange =
      decelerationPerSecond *
      deltaSeconds;

    if (
      Math.abs(difference) <=
      maximumChange
    ) {
      this.currentSpeed =
        this.targetSpeed;

      return;
    }

    this.currentSpeed +=
      Math.sign(difference) *
      maximumChange;
  }


  /**
   * 各ローターを回転させます。
   *
   * speedは「1秒当たりのラジアン量」として扱います。
   *
   * @param {number} deltaSeconds
   * @private
   */
  _rotateRotors(deltaSeconds) {
    const rotationAmount =
      this.currentSpeed *
      deltaSeconds;

    for (const rotor of this.rotors) {
      const delta =
        rotationAmount *
        rotor.direction;

      switch (rotor.axis) {
        case 'x':
          rotor.object.rotation.x += delta;
          break;

        case 'z':
          rotor.object.rotation.z += delta;
          break;

        case 'y':
        default:
          rotor.object.rotation.y += delta;
          break;
      }

      this._normalizeRotation(
        rotor.object.rotation,
        rotor.axis
      );
    }
  }


  /**
   * 回転値が極端に大きくなるのを防ぎます。
   *
   * @param {THREE.Euler} rotation
   * @param {'x'|'y'|'z'} axis
   * @private
   */
  _normalizeRotation(rotation, axis) {
    const fullRotation =
      Math.PI * 2;

    if (
      Math.abs(rotation[axis]) >
      fullRotation * 1000
    ) {
      rotation[axis] %=
        fullRotation;
    }
  }


  /* ==========================================================================
     A-Frame model events
     ========================================================================== */

  /**
   * model-loadedイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleModelLoaded(event) {
    try {
      const model =
        event?.detail?.model ||
        this._getModelObject();

      if (!model) {
        throw new Error(
          'Loaded model object was not found.'
        );
      }

      this._handleModelReady(model);
    } catch (error) {
      this._emitError(
        'Failed to initialize rotors after model loading.',
        {
          error,
        }
      );
    }
  }


  /**
   * model-errorイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleModelError(event) {
    this._clearModelLoadTimeout();

    this.isModelReady = false;
    this.rotors = [];

    this._emitError(
      'Aircraft model failed to load.',
      {
        detail: event?.detail ?? null,
      }
    );
  }


  /**
   * モデル読み込みタイムアウトを開始します。
   *
   * @private
   */
  _startModelLoadTimeout() {
    this._clearModelLoadTimeout();

    this.modelLoadTimeoutId =
      window.setTimeout(
        () => {
          this.modelLoadTimeoutId = null;

          if (this.isModelReady) {
            return;
          }

          this._emitError(
            'Aircraft model loading timed out.',
            {
              timeoutMs:
                APP_CONFIG.modelLoadTimeoutMs,
            }
          );
        },
        APP_CONFIG.modelLoadTimeoutMs
      );
  }


  /**
   * モデル読み込みタイムアウトを解除します。
   *
   * @private
   */
  _clearModelLoadTimeout() {
    if (
      this.modelLoadTimeoutId !== null
    ) {
      window.clearTimeout(
        this.modelLoadTimeoutId
      );

      this.modelLoadTimeoutId = null;
    }
  }


  /* ==========================================================================
     Event bus listeners
     ========================================================================== */

  /**
   * DOMおよびeventBusのイベントを登録します。
   *
   * @private
   */
  _registerEventListeners() {
    this._addListener(
      this.elements.aircraftModel,
      'model-loaded',
      this._handleModelLoaded
    );

    this._addListener(
      this.elements.aircraftModel,
      'model-error',
      this._handleModelError
    );

    this._addListener(
      this.eventBus,
      EVENTS.ROTOR_START,
      this._handleRotorStartEvent
    );

    this._addListener(
      this.eventBus,
      EVENTS.ROTOR_STOP,
      this._handleRotorStopEvent
    );

    this._addListener(
      this.eventBus,
      EVENTS.ROTOR_SPEED_CHANGE,
      this._handleRotorSpeedChangeEvent
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
   * rotor:startイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleRotorStartEvent(event) {
    const detail =
      event?.detail ?? {};

    try {
      this.start(
        detail.speed ??
        ROTOR_CONFIG.defaultSpeed
      );
    } catch (error) {
      this._emitError(
        'Failed to start rotors.',
        {
          error,
          detail,
        }
      );
    }
  }


  /**
   * rotor:stopイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleRotorStopEvent(event) {
    const detail =
      event?.detail ?? {};

    try {
      this.stop({
        immediate:
          detail.immediate ??
          ROTOR_CONFIG.stopImmediately,
      });
    } catch (error) {
      this._emitError(
        'Failed to stop rotors.',
        {
          error,
          detail,
        }
      );
    }
  }


  /**
   * rotor:speed-changeイベントを処理します。
   *
   * @param {CustomEvent} event
   * @private
   */
  _handleRotorSpeedChangeEvent(event) {
    const detail =
      event?.detail ?? {};

    if (
      typeof detail.speed !== 'number'
    ) {
      this._emitError(
        'ROTOR_SPEED_CHANGE event requires speed.',
        {
          detail,
        }
      );

      return;
    }

    try {
      this.setSpeed(detail.speed);
    } catch (error) {
      this._emitError(
        'Failed to change rotor speed.',
        {
          error,
          detail,
        }
      );
    }
  }


  /* ==========================================================================
     Value normalization
     ========================================================================== */

  /**
   * ローター速度を設定範囲内へ正規化します。
   *
   * @param {*} speed
   * @param {number} fallback
   * @returns {number}
   * @private
   */
  _normalizeSpeed(speed, fallback) {
    if (
      typeof speed !== 'number' ||
      !Number.isFinite(speed)
    ) {
      return fallback;
    }

    return Math.min(
      Math.max(
        speed,
        ROTOR_CONFIG.minimumSpeed
      ),
      ROTOR_CONFIG.maximumSpeed
    );
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
   * RotorManagerのエラーイベントを発行します。
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
      '[RotorManager]',
      message,
      context
    );

    this._emit(EVENTS.ROTOR_ERROR, {
      source: 'rotor-manager',
      message,
      error,
      context,
    });
  }


  /* ==========================================================================
     General helpers
     ========================================================================== */

  /**
   * RotorManagerが使用可能な状態か検証します。
   *
   * @private
   */
  _assertReady() {
    if (this.isDestroyed) {
      throw new Error(
        '[RotorManager] This instance has been destroyed.'
      );
    }

    if (!this.isInitialized) {
      throw new Error(
        '[RotorManager] init() must be called before using this method.'
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
      (
        !DEBUG_CONFIG.enableVerboseLogging &&
        !DEBUG_CONFIG.enableRotorLogging
      )
    ) {
      return;
    }

    console.debug(
      '[RotorManager]',
      ...args
    );
  }
}


export default RotorManager;
