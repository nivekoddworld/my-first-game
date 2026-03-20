export class TouchInput {
  constructor(inputState) {
    this.state = inputState;
    this.sensitivity = 0.005;

    this._leftTouch = null;
    this._rightTouch = null;
    this._leftCenter = { x: 0, y: 0 };
    this._rightCenter = { x: 0, y: 0 };

    this._setupJoysticks();
    this._setupButtons();
  }

  _setupJoysticks() {
    const leftZone = document.getElementById('left-joystick-zone');
    const rightZone = document.getElementById('right-joystick-zone');
    const leftKnob = document.getElementById('left-knob');
    const rightKnob = document.getElementById('right-knob');

    if (!leftZone || !rightZone) return;

    const onStart = (zone, isLeft, e) => {
      e.preventDefault();
      const rect = zone.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (isLeft) {
        this._leftTouch = touch.identifier;
        this._leftCenter = { x: cx, y: cy };
      } else {
        this._rightTouch = touch.identifier;
        this._rightCenter = { x: cx, y: cy };
      }
    };

    const onMove = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._leftTouch) {
          const dx = (touch.clientX - this._leftCenter.x) / 65;
          const dy = (touch.clientY - this._leftCenter.y) / 65;
          const len = Math.sqrt(dx*dx + dy*dy);
          const norm = len > 1 ? 1/len : 1;
          const nx = dx * norm, ny = dy * norm;
          const s = this.state;
          s.forward  = ny < -0.3;
          s.backward = ny > 0.3;
          s.left     = nx < -0.3;
          s.right    = nx > 0.3;
          // Move knob
          if (leftKnob) {
            leftKnob.style.transform = `translate(calc(-50% + ${Math.min(dx,1)*40}px), calc(-50% + ${Math.min(dy,1)*40}px))`;
          }
        }
        if (touch.identifier === this._rightTouch) {
          const dx = touch.clientX - this._rightCenter.x;
          const dy = touch.clientY - this._rightCenter.y;
          this.state.lookDX += dx * this.sensitivity;
          this.state.lookDY += dy * this.sensitivity;
          this._rightCenter = { x: touch.clientX, y: touch.clientY };
          if (rightKnob) {
            const rx = (touch.clientX - (document.getElementById('right-joystick-zone').getBoundingClientRect().left + 65));
            const ry = (touch.clientY - (document.getElementById('right-joystick-zone').getBoundingClientRect().top + 65));
            const len = Math.sqrt(rx*rx + ry*ry);
            const c = Math.min(len, 40) / (len || 1);
            rightKnob.style.transform = `translate(calc(-50% + ${rx*c}px), calc(-50% + ${ry*c}px))`;
          }
        }
      }
    };

    const onEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._leftTouch) {
          this._leftTouch = null;
          const s = this.state;
          s.forward = s.backward = s.left = s.right = false;
          if (leftKnob) leftKnob.style.transform = 'translate(-50%, -50%)';
        }
        if (touch.identifier === this._rightTouch) {
          this._rightTouch = null;
          if (rightKnob) rightKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    };

    leftZone.addEventListener('touchstart', (e) => onStart(leftZone, true, e), { passive: false });
    rightZone.addEventListener('touchstart', (e) => onStart(rightZone, false, e), { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
  }

  _setupButtons() {
    const btns = {
      'btn-jump':     () => { this.state.jump = true; this.state._jumpPressed = true; setTimeout(() => { this.state.jump = false; }, 100); },
      'btn-dodge':    () => { this.state._dodgePressed = true; },
      'btn-shoot':    () => { this.state.fire = true; setTimeout(() => { this.state.fire = false; }, 150); },
      'btn-reload':   () => { this.state._reloadPressed = true; },
      'btn-grapple':  () => { this.state._grapplePressed = true; },
      'btn-portal-b': () => { this.state.fire = true; setTimeout(() => { this.state.fire = false; }, 100); },
      'btn-portal-o': () => { this.state.altFire = true; setTimeout(() => { this.state.altFire = false; }, 100); },
      'btn-interact': () => { this.state._interactPressed = true; },
      'btn-sprint':   () => { this.state.sprint = !this.state.sprint; },
    };

    for (const [id, handler] of Object.entries(btns)) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); handler(); }, { passive: false });
      }
    }
  }
}
