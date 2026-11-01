import assert from "node:assert/strict";
import test from "node:test";
import { cryptsFor } from "../src/core/constants.js";
import { generateMaze, isFullyConnected, nextDir } from "../src/core/maze.js";
import { makeRng } from "../src/core/rng.js";
import { step } from "../src/core/sim.js";
import { freshMatch, zeros } from "./helpers.js";

test("every seeded maze is fully connected and keeps the crypts open", () => {
  for (let seed = 1; seed <= 24; seed++) {
    const maze = generateMaze(21, 15, makeRng(seed));
    assert.equal(maze.w, 21);
    assert.equal(maze.h, 15);
    assert.equal(isFullyConnected(maze), true, `seed ${seed}`);
    for (const crypt of cryptsFor(21, 15)) {
      assert.equal(maze.tiles[crypt.ty * maze.w + crypt.tx], 0, `crypt ${crypt.tx},${crypt.ty}`);
    }
    assert.ok(maze.tiles.includes(1));
    assert.ok(maze.tiles.includes(0));
  }
});

test("connectivity check rejects a sealed-off floor", () => {
  const maze = {
    w: 3,
    h: 3,
    tiles: [0, 1, 0, 1, 1, 1, 0, 0, 0],
  };
  assert.equal(isFullyConnected(maze), false);
  const open = { w: 3, h: 3, tiles: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
  assert.equal(isFullyConnected(open), true);
});

test("the yard shifts on a timer and stays walkable", () => {
  const match = freshMatch({ seed: 5 });
  const before = match.round.maze.tiles.join("");
  match.round.shiftTimer = 0.001;
  const events = step(match, zeros(), 1 / 60);
  assert.ok(events.some((event) => event.type === "shift"));
  assert.notEqual(match.round.maze.tiles.join(""), before);
  assert.equal(isFullyConnected(match.round.maze), true);
  for (const p of match.round.players) {
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    assert.equal(match.round.maze.tiles[ty * match.round.maze.w + tx], 0);
  }
  for (const orb of match.round.orbs) {
    const tx = Math.floor(orb.x);
    const ty = Math.floor(orb.y);
    assert.equal(match.round.maze.tiles[ty * match.round.maze.w + tx], 0);
  }
});

test("pathing steps toward a floor goal and refuses a wall", () => {
  const maze = generateMaze(21, 15, makeRng(3));
  const step = nextDir(maze, 1.5, 1.5, 19.5, 13.5);
  assert.ok(step.x !== 0 || step.y !== 0);
  const stuck = nextDir(maze, 0.5, 0.5, 1.5, 1.5);
  assert.deepEqual(stuck, { x: 0, y: 0 });
});
