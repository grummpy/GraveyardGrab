/** Keyboard codes and gamepad snapshots → player actions. No DOM. */

export const ACTIONS = ["up", "down", "left", "right", "action", "secondary"];

export const DEFAULT_BINDS = [
  { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", action: "KeyF", secondary: "KeyG" },
  { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", action: "Slash", secondary: "Period" },
  { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", action: "Semicolon", secondary: "Quote" },
  { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", action: "Numpad0", secondary: "NumpadEnter" },
];

export const DEADZONE = 0.28;

export function cloneBinds(binds = DEFAULT_BINDS) {
  return binds.map((row) => ({ ...row }));
}

export function sanitizeBinds(saved, defaults = DEFAULT_BINDS) {
  return defaults.map((def, i) => {
    const row = saved?.[i] ?? saved?.[String(i)] ?? {};
    const out = { ...def };
    for (const key of ACTIONS) {
      const value = row[key];
      if (typeof value === "string" && value.length > 0 && value.length < 32 && value !== "Escape") {
        out[key] = value;
      }
    }
    return out;
  });
}

function has(codes, code) {
  if (!codes || !code) return false;
  if (typeof codes.has === "function") return codes.has(code);
  return !!codes[code];
}

export function keyboardActions(codesDown, binds = DEFAULT_BINDS) {
  return binds.map((b) => {
    const right = has(codesDown, b.right);
    const left = has(codesDown, b.left);
    const down = has(codesDown, b.down);
    const up = has(codesDown, b.up);
    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
      action: has(codesDown, b.action),
      secondary: has(codesDown, b.secondary),
      fromPad: false,
    };
  });
}

function buttonPressed(buttons, index) {
  const btn = buttons?.[index];
  if (!btn) return false;
  if (typeof btn === "boolean") return btn;
  if (typeof btn === "number") return btn > 0.5;
  return !!(btn.pressed || btn.value > 0.5);
}

/**
 * Standard Gamepad mapping: left stick axes 0/1, A=0, B=1, Start=9, D-pad 12-15.
 * Accepts a browser Gamepad or a plain mock with the same shape.
 * Returns null when the pad is missing or disconnected.
 */
export function padActions(pad) {
  if (!pad || pad.connected === false) return null;
  const axes = pad.axes || [];
  let ax = Number(axes[0]) || 0;
  let ay = Number(axes[1]) || 0;
  if (Math.abs(ax) < DEADZONE) ax = 0;
  if (Math.abs(ay) < DEADZONE) ay = 0;
  ax = Math.max(-1, Math.min(1, ax));
  ay = Math.max(-1, Math.min(1, ay));

  const buttons = pad.buttons || [];
  const dUp = buttonPressed(buttons, 12);
  const dDown = buttonPressed(buttons, 13);
  const dLeft = buttonPressed(buttons, 14);
  const dRight = buttonPressed(buttons, 15);
  if (dLeft || dRight) ax = (dRight ? 1 : 0) - (dLeft ? 1 : 0);
  if (dUp || dDown) ay = (dDown ? 1 : 0) - (dUp ? 1 : 0);

  return {
    x: ax,
    y: ay,
    action: buttonPressed(buttons, 0),
    secondary: buttonPressed(buttons, 1),
    start: buttonPressed(buttons, 9),
    connected: true,
    fromPad: true,
  };
}

/**
 * Connected pads replace that seat's keyboard. A null or disconnected pad
 * leaves the keyboard binding in charge, so unplugging restores keys immediately.
 * `pads[i]` may be a raw Gamepad-shaped object or an already normalized action.
 */
export function mergeActions(keyActions, pads) {
  return keyActions.map((keys, i) => {
    const raw = pads?.[i];
    if (!raw || raw.connected === false) return { ...keys, fromPad: false, start: false };
    let pad = null;
    if (raw.buttons || raw.axes) pad = padActions(raw);
    else if (raw.fromPad) pad = raw;
    if (!pad || pad.connected === false) return { ...keys, fromPad: false, start: false };
    return {
      x: pad.x || 0,
      y: pad.y || 0,
      action: !!pad.action,
      secondary: !!pad.secondary,
      start: !!pad.start,
      connected: true,
      fromPad: true,
    };
  });
}

/** Build a browser-shaped pad for tests and for documenting the mapping. */
export function mockPad({
  x = 0,
  y = 0,
  a = false,
  b = false,
  start = false,
  up = false,
  down = false,
  left = false,
  right = false,
  connected = true,
} = {}) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  const set = (i, on) => {
    buttons[i] = { pressed: !!on, value: on ? 1 : 0 };
  };
  set(0, a);
  set(1, b);
  set(9, start);
  set(12, up);
  set(13, down);
  set(14, left);
  set(15, right);
  return { connected, axes: [x, y], buttons, mapping: "standard" };
}
