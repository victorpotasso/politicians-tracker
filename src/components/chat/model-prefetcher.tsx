'use client';

import { useEffect } from 'react';
import { prefetchModel } from '@/lib/chat/engine-manager';

/** Starts warming the in-browser model on any page. Mount once in root layout. */
export function ModelPrefetcher() {
  useEffect(() => {
    prefetchModel();
  }, []);
  return null;
}
