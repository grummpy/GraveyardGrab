import { ACTIONS, keyboardActions, mergeActions } from "../core/inputmap.js";
import { createMatch, step } from "../core/sim.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { render } from "./render.js";
import { loadBinds, loadSettings, saveBinds, saveSettings } from "./storage.js";

const SETTINGS_ITEMS = ["volume", "rounds", "mute", "controls", "back"];
const PAUSE_ITEMS = ["resume", "settings", "quit"];
const ROUND_CHOICES = [1, 3, 5];

export function startGame(canvas) {
  const ctx = canvas.getContext("2d");
  const audio = createAudio();
  const input = createInput();
  const settings = loadSettings();
  audio.setVolume(settings.volume);
  audio.setMuted(settings.muted);

  const cover = new Image();
  cover.src = "assets/cover.jpg";

  const state = {
    screen: "title",
    settings,
    binds: loadBinds(),
    slots: ["bot", "bot", "bot", "bot"],
    match: null,
    menuIndex: 0,
    capture: null,
    returnTo: "title",
    flash: 0,
    shake: 0,
    cover,
    status: "",
    pads: [false, false, false, false],
    prevAct: [false, false, false, false],
    prevSec: [false, false, false, false],
  };

  let last = performance.now();
  let acc = 0;

  canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    audio.unlock();
    if (state.screen === "title") openJoin();
  });

  function frame(now) {
    const delta = Math.min(250, now - last);
    last = now;
    acc += delta;
    let guard = 0;
    while (acc >= 1000 / 60 && guard++ < 8) {
      tick();
      acc -= 1000 / 60;
    }
    state.flash = Math.max(0, state.flash - delta / 1000);
    state.shake = Math.max(0, state.shake - delta / 1000);
    render(ctx, state, now / 1000);
    requestAnimationFrame(frame);
  }

  function currentActs(pads) {
    return mergeActions(keyboardActions(input.down, state.binds), pads);
  }

  function remember(acts) {
    state.prevAct = acts.map((a) => !!a.action);
    state.prevSec = acts.map((a) => !!a.secondary);
  }

  function goto(screen) {
    state.screen = screen;
    state.menuIndex = 0;
    state.capture = null;
    state.status = "";
  }

  function openJoin() {
    state.slots = ["bot", "bot", "bot", "bot"];
    goto("join");
    audio.unlock();
  }

  function openSettings(from) {
    state.returnTo = from;
    goto("settings");
  }

  function tick() {
    const edges = input.takeEdges();
    const pads = input.pollPads();
    const padEdge = input.padEdges(pads);
    state.pads = pads.map((pad) => !!(pad && pad.connected));
    const acts = currentActs(pads);

    if (edges.has("KeyM") && !state.capture) {
      settings.muted = audio.toggleMuted();
      saveSettings(settings);
    }

    if (state.screen === "title") tickTitle(edges, padEdge);
    else if (state.screen === "join") tickJoin(edges, padEdge, acts);
    else if (state.screen === "settings") tickSettings(edges, padEdge);
    else if (state.screen === "remap") tickRemap(edges, padEdge);
    else if (state.screen === "pause") tickPause(edges, padEdge);
    else if (state.screen === "play") tickPlay(edges, padEdge, acts);

    remember(currentActs(pads));
  }

  function tickTitle(edges, padEdge) {
    if (edges.has("Enter") || edges.has("Space") || padEdge.start || padEdge.a) openJoin();
    else if (edges.has("KeyS") || padEdge.b) openSettings("title");
  }

  function tickJoin(edges, padEdge, acts) {
    for (let i = 0; i < 4; i++) {
      if (acts[i].action && !state.prevAct[i]) state.slots[i] = "human";
      if (acts[i].secondary && !state.prevSec[i]) {
        if (state.slots[i] === "human") state.slots[i] = "bot";
        else state.slots[i] = state.slots[i] === "bot" ? "off" : "bot";
      }
    }
    if (edges.has("Escape")) {
      goto("title");
      return;
    }
    if (!(edges.has("Enter") || edges.has("Space") || padEdge.start)) return;
    const active = state.slots.filter((slot) => slot !== "off").length;
    if (active < 1) {
      state.status = "At least one ghost has to enter the yard.";
      return;
    }
    beginMatch();
  }

  function beginMatch() {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    state.match = createMatch({
      seed,
      roundCount: settings.roundCount,
      slots: state.slots.map((kind) => ({ kind })),
    });
    goto("play");
    audio.unlock();
  }

  function tickSettings(edges, padEdge) {
    const count = SETTINGS_ITEMS.length;
    moveMenu(edges, padEdge, count);
    const item = SETTINGS_ITEMS[state.menuIndex];
    const left = edges.has("ArrowLeft") || edges.has("KeyA") || padEdge.left;
    const right = edges.has("ArrowRight") || edges.has("KeyD") || padEdge.right;
    if (item === "volume" && (left || right)) {
      const dir = right ? 1 : -1;
      settings.volume = Math.max(0, Math.min(1, Math.round((settings.volume + dir * 0.1) * 10) / 10));
      audio.setVolume(settings.volume);
      saveSettings(settings);
    }
    if (item === "rounds" && (left || right)) {
      const index = ROUND_CHOICES.indexOf(settings.roundCount);
      const next = (index + (right ? 1 : -1) + ROUND_CHOICES.length) % ROUND_CHOICES.length;
      settings.roundCount = ROUND_CHOICES[next];
      saveSettings(settings);
    }
    const confirm = edges.has("Enter") || edges.has("Space") || padEdge.a || padEdge.start;
    if (confirm && item === "mute") {
      settings.muted = audio.toggleMuted();
      saveSettings(settings);
    }
    if (confirm && item === "controls") {
      goto("remap");
      return;
    }
    if ((confirm && item === "back") || edges.has("Escape") || padEdge.b) {
      goto(state.returnTo);
    }
  }

  function tickRemap(edges, padEdge) {
    if (state.capture) {
      if (edges.has("Escape") || padEdge.b) {
        state.capture = null;
        return;
      }
      for (const code of edges) {
        if (code === "Escape") continue;
        const { player, action } = state.capture;
        state.binds[player][action] = code;
        state.binds = state.binds.map((row) => ({ ...row }));
        saveBinds(state.binds);
        state.capture = null;
        break;
      }
      return;
    }
    moveMenu(edges, padEdge, 4 * ACTIONS.length);
    if (edges.has("Enter") || edges.has("Space") || padEdge.a) {
      const player = Math.floor(state.menuIndex / ACTIONS.length);
      const action = ACTIONS[state.menuIndex % ACTIONS.length];
      state.capture = { player, action };
      return;
    }
    if (edges.has("Escape") || padEdge.b) goto("settings");
  }

  function tickPause(edges, padEdge) {
    moveMenu(edges, padEdge, PAUSE_ITEMS.length);
    if (edges.has("Escape") || padEdge.b || padEdge.start) {
      goto("play");
      return;
    }
    if (!(edges.has("Enter") || edges.has("Space") || padEdge.a)) return;
    const item = PAUSE_ITEMS[state.menuIndex];
    if (item === "resume") goto("play");
    else if (item === "settings") openSettings("pause");
    else if (item === "quit") goto("title");
  }

  function tickPlay(edges, padEdge, acts) {
    const match = state.match;
    if (!match) {
      goto("title");
      return;
    }
    if (match.phase === "matchEnd") {
      if (edges.has("Enter") || edges.has("Space") || padEdge.start || padEdge.a) beginMatch();
      else if (edges.has("Escape") || padEdge.b) goto("title");
      return;
    }
    if (match.phase !== "matchEnd" && edges.has("Escape")) {
      goto("pause");
      return;
    }
    if (match.phase === "playing" && padEdge.start) {
      goto("pause");
      return;
    }
    const events = step(match, acts, 1 / 60);
    for (const event of events) playEvent(event);
  }

  function playEvent(event) {
    if (event.type === "pickup") audio.pickup();
    else if (event.type === "drop") audio.drop();
    else if (event.type === "tag" || event.type === "block") audio.tag();
    else if (event.type === "banish") {
      audio.banish();
      state.shake = 0.28;
    } else if (event.type === "bank") audio.bank();
    else if (event.type === "shift") {
      audio.shift();
      state.flash = 0.45;
    } else if (event.type === "power" || event.type === "relic") audio.power();
    else if (event.type === "countdown") audio.countdown(event.value);
    else if (event.type === "round") audio.round();
    else if (event.type === "match") audio.match();
    else if (event.type === "dash") audio.dash();
  }

  function moveMenu(edges, padEdge, count) {
    if (edges.has("ArrowUp") || edges.has("KeyW") || padEdge.up) {
      state.menuIndex = (state.menuIndex - 1 + count) % count;
    }
    if (edges.has("ArrowDown") || edges.has("KeyS") || padEdge.down) {
      state.menuIndex = (state.menuIndex + 1) % count;
    }
  }

  requestAnimationFrame(frame);
  canvas.focus();
}
