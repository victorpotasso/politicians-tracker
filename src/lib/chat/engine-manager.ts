'use client';

import { useSyncExternalStore } from 'react';
import { isModelCached, isWebGpuAvailable, loadEngine, type MLCEngine } from './webllm';

type Engine = MLCEngine;

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export interface ModelState {
  status: ModelStatus;
  progress: number;
  label: string;
  cached: boolean;
}

let state: ModelState = { status: 'idle', progress: 0, label: '', cached: false };
let engine: Engine | null = null;
let enginePromise: Promise<Engine> | null = null;
let prefetchStarted = false;

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const setState = (patch: Partial<ModelState>) => {
  state = { ...state, ...patch };
  emit();
};

export const getModelState = (): ModelState => state;
export const getEngine = (): Engine | null => engine;

function ensureEngine(): Promise<Engine> | null {
  if (typeof window === 'undefined') return null;
  if (engine) return Promise.resolve(engine);
  if (enginePromise) return enginePromise;
  // Don't relaunch the full (preloader-showing) load after a hard failure —
  // fall straight through to the keyword retriever instead.
  if (state.status === 'error' || state.status === 'unsupported') return null;
  if (!isWebGpuAvailable()) {
    setState({ status: 'unsupported' });
    return null;
  }
  setState({ status: 'loading' });
  enginePromise = loadEngine((progress, label) => setState({ status: 'loading', progress, label }))
    .then((loaded) => {
      engine = loaded;
      setState({ status: 'ready', progress: 1, cached: true });
      return loaded;
    })
    .catch((err) => {
      enginePromise = null;
      setState({ status: 'error' });
      throw err;
    });
  return enginePromise;
}

export async function warmEngine(): Promise<Engine | null> {
  const promise = ensureEngine();
  if (!promise) return null;
  try {
    return await promise;
  } catch {
    return null;
  }
}

/**
 * One-time background download on any page. Skips a fresh ~GB pull on save-data
 * connections but still warms from an existing cache.
 */
export function prefetchModel(): void {
  if (prefetchStarted || typeof window === 'undefined') return;
  prefetchStarted = true;
  if (!isWebGpuAvailable()) {
    setState({ status: 'unsupported' });
    return;
  }
  void isModelCached().then((cached) => {
    setState({ cached });
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!cached && conn?.saveData) return;
    void warmEngine();
  });
}

export function useModelState(): ModelState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getModelState,
    getModelState,
  );
}
