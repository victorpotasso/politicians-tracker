import type { Domain } from '../../src/types/records';

export interface CollectResult<T> {
  records: T[];
  sources: string[];
}

export interface CollectOptions {
  /** Force fresh network requests, bypassing the on-disk cache. */
  force?: boolean;
}

export interface Collector<T = unknown> {
  domain: Domain;
  describe: string;
  run(options: CollectOptions): Promise<CollectResult<T>>;
}
