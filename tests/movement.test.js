import assert from "node:assert/strict";
import test from "node:test";
import { circleHitsWall, moveCircle } from "../src/core/collision.js";
import { PLAYER_SPEED } from "../src/core/constants.js";
import { step } from "../src/core/sim.js";
import { freshMatch, openYard, stick, zeros } from "./helpers.js";

test("a circle cannot pass through a tombstone", () => {
  const maze = {
    w: 5,
    h: 5,
    tiles: [
      1, 1, 1, 1, 1,
      1, 0, 0, 1, 1,
      1, 0, 0, 0, 1,
      1, 0, 0, 0, 1,
      1, 1, 1, 1, 1,
    ],
  };
  const moved = moveCircle(maze, 1.5, 1.5, -1, 0, 0.28, false);
  assert.ok(moved.x > 1.2);
  assert.equal(circleHitsWall(maze, moved.x, moved.y, 0.28), false);
  const phased = moveCircle(maze, 1.5, 1.5, -0.8, 0, 0.28, true);
  assert.ok(phased.x < 1.2);
});

test("standing still does not teleport a ghost", () => {
  const match = openYard(freshMatch({ seed: 2 }));
  const ghost = match.round.players[0];
  ghost.x = 4.25;
  ghost.y = 8.75;
  step(match, zeros(), 1 / 60);
  assert.equal(ghost.x, 4.25);
  assert.equal(ghost.y, 8.75);
});

test("ghosts slide along walls and fit through a one-tile gap", () => {
  const blocked = openYard(freshMatch({ seed: 2 }));
  const ghost = blocked.round.players[0];
  ghost.x = 9.2;
  ghost.y = 3.5;
  for (let i = 0; i < 40; i++) step(blocked, stick(0, { x: 1 }), 1 / 60);
  assert.ok(ghost.x > 9.45, `expected to reach the wall, x=${ghost.x}`);
  assert.ok(ghost.x < 9.85, `walked through a tombstone, x=${ghost.x}`);
  assert.ok(Math.floor(ghost.x) <= 9);

  const gap = openYard(freshMatch({ seed: 2 }));
  const runner = gap.round.players[0];
  runner.x = 8.2;
  runner.y = 7.5;
  for (let i = 0; i < 50; i++) step(gap, stick(0, { x: 1 }), 1 / 60);
  assert.ok(runner.x > 10.4, `did not take the gap, x=${runner.x}`);
});

test("diagonal movement is normalized to the same speed as cardinal", () => {
  const cardinal = openYard(freshMatch({ seed: 2 }));
  const diagonal = openYard(freshMatch({ seed: 2 }));
  cardinal.round.players[0].x = 3.5;
  cardinal.round.players[0].y = 3.5;
  diagonal.round.players[0].x = 3.5;
  diagonal.round.players[0].y = 3.5;
  for (let i = 0; i < 20; i++) {
    step(cardinal, stick(0, { x: 1 }), 1 / 60);
    step(diagonal, stick(0, { x: 1, y: 1 }), 1 / 60);
  }
  const dx = cardinal.round.players[0].x - 3.5;
  const hyp = Math.hypot(diagonal.round.players[0].x - 3.5, diagonal.round.players[0].y - 3.5);
  const expected = PLAYER_SPEED * (20 / 60);
  assert.ok(Math.abs(dx - expected) < 0.05, `cardinal ${dx}`);
  assert.ok(Math.abs(hyp - expected) < 0.08, `diagonal ${hyp}`);
});

test("phase walks through tombstones and haste outruns a normal ghost", () => {
  const walled = openYard(freshMatch({ seed: 2 }));
  const ghost = walled.round.players[0];
  ghost.x = 9.2;
  ghost.y = 3.5;
  ghost.phase = 4;
  for (let i = 0; i < 30; i++) step(walled, stick(0, { x: 1 }), 1 / 60);
  assert.ok(ghost.x > 10.4, `phase did not cross, x=${ghost.x}`);

  const slow = openYard(freshMatch({ seed: 2 }));
  const fast = openYard(freshMatch({ seed: 2 }));
  slow.round.players[0].x = 2.5;
  slow.round.players[0].y = 3.5;
  fast.round.players[0].x = 2.5;
  fast.round.players[0].y = 3.5;
  fast.round.players[0].haste = 4;
  for (let i = 0; i < 20; i++) {
    step(slow, stick(0, { x: 1 }), 1 / 60);
    step(fast, stick(0, { x: 1 }), 1 / 60);
  }
  assert.ok(fast.round.players[0].x > slow.round.players[0].x + 0.4);
});
