import assert from "node:assert/strict";
import test from "node:test";
import { cryptCenter } from "../src/core/constants.js";
import { championOf, rankMatch } from "../src/core/score.js";
import { step } from "../src/core/sim.js";
import { freshMatch, zeros } from "./helpers.js";

test("touching your own crypt banks every carried orb", () => {
  const match = freshMatch({ seed: 4 });
  const ghost = match.round.players[0];
  const home = cryptCenter(21, 15, 0);
  ghost.x = home.x;
  ghost.y = home.y;
  ghost.carried = 4;
  match.round.orbs = [];
  const events = step(match, zeros(), 1 / 60);
  assert.equal(ghost.banked, 4);
  assert.equal(ghost.carried, 0);
  assert.ok(events.some((event) => event.type === "bank" && event.amount === 4));
});

test("a rival crypt does not take your orbs", () => {
  const match = freshMatch({ seed: 4 });
  const ghost = match.round.players[0];
  const rival = cryptCenter(21, 15, 1);
  ghost.x = rival.x;
  ghost.y = rival.y;
  ghost.carried = 3;
  match.round.orbs = [];
  step(match, zeros(), 1 / 60);
  assert.equal(ghost.banked, 0);
  assert.equal(ghost.carried, 3);
});

test("the ghost with the most banked orbs wins the round", () => {
  const match = freshMatch({ seed: 8, roundCount: 3 });
  quiet(match);
  match.round.players[0].banked = 2;
  match.round.players[1].banked = 6;
  match.round.players[2].banked = 4;
  match.round.players[3].banked = 1;
  match.round.time = 0.01;
  step(match, zeros(), 1 / 60);
  assert.equal(match.phase, "roundEnd");
  assert.deepEqual(match.winners, [1]);
  assert.deepEqual(match.roundWins, [0, 1, 0, 0]);
  assert.deepEqual(match.bankedAll, [2, 6, 4, 1]);

  step(match, zeros(), 4);
  assert.equal(match.phase, "playing");
  assert.equal(match.roundIndex, 1);
  assert.equal(match.round.players[1].banked, 0);
});

test("a tied round gives every leader a round win, then the match ranks them", () => {
  const match = freshMatch({ seed: 8, roundCount: 1 });
  quiet(match);
  const banks = [1, 4, 4, 0];
  banks.forEach((banked, i) => {
    match.round.players[i].banked = banked;
  });
  match.round.time = 0.01;
  const events = step(match, zeros(), 1 / 60);
  assert.deepEqual(match.winners, [1, 2]);
  assert.deepEqual(match.roundWins, [0, 1, 1, 0]);
  assert.ok(events.some((event) => event.type === "round"));

  step(match, zeros(), 4);
  assert.equal(match.phase, "matchEnd");
  assert.equal(match.champion, 1);
  assert.deepEqual(match.ranking, [1, 2, 0, 3]);
  assert.ok(events || match.champion === championOf(match));
});

test("match ranking uses round wins, then banked orbs, then fewer banishments", () => {
  const stats = {
    active: [true, true, true, false],
    roundWins: [2, 2, 1, 9],
    bankedAll: [5, 5, 8, 0],
    banishedAll: [3, 1, 0, 0],
  };
  assert.deepEqual(rankMatch(stats), [1, 0, 2]);
  assert.equal(championOf(stats), 1);

  const tied = {
    active: [true, true, true, true],
    roundWins: [1, 1, 0, 0],
    bankedAll: [4, 4, 9, 0],
    banishedAll: [0, 0, 0, 0],
  };
  assert.equal(championOf(tied), 0);
});

test("the countdown ticks on the last three seconds", () => {
  const match = freshMatch();
  quiet(match);
  match.round.time = 3.01;
  match.round.lastCeil = 4;
  const events = step(match, zeros(), 1 / 60);
  assert.ok(events.some((event) => event.type === "countdown" && event.value === 3));
  const again = step(match, zeros(), 1 / 60);
  assert.equal(again.some((event) => event.type === "countdown"), false);
});

function quiet(match) {
  match.round.orbs = [];
  match.round.powerups = [];
  match.round.respawns = [];
  match.round.shiftTimer = 50;
  match.round.powerTimer = 50;
  for (const p of match.round.players) {
    p.carried = 0;
    p.x = 5.5;
    p.y = 5.5;
  }
}
