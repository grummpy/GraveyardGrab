import { PLAYERS } from "../core/constants.js";
import { ACTIONS } from "../core/inputmap.js";

const W = 1280;
const H = 720;
const TILE = 36;
const COLS = 21;
const ROWS = 15;
const FIELD_W = COLS * TILE;
const FIELD_H = ROWS * TILE;
const OX = (W - FIELD_W) / 2;
const OY = 70;

const ACTION_LABELS = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  action: "Action",
  secondary: "Secondary",
};

export function render(ctx, state, time) {
  ctx.clearRect(0, 0, W, H);
  if (state.screen === "title") drawTitle(ctx, state, time);
  else if (state.screen === "join") drawJoin(ctx, state, time);
  else if (state.screen === "settings") drawSettings(ctx, state, time);
  else if (state.screen === "remap") drawRemap(ctx, state, time);
  else {
    drawPlayfield(ctx, state, time);
    if (state.screen === "pause") drawPause(ctx, state);
    if (state.match?.phase === "roundEnd") drawRoundBanner(ctx, state, time);
    if (state.match?.phase === "matchEnd") drawMatch(ctx, state, time);
  }
}

function drawTitle(ctx, state, time) {
  drawCover(ctx, state.cover);
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, "rgba(8, 2, 18, 0.15)");
  veil.addColorStop(0.45, "rgba(8, 2, 18, 0.05)");
  veil.addColorStop(1, "rgba(8, 2, 18, 0.82)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f6f1e6";
  ctx.font = "700 28px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("A NIGHT IN THE YARD", W / 2, 168);
  strokeText(ctx, "GRAVEYARD GRAB", W / 2, 250, "800 92px Trebuchet MS, Verdana, sans-serif", "#f4efe6", "#2a103f");
  ctx.font = "600 22px Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#d7c6ef";
  ctx.fillText("Four ghosts. One shifting maze. Steal the souls.", W / 2, 300);

  const blink = 0.45 + Math.sin(time * 4) * 0.55;
  ctx.globalAlpha = blink;
  ctx.fillStyle = "#ffe14a";
  ctx.font = "700 28px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("PRESS ENTER  OR  START", W / 2, 560);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#bba8d4";
  ctx.font = "600 18px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("S  settings      M  mute", W / 2, 608);
  ctx.font = "600 16px Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#8d7aa8";
  ctx.fillText("Local versus  ·  up to 4 players  ·  bots welcome", W / 2, 648);
}

function drawJoin(ctx, state, time) {
  drawMenuBackdrop(ctx, state.cover, time);
  panel(ctx, 80, 48, W - 160, H - 96);
  heading(ctx, "WHO'S HAUNTING?", 118);
  ctx.textAlign = "center";
  ctx.fillStyle = "#cbbbe0";
  ctx.font = "600 18px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("Action joins  ·  Secondary toggles Bot / Off  ·  Enter starts  ·  Esc back", W / 2, 158);
  ctx.fillText(`${state.settings.roundCount} round${state.settings.roundCount > 1 ? "s" : ""}  ·  2:00 each  ·  stones shift every 15s`, W / 2, 186);

  const labels = ["WASD · F · G", "Arrows · / · .", "IJKL · ; · '", "Numpad · 0 · Enter"];
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 270;
    const player = PLAYERS[i];
    const slot = state.slots[i];
    ctx.fillStyle = "rgba(18, 8, 32, 0.72)";
    roundRect(ctx, x, 230, 246, 300, 16);
    ctx.fill();
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawGhost(ctx, x + 123, 320, player.color, player.deep, time, 0, 1, slot === "off" ? 0.25 : 1, 1.6);
    ctx.textAlign = "center";
    ctx.fillStyle = player.color;
    ctx.font = "800 28px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(`${player.label}  ${player.name}`, x + 123, 410);
    ctx.fillStyle = "#d9ccea";
    ctx.font = "600 16px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(labels[i], x + 123, 440);
    ctx.font = "800 22px Trebuchet MS, Verdana, sans-serif";
    ctx.fillStyle = slot === "human" ? "#ffe14a" : slot === "bot" ? "#9ad7ff" : "#776888";
    ctx.fillText(slot === "human" ? "JOINED" : slot === "bot" ? "BOT" : "OFF", x + 123, 488);
    if (state.pads[i]) drawPadIcon(ctx, x + 200, 250, player.color);
  }

  if (state.status) {
    ctx.fillStyle = "#ff8aa0";
    ctx.font = "700 20px Trebuchet MS, Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.status, W / 2, 580);
  }
}

