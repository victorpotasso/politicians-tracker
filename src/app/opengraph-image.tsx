import { ImageResponse } from 'next/og';

import { siteConfig } from '@/lib/site';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #171032 55%, #0a0a0a 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #2dd4bf 100%)',
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          NZ
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>Politicians Tracker</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, letterSpacing: -2 }}>
          Public New Zealand political data, decoded.
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.7)' }}>
          MPs · bills · voting records · expenses · opinion polls
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          height: 10,
          width: 320,
          borderRadius: 9999,
          background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #2dd4bf 100%)',
        }}
      />
    </div>,
    { ...size },
  );
}
