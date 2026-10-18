// ===================================================================
// Input: keyboard, mouse (pointer lock with drag fallback), touch
// ===================================================================
const BINDS = {
  fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], crouch: ['ShiftLeft', 'ShiftRight', 'KeyC'], reload: ['KeyR'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], swap: ['KeyQ'], melee: ['KeyV'],
  score: ['Tab'], chat: ['Enter', 'KeyT'], classMenu: ['KeyB'], inspect: ['KeyF'],
};
const Input = {
  keys: new Set(), pressedKeys: new Set(), mouse: { dx: 0, dy: 0, b0: false, b2: false, p0: false, p2: false, wheel: 0 },
  locked: false, wantLock: false, enabled: false, typing: false, dragLook: false, canvas: null,
  touch: { active: false, mx: 0, mz: 0, lookDX: 0, lookDY: 0, fire: false, ads: false, jump: false, crouch: false, jumpP: false, reloadP: false, swapP: false },
  listeners: new Emitter(),
  init(canvas) {
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (this.typing) return;
      if (e.code === 'Tab' || (this.enabled && (e.code === 'Space' || e.code.startsWith('Arrow')))) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      this.listeners.emit('key', e.code, e);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.mouse.b0 = this.mouse.b2 = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked && this.wantLock) { this.requestLock(); }
      if (e.button === 0) { this.mouse.b0 = true; this.mouse.p0 = true; }
      if (e.button === 2) { this.mouse.b2 = true; this.mouse.p2 = true; }
      if (!this.locked) this.dragLook = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.b0 = false; if (e.button === 2) this.mouse.b2 = false; if (!this.locked) this.dragLook = false; });
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragLook) {
        // clamp spikes some browsers produce on lock changes
        const dx = clamp(e.movementX || 0, -300, 300), dy = clamp(e.movementY || 0, -300, 300);
        this.mouse.dx += dx; this.mouse.dy += dy;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.enabled) this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked) this.listeners.emit('unlock');
      if (!was && this.locked) this.listeners.emit('lock');
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; this.listeners.emit('lockerror'); });
  },
  requestLock() {
    if (!this.canvas || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => {
        try { const p2 = this.canvas.requestPointerLock(); if (p2 && p2.catch) p2.catch(() => this.listeners.emit('lockerror')); } catch (e) { this.listeners.emit('lockerror'); }
      });
    } catch (e) {
      try { this.canvas.requestPointerLock(); } catch (e2) { this.listeners.emit('lockerror'); }
    }
  },
  exitLock() { if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* ignore */ } } },
  down(action) { const b = BINDS[action]; if (!b) return false; for (const k of b) if (this.keys.has(k)) return true; return false; },
  pressed(action) { const b = BINDS[action]; if (!b) return false; for (const k of b) if (this.pressedKeys.has(k)) return true; return false; },
  endFrame() {
    this.pressedKeys.clear();
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.p0 = false; this.mouse.p2 = false; this.mouse.wheel = 0;
    const t = this.touch; t.lookDX = 0; t.lookDY = 0; t.jumpP = false; t.reloadP = false; t.swapP = false;
  },
  clearAll() { this.keys.clear(); this.pressedKeys.clear(); this.mouse.b0 = this.mouse.b2 = false; },
};

// --- on-screen touch controls -------------------------------------------
const Touch = {
  root: null, stick: null, knob: null, stickId: null, lookId: null, lastLook: null, origin: null,
  init(root) {
    this.root = root;
    root.hidden = false;
    this.stick = $('#tc-stick', root); this.knob = $('#tc-knob', root);
    const t = Input.touch;
    const zoneL = $('#tc-left', root), zoneR = $('#tc-right', root);
    zoneL.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const tt = e.changedTouches[0];
      this.stickId = tt.identifier; this.origin = [tt.clientX, tt.clientY];
      this.stick.style.left = tt.clientX + 'px'; this.stick.style.top = tt.clientY + 'px'; this.stick.hidden = false;
      t.active = true;
    }, { passive: false });
    const moveStick = (e) => {
      for (const tt of e.changedTouches) {
        if (tt.identifier === this.stickId) {
          const dx = tt.clientX - this.origin[0], dy = tt.clientY - this.origin[1];
          const L = Math.hypot(dx, dy), R0 = 55, k = L > R0 ? R0 / L : 1;
          this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
          t.mx = clamp(dx / R0, -1, 1); t.mz = clamp(-dy / R0, -1, 1);
          t.crouch = false;
        }
        if (tt.identifier === this.lookId) {
          t.lookDX += (tt.clientX - this.lastLook[0]) * 2.2; t.lookDY += (tt.clientY - this.lastLook[1]) * 2.2;
          this.lastLook = [tt.clientX, tt.clientY];
        }
      }
    };
    const endTouch = (e) => {
      for (const tt of e.changedTouches) {
        if (tt.identifier === this.stickId) { this.stickId = null; t.mx = 0; t.mz = 0; this.stick.hidden = true; this.knob.style.transform = ''; }
        if (tt.identifier === this.lookId) { this.lookId = null; }
      }
    };
    zoneR.addEventListener('touchstart', (e) => { e.preventDefault(); const tt = e.changedTouches[0]; this.lookId = tt.identifier; this.lastLook = [tt.clientX, tt.clientY]; t.active = true; }, { passive: false });
    root.addEventListener('touchmove', (e) => { e.preventDefault(); moveStick(e); }, { passive: false });
    root.addEventListener('touchend', endTouch); root.addEventListener('touchcancel', endTouch);
    const btn = (id, onDown, onUp) => {
      const b = $(id, root);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); onDown(); const tt = e.changedTouches[0]; if (id === '#tc-fire') { this.lookId = tt.identifier; this.lastLook = [tt.clientX, tt.clientY]; } }, { passive: false });
      b.addEventListener('touchend', (e) => { e.preventDefault(); b.classList.remove('on'); if (onUp) onUp(); }, { passive: false });
      b.addEventListener('touchmove', (e) => { e.preventDefault(); moveStick(e); }, { passive: false });
    };
    btn('#tc-fire', () => { t.fire = true; }, () => { t.fire = false; });
    btn('#tc-ads', () => { t.ads = !t.ads; $('#tc-ads', root).classList.toggle('lit', t.ads); });
    btn('#tc-jump', () => { t.jump = true; t.jumpP = true; }, () => { t.jump = false; });
    btn('#tc-crouch', () => { t.crouch = true; }, () => { t.crouch = false; });
    btn('#tc-reload', () => { t.reloadP = true; });
    btn('#tc-swap', () => { t.swapP = true; });
  },
};
