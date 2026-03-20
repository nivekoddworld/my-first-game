// Unified input state - consumed by all systems
export class InputState {
  constructor() {
    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.crouch = false;
    this.sprint = false;
    this.fire = false;       // primary fire / portal blue
    this.altFire = false;    // ADS / portal orange
    this.reload = false;
    this.rackBolt = false;
    this.clearJam = false;
    this.inspect = false;
    this.interact = false;
    this.grapple = false;
    this.dodge = false;
    this.placeBlock = false;

    // Look delta (combined from mouse + touch)
    this.lookDX = 0;
    this.lookDY = 0;

    // Weapon slot request (0-3, -1 = no change)
    this.weaponSlot = -1;

    // One-shot events (consumed after reading)
    this._jumpPressed = false;
    this._reloadPressed = false;
    this._rackPressed = false;
    this._clearJamPressed = false;
    this._inspectPressed = false;
    this._interactPressed = false;
    this._grapplePressed = false;
    this._dodgePressed = false;
    this._placePressed = false;
  }

  consumeJump() { const v = this._jumpPressed; this._jumpPressed = false; return v; }
  consumeReload() { const v = this._reloadPressed; this._reloadPressed = false; return v; }
  consumeRack() { const v = this._rackPressed; this._rackPressed = false; return v; }
  consumeClearJam() { const v = this._clearJamPressed; this._clearJamPressed = false; return v; }
  consumeInspect() { const v = this._inspectPressed; this._inspectPressed = false; return v; }
  consumeInteract() { const v = this._interactPressed; this._interactPressed = false; return v; }
  consumeGrapple() { const v = this._grapplePressed; this._grapplePressed = false; return v; }
  consumeDodge() { const v = this._dodgePressed; this._dodgePressed = false; return v; }
  consumePlace() { const v = this._placePressed; this._placePressed = false; return v; }

  clearLook() {
    this.lookDX = 0;
    this.lookDY = 0;
  }
}
