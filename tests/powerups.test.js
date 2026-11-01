import assert from "node:assert/strict";
import test from "node:test";
import { HASTE_TIME, MAGNET_TIME, MAX_CARRY, PHASE_TIME } from "../src/core/constants.js";
import { step } from "../src/core/sim.js";
import { freshMatch, stick, zeros } from "./helpers.js";

test("walking over a relic stores it, and secondary spends it", () => {
  const match = yard();
  const ghost = match.round.players[0];
  ghost.x = 6.5;
  ghost.y = 6.5;
  match.round.powerups = [{ type: "haste", x: 6.5, y: 6.5 }];
  step(match, zeros(), 1 / 60);
  assert.equal(ghost.heldPower, "haste");
  assert.equal(match.round.powerups.length, 0);

  step(match, stick(0, { secondary: true }), 1 / 60);
  assert.equal(ghost.heldPower, null);
  assert.ok(ghost.haste > HASTE_TIME - 0.05);
});

test("a raised shield blocks one steal", () => {
  const match = yard();
  const [a, b] = match.round.players;
  placeTag(a, b);
  b.carried = 2;
  b.shield = true;
  const events = step(match, zeros(), 1 / 60);
  assert.equal(b.carried, 2);
  assert.equal(b.shield, false);
  assert.ok(b.invuln > 0);
  assert.equal(a.carried, 0);
  assert.equal(b.eliminations, 0);
  assert.ok(events.some((event) => event.type === "block"));
});

test("shield also stops a banish", () => {
  const match = yard();
  const [a, b] = match.round.players;
  placeTag(a, b);
  b.carried = 0;
  b.shield = true;
  step(match, zeros(), 1 / 60);
  assert.equal(b.eliminations, 0);
  assert.equal(b.shield, false);
  assert.equal(b.banished, 0);
});

test("phase, magnet, and dropping an orb are the other specials", () => {
  const match = yard();
  const ghost = match.round.players[0];
  ghost.x = 4.5;
  ghost.y = 4.5;
  ghost.heldPower = "phase";
  step(match, stick(0, { secondary: true }), 1 / 60);
  assert.ok(ghost.phase > PHASE_TIME - 0.05);

  const magnet = yard();
  const puller = magnet.round.players[0];
  puller.x = 4.5;
  puller.y = 4.5;
  puller.magnet = MAGNET_TIME;
  magnet.round.orbs = [{ id: 1, x: 6.5, y: 4.5, ignorePlayer: -1, ignoreTime: 0 }];
  const before = 2;
  for (let i = 0; i < 12; i++) step(magnet, zeros(), 1 / 60);
  const orb = magnet.round.orbs[0];
  if (orb) {
    const after = Math.hypot(orb.x - puller.x, orb.y - puller.y);
    assert.ok(after < before - 0.2, `orb barely moved: ${after}`);
  } else {
    assert.equal(puller.carried, 1);
  }

  const dropper = yard();
  const ghost2 = dropper.round.players[0];
  ghost2.x = 4.5;
  ghost2.y = 4.5;
  ghost2.facingX = 1;
  ghost2.facingY = 0;
  ghost2.carried = 2;
  const events = step(dropper, stick(0, { secondary: true }), 1 / 60);
  assert.equal(ghost2.carried, 1);
  assert.equal(dropper.round.orbs.length, 1);
  assert.ok(events.some((event) => event.type === "drop"));
  step(dropper, zeros(), 1 / 60);
  assert.equal(ghost2.carried, 1);
});

test("a ghost cannot hold more than the carry limit", () => {
  const match = yard();
  const ghost = match.round.players[0];
  ghost.x = 6.5;
  ghost.y = 6.5;
  ghost.carried = MAX_CARRY;
  match.round.orbs = [{ id: 3, x: 6.5, y: 6.5, ignorePlayer: -1, ignoreTime: 0 }];
  step(match, zeros(), 1 / 60);
  assert.equal(ghost.carried, MAX_CARRY);
  assert.equal(match.round.orbs.length, 1);
});

test("relics spawn from the seeded clock", () => {
  const match = freshMatch({ seed: 15 });
  match.round.powerTimer = 0.01;
  match.round.powerups = [];
  const events = step(match, stick(0, {}), 1 / 60);
  assert.equal(match.round.powerups.length, 1);
  assert.ok(["haste", "phase", "shield", "magnet"].includes(match.round.powerups[0].type));
  assert.ok(events.every((event) => event.type !== "relic" || match.round.players[event.player].heldPower));
});

function yard() {
  const match = freshMatch({ seed: 6 });
  match.round.orbs = [];
  match.round.powerups = [];
  match.round.respawns = [];
  match.round.time = 80;
  match.round.shiftTimer = 40;
  match.round.powerTimer = 40;
  for (const p of match.round.players) {
    p.invuln = 0;
    p.banished = 0;
    p.carried = 0;
    p.shield = false;
    p.heldPower = null;
    p.haste = 0;
    p.phase = 0;
    p.magnet = 0;
  }
  return match;
}

function placeTag(a, b) {
  a.x = 5.5;
  a.y = 5.5;
  a.facingX = 1;
  a.facingY = 0;
  a.invuln = 0;
  b.x = 6.05;
  b.y = 5.5;
  b.facingX = 1;
  b.facingY = 0;
  b.invuln = 0;
  b.shield = false;
}
