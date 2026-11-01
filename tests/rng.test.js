import assert from "node:assert/strict";
import test from "node:test";
import { generateMaze } from "../src/core/maze.js";
import { makeRng } from "../src/core/rng.js";
import { fingerprint, step } from "../src/core/sim.js";
import { BOTS, freshMatch } from "./helpers.js";

test("same seed yields the same sequence, other seeds diverge", () => {
  const a = makeRng(42);
  const b = makeRng(42);
  const seq = [a.next(), a.next(), a.next(), a.int(10), a.int(7)];
  assert.deepEqual(seq, [b.next(), b.next(), b.next(), b.int(10), b.int(7)]);
  const c = makeRng(7);
  assert.notEqual(c.next(), seq[0]);
});

test("seed 0 is stable and not a stuck zero stream", () => {
  const a = makeRng(0);
  const b = makeRng(0);
  const seq = [a.next(), a.next(), a.next()];
  assert.deepEqual(seq, [b.next(), b.next(), b.next()]);
  assert.ok(seq.some((n) => n > 0.01 && n < 0.99));
});

test("maze generation is deterministic per seed", () => {
  const left = generateMaze(21, 15, makeRng(99)).tiles.join("");
  const right = generateMaze(21, 15, makeRng(99)).tiles.join("");
  const other = generateMaze(21, 15, makeRng(100)).tiles.join("");
  assert.equal(left, right);
  assert.notEqual(left, other);
});

test("a full bot match replays bit-for-bit from the seed", () => {
  const run = (seed) => {
    const match = freshMatch({ seed, slots: BOTS, roundCount: 1 });
    for (let i = 0; i < 1200; i++) step(match, [], 1 / 60);
    return fingerprint(match);
  };
  assert.equal(run(123456), run(123456));
  assert.notEqual(run(123456), run(654321));
});
