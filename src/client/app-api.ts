// The surface of the App that screens use (keeps screens free of circular imports).

import type { TouchControls } from './input/touch';
import type { Connection } from './net/connection';
import type { Session } from './session';
import type { UI } from './ui/core';
import type { StartInfo } from '../shared/protocol';
import type { MatchConfig } from '../shared/types';

export type CouchSlot =
  | { kind: 'human'; device: string; knight: number; ready: boolean }
  | { kind: 'cpu'; knight: number; level: number }
  | null;

export interface OnlineLocal {
  device: string;
  knight: number;
}

export interface LastMatch {
  kind: 'local' | 'online';
  cfg: MatchConfig;
  locals: Map<number, string>;
  names: string[];
}

export interface AppApi {
  ui: UI;
  touch: TouchControls;
  couch: CouchSlot[];
  onlineLocals: OnlineLocal[];
  conn: Connection | null;
  session: Session | null;
  last: LastMatch | null;
  ensureConnection(): Promise<Connection>;
  disconnect(): void;
  startLocal(cfg: MatchConfig, locals: Map<number, string>, names: string[]): void;
  startOnline(start: StartInfo): void;
  /** Stop the running match (no results). */
  stopSession(): void;
  setAttract(on: boolean): void;
  goMainMenu(): void;
  goRoom(): void;
}