function drawSettings(ctx, state, time) {
  drawMenuBackdrop(ctx, state.cover, time);
  panel(ctx, 340, 90, 600, 520);
  heading(ctx, "SETTINGS", 170);
  const rows = [
    ["Volume", `${Math.round(state.settings.volume * 100)}%`],
    ["Rounds", `${state.settings.roundCount}`],
    ["Mute", state.settings.muted ? "On" : "Off"],
    ["Controls", "Remap"],
    ["Back", ""],
  ];
  rows.forEach((row, i) => {
    const y = 250 + i * 64;
    const selected = i === state.menuIndex;
    if (selected) {
      ctx.fillStyle = "rgba(255, 225, 74, 0.14)";
      roundRect(ctx, 390, y - 36, 500, 52, 10);
      ctx.fill();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = selected ? "#ffe14a" : "#f4efe6";
    ctx.font = "700 26px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(row[0], 420, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#d7c6ef";
    ctx.fillText(row[1], 860, y);
  });
  ctx.textAlign = "center";
  ctx.font = "600 16px Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#bba8d4";
  ctx.fillText("Left / Right adjust    Enter confirms    Esc back    M mutes anywhere", W / 2, 570);
}

function drawRemap(ctx, state, time) {
  drawMenuBackdrop(ctx, state.cover, time);
  panel(ctx, 160, 36, W - 320, H - 72);
  heading(ctx, "CONTROLS", 92);
  ctx.textAlign = "center";
  ctx.fillStyle = "#cbbbe0";
  ctx.font = "600 16px Trebuchet MS, Verdana, sans-serif";
  const prompt = state.capture
    ? `Press a key for ${PLAYERS[state.capture.player].label} ${ACTION_LABELS[state.capture.action]}  ·  Esc cancels`
    : "Enter to rebind the highlighted row  ·  Esc back  ·  saved on this machine";
  ctx.fillText(prompt, W / 2, 128);

  for (let i = 0; i < 4; i++) {
    const x = 200 + (i % 4) * 230;
    ctx.fillStyle = PLAYERS[i].color;
    ctx.font = "800 18px Trebuchet MS, Verdana, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(PLAYERS[i].label, x, 170);
    ACTIONS.forEach((action, row) => {
      const index = i * ACTIONS.length + row;
      const y = 206 + row * 70;
      const selected = index === state.menuIndex;
      if (selected) {
        ctx.fillStyle = "rgba(255, 225, 74, 0.16)";
        roundRect(ctx, x - 12, y - 28, 200, 48, 8);
        ctx.fill();
      }
      ctx.fillStyle = selected ? "#ffe14a" : "#bba8d4";
      ctx.font = "600 14px Trebuchet MS, Verdana, sans-serif";
      ctx.fillText(ACTION_LABELS[action], x, y - 6);
      ctx.fillStyle = "#f4efe6";
      ctx.font = "700 18px Trebuchet MS, Verdana, sans-serif";
      const code = state.binds[i][action];
      const waiting = state.capture && state.capture.player === i && state.capture.action === action;
      ctx.fillText(waiting ? "..." : keyLabel(code), x, y + 16);
    });
  }
}

function drawPlayfield(ctx, state, time) {
  const match = state.match;
  ctx.fillStyle = "#120816";
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, time);
  drawSideYard(ctx, 0, time);
  drawSideYard(ctx, W - OX + 8, time);

  if (!match) return;
  const maze = match.round.maze;
  for (let ty = 0; ty < maze.h; ty++) {
    for (let tx = 0; tx < maze.w; tx++) {
      const x = OX + tx * TILE;
      const y = OY + ty * TILE;
      if (maze.tiles[ty * maze.w + tx] === 1) drawWall(ctx, x, y, TILE, tx, ty);
      else drawFloor(ctx, x, y, TILE, tx, ty);
    }
  }
  const crypts = [
    [1, 1],
    [maze.w - 2, 1],
    [1, maze.h - 2],
    [maze.w - 2, maze.h - 2],
  ];
  crypts.forEach(([tx, ty], i) => {
    if (!match.active[i]) return;
    drawCrypt(ctx, OX + tx * TILE, OY + ty * TILE, TILE, PLAYERS[i].color);
  });

  for (const orb of match.round.orbs) {
    const [x, y] = world(orb.x, orb.y);
    drawOrb(ctx, x, y, time + orb.id);
  }
  for (const item of match.round.powerups) {
    const [x, y] = world(item.x, item.y);
    drawRelic(ctx, x, y, item.type, time);
  }

  const shake = state.shake > 0 ? Math.sin(time * 40) * 4 * state.shake : 0;
  match.round.players.forEach((p, i) => {
    if (!p.active) return;
    const [x, y] = world(p.x, p.y);
    const blink = p.invuln > 0 && Math.sin(time * 24) > 0 ? 0.45 : 1;
    const alpha = p.banished > 0 ? 0.35 : blink;
    drawGhost(ctx, x + shake, y, PLAYERS[i].color, PLAYERS[i].deep, time + i, p.facingX, p.facingY, alpha, 1);
    if (p.carried > 0 && p.banished <= 0) drawCarry(ctx, x, y, p.carried, PLAYERS[i].color);
    if (p.shield) {
      ctx.strokeStyle = "#ffe14a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.banished > 0) {
      ctx.fillStyle = "#f4efe6";
      ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.banished.toFixed(1), x, y - 26);
    }
  });

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(214, 196, 255, ${state.flash * 0.45})`;
    ctx.fillRect(OX, OY, FIELD_W, FIELD_H);
  }

  drawHud(ctx, state, time);
}

function drawHud(ctx, state, time) {
  const match = state.match;
  const round = match.round;
  ctx.fillStyle = "#f4efe6";
  ctx.textAlign = "center";
  ctx.font = "800 18px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(`ROUND ${match.roundIndex + 1} / ${match.roundCount}`, W / 2 - 220, 36);
  const urgent = round.time <= 10;
  ctx.fillStyle = urgent && Math.sin(time * 8) > 0 ? "#ff5d73" : "#ffe14a";
  ctx.font = "800 36px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(formatTime(round.time), W / 2, 42);
  ctx.fillStyle = "#bba8d4";
  ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("STONES", W / 2 + 200, 22);
  ctx.fillStyle = "#2a2038";
  roundRect(ctx, W / 2 + 150, 30, 120, 10, 5);
  ctx.fill();
  ctx.fillStyle = round.shiftTimer < 3 ? "#ff5d73" : "#c9a6ff";
  roundRect(ctx, W / 2 + 150, 30, 120 * Math.max(0, round.shiftTimer / 15), 10, 5);
  ctx.fill();
  if (round.shiftTimer < 3 && match.phase === "playing") {
    ctx.fillStyle = "#ffd0e0";
    ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText("THE STONES SHIFT", W / 2 + 210, 58);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = state.settings.muted ? "#ff8aa0" : "#8d7aa8";
  ctx.font = "700 16px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(state.settings.muted ? "MUTE" : "M mute", W - 28, 36);

  for (let i = 0; i < 4; i++) {
    const p = round.players[i];
    const player = PLAYERS[i];
    const x = 24 + i * 316;
    const y = 628;
    ctx.fillStyle = p.active ? "rgba(16, 8, 28, 0.88)" : "rgba(16, 8, 28, 0.4)";
    roundRect(ctx, x, y, 300, 76, 12);
    ctx.fill();
    ctx.fillStyle = player.color;
    ctx.fillRect(x, y, 8, 76);
    ctx.textAlign = "left";
    ctx.font = "800 18px Trebuchet MS, Verdana, sans-serif";
    ctx.fillStyle = p.active ? player.color : "#665";
    ctx.fillText(`${player.label} ${player.name}`, x + 18, y + 24);
    ctx.font = "600 13px Trebuchet MS, Verdana, sans-serif";
    ctx.fillStyle = "#bba8d4";
    const kind = state.match.slots[i].kind;
    ctx.fillText(kind === "human" ? "human" : kind === "bot" ? "bot" : "off", x + 168, y + 24);
    if (state.pads[i]) drawPadIcon(ctx, x + 230, y + 12, player.color);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "700 14px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(`bank ${p.banked}`, x + 18, y + 48);
    ctx.fillText(`rounds ${match.roundWins[i]}`, x + 110, y + 48);
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.fillStyle = c < p.carried ? "#9af6ff" : "#3a3150";
      ctx.arc(x + 200 + c * 16, y + 44, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.heldPower) {
      ctx.fillStyle = "#ffe14a";
      ctx.font = "700 12px Trebuchet MS, Verdana, sans-serif";
      ctx.fillText(p.heldPower, x + 18, y + 66);
    } else if (p.phase > 0 || p.haste > 0 || p.magnet > 0) {
      ctx.fillStyle = "#9ad7ff";
      ctx.font = "700 12px Trebuchet MS, Verdana, sans-serif";
      const buff = p.phase > 0 ? "phase" : p.haste > 0 ? "haste" : "magnet";
      ctx.fillText(buff, x + 18, y + 66);
    }
  }
}

function drawRoundBanner(ctx, state, time) {
  const match = state.match;
  veil(ctx, 0.45);
  panel(ctx, 300, 200, 680, 250);
  heading(ctx, `ROUND ${match.roundIndex + 1}`, 280);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4efe6";
  ctx.font = "700 28px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(winnerLine(match.winners), W / 2, 340);
  ctx.font = "600 18px Trebuchet MS, Verdana, sans-serif";
  ctx.fillStyle = "#d7c6ef";
  const banks = match.round.players.map((p, i) => `${PLAYERS[i].label} ${p.banked}`).join("    ");
  ctx.fillText(banks, W / 2, 390);
}

function drawMatch(ctx, state) {
  const match = state.match;
  veil(ctx, 0.62);
  panel(ctx, 280, 80, 720, 560);
  heading(ctx, "MATCH OVER", 160);
  const champ = PLAYERS[match.champion ?? 0];
  ctx.textAlign = "center";
  ctx.fillStyle = champ.color;
  ctx.font = "800 36px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(`${champ.name} takes the yard`, W / 2, 220);

  const ranking = match.ranking || [];
  ranking.forEach((id, place) => {
    const y = 280 + place * 58;
    const player = PLAYERS[id];
    ctx.fillStyle = place === 0 ? "rgba(255, 225, 74, 0.12)" : "rgba(255,255,255,0.03)";
    roundRect(ctx, 340, y - 28, 600, 48, 10);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = player.color;
    ctx.font = "800 22px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(`${place + 1}   ${player.label} ${player.name}`, 360, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f4efe6";
    ctx.font = "700 18px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(`${match.roundWins[id]} rounds · ${match.bankedAll[id]} banked`, 920, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe14a";
  ctx.font = "700 20px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText("Enter rematch     Esc title", W / 2, 580);
}

function drawPause(ctx, state) {
  veil(ctx, 0.55);
  panel(ctx, 430, 180, 420, 340);
  heading(ctx, "PAUSED", 250);
  const items = ["Resume", "Settings", "Quit to title"];
  items.forEach((label, i) => {
    const y = 320 + i * 58;
    const selected = i === state.menuIndex;
    if (selected) {
      ctx.fillStyle = "rgba(255, 225, 74, 0.16)";
      roundRect(ctx, 470, y - 32, 340, 46, 10);
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = selected ? "#ffe14a" : "#f4efe6";
    ctx.font = "700 26px Trebuchet MS, Verdana, sans-serif";
    ctx.fillText(label, W / 2, y);
  });
}

function winnerLine(winners) {
  if (!winners || winners.length === 0) return "Nobody banked a soul";
  const names = winners.map((id) => PLAYERS[id].name);
  if (names.length === 1) return `${names[0]} banks the round`;
  if (names.length === 2) return `${names[0]} and ${names[1]} tie the round`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} tie`;
}

