'use client';

import { useEffect, useState } from 'react';

/**
 * Gates WebGL canvases off on small viewports. Multiple concurrent WebGL
 * contexts crash mobile Safari and low-end Android, so every shader component
 * must fall back to CSS when this returns `false`. SSR-safe: `false` until mount.
 */
export function useShadersEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const apply = () => setEnabled(!mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);
  return enabled;
}
