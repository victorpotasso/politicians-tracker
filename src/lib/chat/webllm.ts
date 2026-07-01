/**
 * Thin structural wrapper over `@mlc-ai/web-llm`. Every import of the library
 * is a dynamic `import()` so its WebGPU/worker/BigInt code never enters the
 * server bundle.
 */

// A Gemma 2 build: ~1.5 GB weights, follows instructions well and stays
// grounded. Cached in IndexedDB by WebLLM across visits.
export const DEFAULT_MODEL = 'gemma-2-2b-it-q4f16_1-MLC';

export interface MLCEngine {
  chat: {
    completions: {
      create: (req: {
        messages: Array<{ role: string; content: string }>;
        stream?: boolean;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>>;
    };
  };
}

export type WebLlmEngine = MLCEngine;

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export async function isModelCached(): Promise<boolean> {
  if (!isWebGpuAvailable()) return false;
  try {
    const webllm = await import('@mlc-ai/web-llm');
    if (typeof webllm.hasModelInCache !== 'function') return false;
    return await webllm.hasModelInCache(DEFAULT_MODEL);
  } catch {
    return false;
  }
}

export async function loadEngine(
  onProgress?: (ratio: number, label: string) => void,
): Promise<MLCEngine> {
  const webllm = await import('@mlc-ai/web-llm');
  const engine = await webllm.CreateMLCEngine(DEFAULT_MODEL, {
    initProgressCallback: (report: { progress: number; text: string }) =>
      onProgress?.(report.progress, report.text),
  });
  return engine as unknown as MLCEngine;
}
