export class KeyboardMouse {
  constructor(inputState, canvas) {
    this.state = inputState;
    this.canvas = canvas;
    this.locked = false;
    this.sensitivity = 0.002;

    this._keys = new Set();
    this._setupListeners();
  }

  _setupListeners() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('mousedown', (e) => this._onMouseDown(e));
    document.addEventListener('mouseup', (e) => this._onMouseUp(e));
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    this.canvas.addEventListener('click', () => {
      if (!this.locked) this.canvas.requestPointerLock();
    });
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Scroll for weapon switch
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e));
  }

  _onKeyDown(e) {
    this._keys.add(e.code);
    const s = this.state;

    switch (e.code) {
      case 'Space': s.jump = true; s._jumpPressed = true; break;
      case 'KeyR': s.reload = true; s._reloadPressed = true; break;
      case 'KeyB': s.rackBolt = true; s._rackPressed = true; break;
      case 'KeyT': s.clearJam = true; s._clearJamPressed = true; break;
      case 'KeyI': s._inspectPressed = true; break;
      case 'KeyF': s._interactPressed = true; break;
      case 'KeyG': s._grapplePressed = true; break;
      case 'KeyQ': s._dodgePressed = true; break;
      case 'KeyE': s._placePressed = true; break;
      case 'Digit1': s.weaponSlot = 0; break;
      case 'Digit2': s.weaponSlot = 1; break;
      case 'Digit3': s.weaponSlot = 2; break;
      case 'Digit4': s.weaponSlot = 3; break;
    }

    this._updateContinuous();
  }

  _onKeyUp(e) {
    this._keys.delete(e.code);
    const s = this.state;

    switch (e.code) {
      case 'Space': s.jump = false; break;
      case 'KeyR': s.reload = false; break;
      case 'KeyB': s.rackBolt = false; break;
      case 'KeyT': s.clearJam = false; break;
    }

    this._updateContinuous();
  }

  _updateContinuous() {
    const k = this._keys;
    const s = this.state;
    s.forward  = k.has('KeyW') || k.has('ArrowUp');
    s.backward = k.has('KeyS') || k.has('ArrowDown');
    s.left     = k.has('KeyA') || k.has('ArrowLeft');
    s.right    = k.has('KeyD') || k.has('ArrowRight');
    s.sprint   = k.has('ShiftLeft') || k.has('ShiftRight');
    s.crouch   = k.has('ControlLeft') || k.has('ControlRight') || k.has('KeyC');
  }

  _onMouseMove(e) {
    if (!this.locked) return;
    this.state.lookDX += e.movementX * this.sensitivity;
    this.state.lookDY += e.movementY * this.sensitivity;
  }

  _onMouseDown(e) {
    if (e.button === 0) this.state.fire = true;
    if (e.button === 2) this.state.altFire = true;
  }

  _onMouseUp(e) {
    if (e.button === 0) this.state.fire = false;
    if (e.button === 2) this.state.altFire = false;
  }

  _onWheel(e) {
    // Handled by Game to switch weapons
    this._lastWheel = e.deltaY;
  }

  getWheelDelta() {
    const v = this._lastWheel || 0;
    this._lastWheel = 0;
    return v;
  }
}
