/**
 * Mulberry32 seeded RNG. Same seed → same sequence, including seed 0.
 * All gameplay randomness goes through this so matches can be replayed.
 */
export function makeRng(seed) {
  let state = (Math.floor(Number(seed)) >>> 0) + 0x9e3779b9;
  state >>>= 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Integer in [0, n). */
    int(n) {
      return Math.floor(next() * n);
    },
    state() {
      return state >>> 0;
    },
  };
}