function drawCover(ctx, cover) {
  ctx.fillStyle = "#14081f";
  ctx.fillRect(0, 0, W, H);
  if (cover && cover.complete && cover.naturalWidth) {
    const scale = Math.max(W / cover.naturalWidth, H / cover.naturalHeight);
    const dw = cover.naturalWidth * scale;
    const dh = cover.naturalHeight * scale;
    ctx.drawImage(cover, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
}

function drawMenuBackdrop(ctx, cover, time) {
  drawCover(ctx, cover);
  ctx.fillStyle = "rgba(8, 3, 16, 0.72)";
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, time);
}

function drawStars(ctx, time) {
  ctx.fillStyle = "#f4efe6";
  for (let i = 0; i < 28; i++) {
    const x = (i * 97) % W;
    const y = (i * 53) % 80;
    const tw = 0.3 + (Math.sin(time * 2 + i) * 0.5 + 0.5) * 0.7;
    ctx.globalAlpha = tw;
    ctx.fillRect(x, y + 4, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawSideYard(ctx, x, time) {
  ctx.fillStyle = "#1a1028";
  ctx.fillRect(x, OY, OX - 16, FIELD_H);
  ctx.fillStyle = "#3a2a22";
  for (let i = 0; i < 5; i++) {
    const gy = OY + 40 + i * 100;
    ctx.fillStyle = "#6e6880";
    roundRect(ctx, x + 28, gy, 36, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#8d88a0";
    ctx.beginPath();
    ctx.arc(x + 46, gy, 16, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#2a1438";
  ctx.beginPath();
  ctx.moveTo(x + 20, OY + FIELD_H);
  ctx.quadraticCurveTo(x + 70, OY + 80 + Math.sin(time) * 4, x + OX - 30, OY + FIELD_H - 20);
  ctx.lineTo(x + 20, OY + FIELD_H);
  ctx.fill();
}

function drawFloor(ctx, x, y, s, tx, ty) {
  ctx.fillStyle = (tx + ty) % 2 === 0 ? "#2a243c" : "#241c34";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "rgba(190, 180, 220, 0.06)";
  const n = (tx * 13 + ty * 5) % 5;
  ctx.beginPath();
  ctx.arc(x + 8 + n * 2, y + 12, 2, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 24, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawWall(ctx, x, y, s, tx, ty) {
  const border = tx === 0 || ty === 0 || tx === COLS - 1 || ty === ROWS - 1;
  if (border) {
    ctx.fillStyle = "#1a1224";
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "#5c5368";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 4);
    ctx.lineTo(x + 6, y + s - 4);
    ctx.moveTo(x + s - 6, y + 4);
    ctx.lineTo(x + s - 6, y + s - 4);
    ctx.moveTo(x + 6, y + s / 2);
    ctx.lineTo(x + s - 6, y + s / 2);
    ctx.stroke();
    if ((tx + ty) % 4 === 0) {
      ctx.fillStyle = "#8a8498";
      ctx.fillRect(x + s / 2 - 3, y + 4, 6, s - 8);
    }
    return;
  }
  const tomb = (tx * 7 + ty * 3) % 5 === 0;
  if (tomb) {
    ctx.fillStyle = "#241430";
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#8a8494";
    roundRect(ctx, x + 8, y + 10, s - 16, s - 16, 4);
    ctx.fill();
    ctx.fillStyle = "#b7b2c2";
    ctx.beginPath();
    ctx.arc(x + s / 2, y + 12, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + 8, y + 12, s - 16, 6);
    ctx.strokeStyle = "#4e4a58";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + 14);
    ctx.lineTo(x + s / 2, y + s - 12);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#1c1028";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "#43245f";
  roundRect(ctx, x + 2, y + 6, s - 4, s - 10, 5);
  ctx.fill();
  ctx.fillStyle = "#6d4586";
  roundRect(ctx, x + 5, y + 8, s - 10, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#2a163c";
  ctx.fillRect(x + 6, y + 18, 3, 8);
  ctx.fillRect(x + s - 10, y + 20, 3, 7);
}

function drawCrypt(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 7, y + 9, s - 14, s - 16);
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y + 8);
  ctx.lineTo(x + s / 2, y + s - 8);
  ctx.moveTo(x + 9, y + s / 2);
  ctx.lineTo(x + s - 9, y + s / 2);
  ctx.stroke();
}

function drawOrb(ctx, x, y, t) {
  const pulse = 0.85 + Math.sin(t * 5) * 0.15;
  const r = 8 * pulse;
  const glow = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4);
  glow.addColorStop(0, "rgba(245, 255, 255, 0.95)");
  glow.addColorStop(0.35, "rgba(130, 230, 255, 0.85)");
  glow.addColorStop(1, "rgba(70, 130, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawRelic(ctx, x, y, type, time) {
  const bob = Math.sin(time * 3 + x) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const colors = { haste: "#7dffb2", phase: "#d7a6ff", shield: "#ffe14a", magnet: "#8ad7ff" };
  ctx.strokeStyle = colors[type] || "#fff";
  ctx.fillStyle = colors[type] || "#fff";
  ctx.lineWidth = 2;
  if (type === "shield") {
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "phase") {
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "magnet") {
    ctx.beginPath();
    ctx.arc(0, 2, 7, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.lineTo(-7, 6);
    ctx.moveTo(7, 2);
    ctx.lineTo(7, 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(4, -1);
    ctx.lineTo(0, 8);
    ctx.lineTo(-4, -1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGhost(ctx, x, y, color, deep, t, facingX, facingY, alpha, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  const wob = Math.sin(t * 7) * 1.4;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -2, 13, Math.PI, 0, false);
  ctx.lineTo(13, 9);
  ctx.quadraticCurveTo(9, 5 + wob, 6, 11);
  ctx.quadraticCurveTo(3, 6 - wob, 0, 12);
  ctx.quadraticCurveTo(-3, 6 + wob, -6, 11);
  ctx.quadraticCurveTo(-9, 5 - wob, -13, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(-4, -6, 4, 2.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-5, -2, 3.3, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -2, 3.3, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1024";
  const px = Math.max(-1.3, Math.min(1.3, facingX * 1.8));
  const py = Math.max(-1.3, Math.min(1.3, facingY * 1.8));
  ctx.beginPath();
  ctx.arc(-5 + px, -2 + py, 1.6, 0, Math.PI * 2);
  ctx.arc(5 + px, -2 + py, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.ellipse(0, 5, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCarry(ctx, x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI / 2 + (i / count) * Math.PI * 2;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * 16, y + Math.sin(ang) * 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPadIcon(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0, 0, 22, 14, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(7, 7, 1.4, 0, Math.PI * 2);
  ctx.arc(15, 7, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function world(wx, wy) {
  return [OX + wx * TILE, OY + wy * TILE];
}

function formatTime(time) {
  const total = Math.max(0, Math.ceil(time - 1e-6));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function heading(ctx, text, y) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4efe6";
  ctx.font = "800 42px Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(text, W / 2, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(16, 8, 28, 0.9)";
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(201, 166, 255, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 2, 12, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function strokeText(ctx, text, x, y, font, fill, stroke) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.lineWidth = 8;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function keyLabel(code) {
  const named = {
    Slash: "/",
    Period: ".",
    Semicolon: ";",
    Quote: "'",
    Space: "Space",
    Enter: "Enter",
    NumpadEnter: "Num Enter",
    NumpadAdd: "Num +",
    NumpadSubtract: "Num -",
    NumpadMultiply: "Num *",
    NumpadDivide: "Num /",
    NumpadDecimal: "Num .",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };
  if (named[code]) return named[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}
