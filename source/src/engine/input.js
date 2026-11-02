// Keyboard + mouse (pointer lock) + gamepad input with action mapping.
export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.pressed = new Set();   // edge-triggered this frame
    this.mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0 };
    this.sensitivity = 1.0;
    this.invertY = false;
    this.locked = false;
    this.enabled = true;
    this.virtual = null; // automated test driver may inject state
    this.gp = { lx: 0, ly: 0, rx: 0, ry: 0, prev: [] };
    addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) this.mouse.right = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouse.dx += e.movementX; this.mouse.dy += e.movementY;
    });
    addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.el; });
  }

  requestLock() { if (!this.locked && this.el.requestPointerLock) { try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } } }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }

  // Polled per frame by the game: returns a normalized action state.
  poll() {
    const s = {
      moveX: 0, moveY: 0, lookX: 0, lookY: 0, run: false, aim: false, fire: false, firePressed: false,
      reload: false, interact: false, inventory: false, pause: false, quickTurn: false, weaponNext: false,
      weapon1: false, weapon2: false, map: false, flashlight: false,
    };
    if (this.enabled) {
      if (this.down('KeyW') || this.down('ArrowUp')) s.moveY += 1;
      if (this.down('KeyS') || this.down('ArrowDown')) s.moveY -= 1;
      if (this.down('KeyA') || this.down('ArrowLeft')) s.moveX -= 1;
      if (this.down('KeyD') || this.down('ArrowRight')) s.moveX += 1;
      s.run = this.down('ShiftLeft') || this.down('ShiftRight');
      s.aim = this.mouse.right || this.down('KeyK');
      s.fire = this.mouse.left || this.down('KeyJ');
      s.firePressed = this.mouse.leftPressed || this.hit('KeyJ');
      s.reload = this.hit('KeyR');
      s.interact = this.hit('KeyE') || this.hit('Enter');
      s.inventory = this.hit('Tab') || this.hit('KeyI');
      s.pause = this.hit('Escape') || this.hit('KeyP');
      s.quickTurn = this.hit('KeyQ');
      s.weapon1 = this.hit('Digit1'); s.weapon2 = this.hit('Digit2');
      s.weaponNext = this.mouse.wheel !== 0;
      s.map = this.hit('KeyM');
      s.flashlight = this.hit('KeyF');
      const k = 0.0022 * this.sensitivity;
      s.lookX = this.mouse.dx * k; s.lookY = this.mouse.dy * k * (this.invertY ? -1 : 1);
      this.pollGamepad(s);
    }
    if (this.virtual) Object.assign(s, this.virtual(s));
    this.mouse.dx = this.mouse.dy = 0; this.mouse.wheel = 0; this.mouse.leftPressed = false;
    this.pressed.clear();
    return s;
  }

  pollGamepad(s) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find((x) => x && x.connected);
    if (!p) return;
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const edge = (i) => b(i) && !this.gp.prev[i];
    s.moveX += dz(p.axes[0]); s.moveY -= dz(p.axes[1]);
    s.lookX += dz(p.axes[2]) * 0.05 * this.sensitivity; s.lookY += dz(p.axes[3]) * 0.04 * this.sensitivity * (this.invertY ? -1 : 1);
    s.aim = s.aim || b(6); s.fire = s.fire || b(7); s.firePressed = s.firePressed || edge(7);
    s.run = s.run || b(10) || b(1) && !b(6);
    s.interact = s.interact || edge(0); s.reload = s.reload || edge(2); s.quickTurn = s.quickTurn || (edge(1) && false);
    s.inventory = s.inventory || edge(3); s.pause = s.pause || edge(9); s.map = s.map || edge(8);
    s.weaponNext = s.weaponNext || edge(4) || edge(5);
    this.gp.prev = p.buttons.map((x) => x.pressed);
  }
}
