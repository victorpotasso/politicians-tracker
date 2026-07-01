'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useShadersEnabled } from '@/hooks/use-shaders-enabled';
import { useModelState } from '@/lib/chat/engine-manager';

// Preloader accent trio — violet / magenta / sky.
const ACCENT = { a: '#8b5cf6', b: '#d946ef', c: '#0ea5e9' };

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_progress;
uniform float u_aspect;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;
#define TAU 6.28318530718

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), u.x),
             mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv - 0.5;
  p.x *= u_aspect;
  float r = length(p);
  float t = u_time;

  vec2 warp = vec2(fbm(p * 3.0 + t * 0.3), fbm(p * 3.0 - t * 0.25 + 2.0));
  float n2 = fbm(p * 2.5 + warp * 1.5);
  float radius = 0.26 + 0.018 * sin(t * 3.0) + 0.05 * n2;
  float body = smoothstep(radius + 0.16, radius - 0.16, r);
  float center = smoothstep(0.22, 0.0, r);

  vec3 plasma = mix(u_a, u_b, n2);
  plasma = mix(plasma, u_c, smoothstep(0.3, 0.9, fbm(p * 4.0 + warp)));
  float charge = 0.35 + 0.65 * u_progress;

  vec3 col = vec3(0.0);
  col += plasma * body * charge;
  col += plasma * center * charge * 1.2;

  float ang = atan(p.x, p.y);
  float a = ang < 0.0 ? (ang + TAU) / TAU : ang / TAU;
  float frac = a;
  float ripple = fbm(vec2(cos(ang), sin(ang)) * 2.6 + t * 0.2);
  float head = smoothstep(u_progress + 0.06, u_progress - 0.01, a);
  float trailW = mix(0.16, 0.0, smoothstep(0.92, 1.0, u_progress));
  float trail = smoothstep(0.0, trailW + 0.001, a);
  float loaded = head * trail;
  float dLead = min(abs(a - u_progress), 1.0 - abs(a - u_progress));
  float lead = smoothstep(0.13, 0.0, dLead) * step(u_progress, 0.999);
  float rim = smoothstep(0.07, 0.0, abs(r - radius));
  float hueT = 0.5 - 0.5 * cos(frac * TAU);
  vec3 rimHue = mix(u_a, u_c, hueT);
  vec3 rimColor = mix(u_b, rimHue, 0.55);
  float rimBright = 0.16 + (0.95 + 0.5 * n2) * loaded + lead * 1.0;
  col += rim * rimColor * rimBright * (0.6 + 0.4 * ripple);

  col += smoothstep(0.6, radius, r) * 0.12 * u_a * charge;

  float vign = 1.0 - distance(uv, vec2(0.5)) * 0.9;
  vec3 backdrop = mix(vec3(0.039, 0.024, 0.071), vec3(0.063, 0.024, 0.102), uv.y);
  col += backdrop * vign * (1.0 - body);

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

function LoaderCanvas({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const reduce = useReducedMotion();

  useEffect(() => {
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
      progress: gl.getUniformLocation(program, 'u_progress'),
      aspect: gl.getUniformLocation(program, 'u_aspect'),
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
      gl.uniform1f(u.aspect, canvas.width / Math.max(canvas.height, 1));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let eased = progressRef.current;
    let last = performance.now();
    const start = last;
    const render = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      eased += (progressRef.current - eased) * Math.min(1, delta * 3);
      gl.uniform1f(u.time, reduce ? 0 : (now - start) / 1000);
      gl.uniform1f(u.progress, eased);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduce && Math.abs(progressRef.current - eased) < 0.001) return; // demand-ish
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

function LoaderCss({ percent }: { percent: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundColor: '#0a0612',
        backgroundImage: [
          `radial-gradient(40% 40% at 50% 45%, rgba(217,70,239,${0.25 + percent * 0.004}), transparent 70%)`,
          'radial-gradient(60% 50% at 25% 25%, rgba(139,92,246,0.4), transparent 70%)',
          'radial-gradient(55% 45% at 80% 80%, rgba(14,165,233,0.35), transparent 70%)',
        ].join(','),
      }}
    />
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function ChatPreloader() {
  const model = useModelState();
  const shaders = useShadersEnabled();
  const percent = Math.round(model.progress * 100);

  // Skip the preloader entirely without WebGPU or on failure — the chat falls
  // back to instant keyword search.
  const visible = model.status === 'idle' || model.status === 'loading';

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(12px)' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="absolute inset-0 z-50 overflow-hidden"
        >
          {shaders ? <LoaderCanvas progress={model.progress} /> : <LoaderCss percent={percent} />}

          <div className="absolute inset-0 grid place-items-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 26 }}
              className="w-full max-w-md text-center"
            >
              <h2 className="bg-linear-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text font-display text-3xl font-bold text-transparent sm:text-4xl">
                Waking the assistant
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Loading a private in-browser AI. This happens once — afterwards it's instant and
                works offline.
              </p>

              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, percent)}%` }}
                />
              </div>
              <p className="mt-3 truncate text-xs text-white/45">
                {model.label || `Preparing… ${percent}%`}
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
