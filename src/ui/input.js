import { padActions } from "../core/inputmap.js";

const BLOCKED = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Tab",
]);

export function createInput() {
  const down = new Set();
  const edges = new Set();
  const prev = {
    start: [false, false, false, false],
    a: [false, false, false, false],
    b: [false, false, false, false],
    up: [false, false, false, false],
    down: [false, false, false, false],
    left: [false, false, false, false],
    right: [false, false, false, false],
  };

  function onKeyDown(e) {
    if (BLOCKED.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (!down.has(e.code)) edges.add(e.code);
    down.add(e.code);
  }

  function onKeyUp(e) {
    down.delete(e.code);
  }

  function onBlur() {
    down.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return {
    down,
    takeEdges() {
      const copy = new Set(edges);
      edges.clear();
      return copy;
    },
    pollPads() {
      const pads = [null, null, null, null];
      const list = (typeof navigator !== "undefined" && navigator.getGamepads && navigator.getGamepads()) || [];
      for (const pad of list) {
        if (!pad || !pad.connected) continue;
        if (pad.index < 0 || pad.index > 3) continue;
        pads[pad.index] = padActions(pad);
      }
      return pads;
    },
    /** Rising edges across all four pads, for menus and pause. */
    padEdges(pads) {
      const edge = {
        start: false,
        a: false,
        b: false,
        up: false,
        down: false,
        left: false,
        right: false,
      };
      const fields = [
        ["start", (p) => !!(p && p.start)],
        ["a", (p) => !!(p && p.action)],
        ["b", (p) => !!(p && p.secondary)],
        ["up", (p) => !!(p && p.y < -0.5)],
        ["down", (p) => !!(p && p.y > 0.5)],
        ["left", (p) => !!(p && p.x < -0.5)],
        ["right", (p) => !!(p && p.x > 0.5)],
      ];
      for (let i = 0; i < 4; i++) {
        const pad = pads[i];
        for (const [name, read] of fields) {
          const on = read(pad);
          if (on && !prev[name][i]) edge[name] = true;
          prev[name][i] = on;
        }
      }
      return edge;
    },
  };
}
