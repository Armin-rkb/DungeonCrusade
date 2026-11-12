// One byte of input per player per frame. Analog sticks are digitised on the
// client before they reach the simulation so that every peer sees exactly the
// same bits (required for rollback determinism).

export const BTN_LEFT = 1;
export const BTN_RIGHT = 2;
export const BTN_UP = 4;
export const BTN_DOWN = 8;
export const BTN_JUMP = 16;
export const BTN_ATTACK = 32;
/** Crusade mode: sword swing / parry. In Classic it acts as another throw button. */
export const BTN_SWING = 64;

export const MAX_PLAYERS = 4;

export type InputFrame = number[]; // one byte per slot

export function emptyInputs(): InputFrame {
  return [0, 0, 0, 0];
}

export function describeButtons(b: number): string {
  const parts: string[] = [];
  if (b & BTN_LEFT) parts.push('L');
  if (b & BTN_RIGHT) parts.push('R');
  if (b & BTN_UP) parts.push('U');
  if (b & BTN_DOWN) parts.push('D');
  if (b & BTN_JUMP) parts.push('J');
  if (b & BTN_ATTACK) parts.push('A');
  if (b & BTN_SWING) parts.push('S');
  return parts.join('') || '-';
}
