'use client';

import { useEffect, useRef } from 'react';
import { useShadersEnabled } from '@/hooks/use-shaders-enabled';
import { cn } from '@/lib/utils';

// Signature accent trio — indigo / magenta / cyan.
const ACCENT = { a: '#4f46e5', b: '#db2777', c: '#06b6d4' };

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_dark;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv; p.x *= aspect;
  vec2 cursor = u_pointer; cursor.x *= aspect;

  float t = u_time * 0.04;
  float pull = 0.18 / (0.12 + distance(p, cursor));

  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t + 4.2));
  vec2 warp = vec2(fbm(p * 2.2 + q + pull), fbm(p * 2.2 - q - t));
  float f = fbm(p * 2.0 + warp * 1.4 + pull * 0.4);

  vec3 col = mix(u_a, u_b, smoothstep(0.2, 0.8, f));
  col = mix(col, u_c, smoothstep(0.5, 1.0, fbm(p * 3.0 + warp)));
  col += spectrum(f + t) * 0.08;

  // Vignette + theme.
  float d = distance(uv, vec2(0.5));
  col *= 1.0 - d * 0.6;
  vec3 light = vec3(0.97, 0.97, 0.99);
  col = mix(light - col * 0.35, col, u_dark);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function AuroraCss({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('absolute inset-0', className)}
      style={{
        backgroundColor: '#0a0612',
        backgroundImage: [
          `radial-gradient(60% 50% at 25% 25%, ${ACCENT.a}66, transparent 70%)`,
          `radial-gradient(55% 45% at 80% 30%, ${ACCENT.b}55, transparent 70%)`,
          `radial-gradient(60% 55% at 55% 85%, ${ACCENT.c}4d, transparent 70%)`,
        ].join(','),
      }}
    />
  );
}

export function ChatAurora({ className }: { className?: string }) {
  const enabled = useShadersEnabled();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const smoothed = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL method, not a React hook.
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      pointer: gl.getUniformLocation(program, 'u_pointer'),
      dark: gl.getUniformLocation(program, 'u_dark'),
      a: gl.getUniformLocation(program, 'u_a'),
      b: gl.getUniformLocation(program, 'u_b'),
      c: gl.getUniformLocation(program, 'u_c'),
    };
    gl.uniform3fv(u.a, hexToRgb(ACCENT.a));
    gl.uniform3fv(u.b, hexToRgb(ACCENT.b));
    gl.uniform3fv(u.c, hexToRgb(ACCENT.c));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const onPointer = (e: PointerEvent) => {
      pointer.current = { x: e.clientX / window.innerWidth, y: 1 - e.clientY / window.innerHeight };
    };
    window.addEventListener('pointermove', onPointer);

    const isDark = () => document.documentElement.classList.contains('dark');
    let dark = isDark() ? 1 : 0;
    const observer = new MutationObserver(() => {
      dark = isDark() ? 1 : 0;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      smoothed.current.x += (pointer.current.x - smoothed.current.x) * 0.06;
      smoothed.current.y += (pointer.current.y - smoothed.current.y) * 0.06;
      gl.uniform1f(u.time, reduce ? 0 : (now - start) / 1000);
      gl.uniform2f(u.pointer, smoothed.current.x, smoothed.current.y);
      gl.uniform1f(u.dark, dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return <AuroraCss className={className} />;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('absolute inset-0 h-full w-full', className)}
    />
  );
}
