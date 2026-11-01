import assert from "node:assert/strict";
import test from "node:test";
import { BANISH_SECONDS, cryptCenter, INVULN_SECONDS, TAG_RANGE } from "../src/core/constants.js";
import { step } from "../src/core/sim.js";
import { freshMatch, stick, zeros } from "./helpers.js";

test("tagging a ghost who is holding orbs steals one and grants invulnerability", () => {
  const match = pair();
  const [a, b] = match.round.players;
  b.carried = 3;
  const events = step(match, zeros(), 1 / 60);
  assert.equal(a.carried, 1);
  assert.equal(b.carried, 2);
  assert.ok(b.invuln > 1);
  assert.equal(b.eliminations, 0);
  assert.ok(events.some((event) => event.type === "tag" && event.att === 0 && event.vic === 1));

  const after = b.carried;
  step(match, zeros(), 1 / 60);
  assert.equal(b.carried, after);
  assert.equal(a.carried, 1);
});

test("a tag from behind does not connect", () => {
  const match = pair();
  const [a, b] = match.round.players;
  a.facingX = -1;
  b.carried = 2;
  step(match, zeros(), 1 / 60);
  assert.equal(b.carried, 2);
  assert.equal(a.carried, 0);
});

test("tagging an empty-handed ghost banishes them to their crypt", () => {
  const match = pair();
  const [a, b] = match.round.players;
  const events = step(match, zeros(), 1 / 60);
  const home = cryptCenter(21, 15, 1);
  assert.equal(b.eliminations, 1);
  assert.ok(b.banished > BANISH_SECONDS - 0.05);
  assert.equal(b.x, home.x);
  assert.equal(b.y, home.y);
  assert.equal(a.carried, 0);
  assert.equal(a.eliminations, 0);
  assert.ok(events.some((event) => event.type === "banish" && event.vic === 1));

  step(match, stick(1, { x: 1 }), 1 / 60);
  assert.equal(b.x, home.x);
  assert.equal(b.y, home.y);
  assert.equal(b.eliminations, 1);
});

test("a banished ghost returns with fresh invulnerability", () => {
  const match = pair();
  const b = match.round.players[1];
  b.banished = 0.01;
  b.x = 8;
  b.y = 8;
  step(match, zeros(), 1 / 60);
  const home = cryptCenter(21, 15, 1);
  assert.equal(b.banished, 0);
  assert.equal(b.invuln, INVULN_SECONDS);
  assert.equal(b.x, home.x);
  assert.equal(b.y, home.y);
});

test("an invulnerable ghost cannot be eliminated or robbed", () => {
  const match = pair();
  match.round.players[1].invuln = 1;
  match.round.players[1].carried = 2;
  step(match, zeros(), 1 / 60);
  assert.equal(match.round.players[1].carried, 2);
  assert.equal(match.round.players[1].eliminations, 0);
});

test("ghosts must actually be in tag range", () => {
  const match = pair();
  match.round.players[1].x = match.round.players[0].x + TAG_RANGE + 0.4;
  match.round.players[1].carried = 2;
  step(match, zeros(), 1 / 60);
  assert.equal(match.round.players[1].carried, 2);
});

function pair() {
  const match = freshMatch({ seed: 11 });
  match.round.orbs = [];
  match.round.powerups = [];
  match.round.respawns = [];
  match.round.time = 90;
  match.round.shiftTimer = 40;
  const [a, b] = match.round.players;
  a.x = 5.5;
  a.y = 5.5;
  a.facingX = 1;
  a.facingY = 0;
  a.carried = 0;
  a.invuln = 0;
  a.banished = 0;
  a.shield = false;
  b.x = 6.05;
  b.y = 5.5;
  b.facingX = 1;
  b.facingY = 0;
  b.carried = 0;
  b.invuln = 0;
  b.banished = 0;
  b.shield = false;
  return match;
}
