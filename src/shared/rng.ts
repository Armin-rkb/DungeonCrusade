// Deterministic PRNG (mulberry32). The state is a plain uint32 stored inside
// the game state so it is snapshotted/rolled back together with everything
// else. Only integer ops are used, so results are identical on every JS engine.

export function nextU32(s: { rng: number }): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** Float in [0, 1). */
export function rand(s: { rng: number }): number {
  return nextU32(s) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function randInt(s: { rng: number }, min: number, max: number): number {
  return min + (nextU32(s) % (max - min + 1));
}

export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
