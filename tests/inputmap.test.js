import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BINDS,
  keyboardActions,
  mergeActions,
  mockPad,
  padActions,
  sanitizeBinds,
} from "../src/core/inputmap.js";

test("default keyboard map matches the four local seats", () => {
  assert.deepEqual(DEFAULT_BINDS[0], {
    up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", action: "KeyF", secondary: "KeyG",
  });
  assert.deepEqual(DEFAULT_BINDS[1], {
    up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", action: "Slash", secondary: "Period",
  });
  assert.deepEqual(DEFAULT_BINDS[2], {
    up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", action: "Semicolon", secondary: "Quote",
  });
  assert.deepEqual(DEFAULT_BINDS[3], {
    up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", action: "Numpad0", secondary: "NumpadEnter",
  });

  const down = new Set(["KeyW", "KeyD", "ArrowLeft", "KeyL", "Semicolon", "Numpad8", "Numpad0"]);
  const acts = keyboardActions(down, DEFAULT_BINDS);
  assert.deepEqual(acts[0], { x: 1, y: -1, action: false, secondary: false, fromPad: false });
  assert.equal(acts[1].x, -1);
  assert.equal(acts[1].y, 0);
  assert.equal(acts[2].x, 1);
  assert.equal(acts[2].action, true);
  assert.equal(acts[3].y, -1);
  assert.equal(acts[3].action, true);
  assert.equal(acts[3].secondary, false);
});

test("gamepad stick, deadzone, d-pad, and face buttons map to actions", () => {
  const tilt = padActions(mockPad({ x: 0.1, y: -0.9, a: true }));
  assert.equal(tilt.x, 0);
  assert.ok(tilt.y < -0.5);
  assert.equal(tilt.action, true);
  assert.equal(tilt.secondary, false);

  const dpad = padActions(mockPad({ x: 0.9, y: 0.9, left: true, up: true, b: true, start: true }));
  assert.equal(dpad.x, -1);
  assert.equal(dpad.y, -1);
  assert.equal(dpad.secondary, true);
  assert.equal(dpad.start, true);

  assert.equal(padActions(null), null);
  assert.equal(padActions({ connected: false, axes: [1, 0], buttons: [] }), null);
});

test("a connected pad overrides that seat and a disconnect gives the keyboard back", () => {
  const keys = keyboardActions(new Set(["KeyW", "KeyF"]), DEFAULT_BINDS);
  const idle = mergeActions(keys, [null, null, null, null]);
  assert.equal(idle[0].y, -1);
  assert.equal(idle[0].action, true);
  assert.equal(idle[0].fromPad, false);

  const plugged = mergeActions(keys, [mockPad({ x: 1, y: 0 }), null, null, null]);
  assert.ok(plugged[0].x > 0.5);
  assert.equal(plugged[0].y, 0);
  assert.equal(plugged[0].action, false);
  assert.equal(plugged[0].fromPad, true);
  assert.equal(plugged[1].fromPad, false);

  const unplugged = mergeActions(keys, [{ connected: false, axes: [1, 0], buttons: [] }, null, null, null]);
  assert.equal(unplugged[0].y, -1);
  assert.equal(unplugged[0].action, true);
  assert.equal(unplugged[0].fromPad, false);
});

test("saved binds keep custom keys and reject blanks and Escape", () => {
  const saved = sanitizeBinds([
    { up: "KeyQ", down: "", left: "Escape", action: "KeyR" },
  ]);
  assert.equal(saved[0].up, "KeyQ");
  assert.equal(saved[0].down, "KeyS");
  assert.equal(saved[0].left, "KeyA");
  assert.equal(saved[0].action, "KeyR");
  assert.equal(saved[0].secondary, "KeyG");
  assert.equal(saved[3].action, "Numpad0");
});
