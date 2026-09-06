"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A heading whose letters are dragged along by the cursor and spring back.
 *
 * After Originkit's Mesh Text Hover, with three departures that this site
 * needs and the original did not have to care about.
 *
 * The text stays real text. The original replaces the heading with a canvas,
 * which costs the outline, the selection, the translation and every screen
 * reader. Here the `<h2>` is untouched and merely turns transparent while the
 * canvas paints over it; the canvas is `aria-hidden` decoration.
 *
 * The canvas copies the browser's own layout. Rather than laying the text out
 * again — which for mixed Chinese and Latin at a responsive size would drift —
 * every character's box is measured out of the live DOM with a Range and drawn
 * at exactly that position. Line breaks, balanced wrapping and letter-spacing
 * therefore match by construction.
 *
 * And the whole apparatus is built once, off the critical moment. Every
 * heading on the page shares one WebGL context, one compiled program and one
 * canvas, because only one heading can be under the pointer at a time; that
 * shared rig is warmed during an idle callback after mount. Building it at
 * hover time instead cost a 53ms task — a visible hitch exactly when the
 * animation was supposed to start — of which 14ms was creating the context
 * and the rest compiling shaders and filling a 3,977-vertex grid.
 */

const GRID_W = 96;
const GRID_H = 40;
/** Gentler than the original's 1.8 — a heading should ripple, not slosh. */
const DRAG = 1.05;
const SPRING_K = 0.08;
const DAMPING = 0.9;
const DT = 0.1;
const CHROMA = 0.005;
/** Room around the text for glyphs dragged past their own box. */
const PAD = 28;
/**
 * Widest texture we will build. The hero's marquee is 2,500px across, which at
 * two device pixels per CSS pixel would be a 12MB texture and a shared buffer
 * that every heading then has to carry. Anything wider than this is rendered
 * at less than device resolution instead — on ghost text at six percent
 * opacity nobody can tell, and the buffer stays a couple of megabytes.
 */
const MAX_TEXTURE_PX = 2048;
/** Below this much displacement the mesh is at rest and can stop. */
const REST = 0.0006;
/**
 * The canvas only takes the text over while the mesh is actually moving.
 *
 * Standing still, the canvas and the browser hint glyphs onto two different
 * pixel grids — the canvas's own origin against the page's — and the letters
 * can land a device pixel apart. Nothing about the arithmetic is wrong; it was
 * checked to the thousandth. But a still heading swapping to a copy of itself
 * one pixel down reads as the typeface changing under the cursor, which is
 * exactly what it looked like.
 *
 * So the swap happens only when there is something to show for it. Above the
 * first threshold the letters are already being dragged out of shape and a
 * pixel is invisible; below the second they are back at rest and the DOM's own
 * text is what you see. The gap between the two keeps it from flickering.
 */
const SHOW = 0.0025;
const HIDE = 0.001;

/**
 * The two-colour fringe. The original splits into magenta and green, which on
 * a furniture catalogue reads as a broken monitor. These are the warm gold and
 * pale stone already sampled from the artwork for the marble in the 3D viewer,
 * so the fringe looks like light through the edge of the letter.
 */
const FRINGE_A: [number, number, number] = [197 / 255, 167 / 255, 128 / 255];
const FRINGE_B: [number, number, number] = [214 / 255, 205 / 255, 190 / 255];

const VERT_SRC = `#version 300 es
in vec2 aPos;
in vec2 aUv;
in vec2 aDisp;
out vec2 vUv;
out float vMag;
void main() {
  gl_Position = vec4(aPos + aDisp, 0.0, 1.0);
  vUv = aUv;
  vMag = length(aDisp);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
in float vMag;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec3 uColorA;
uniform vec3 uColorB;
void main() {
  vec4 base = texture(uTex, vUv);
  float o = ${CHROMA.toFixed(5)} * clamp(vMag * 8.0, 0.0, 1.0);
  float aOff = texture(uTex, vUv + vec2(o, 0.0)).a;
  float bOff = texture(uTex, vUv - vec2(o, 0.0)).a;
  vec3 col = base.rgb;
  col += uColorA * max(0.0, aOff - base.a);
  col += uColorB * max(0.0, bOff - base.a);
  outColor = vec4(col, max(base.a, max(aOff, bOff)));
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
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

/* ────────────────────────────────────────────────────────────────────────
   The shared rig. One per page, not one per heading.
   ──────────────────────────────────────────────────────────────────────── */

type Renderer = {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  dispBuf: WebGLBuffer;
  indexCount: number;
  disp: Float32Array;
  vel: Float32Array;
  positions: Float32Array;
  blank: WebGLTexture;
  /** Which MeshText currently holds the canvas. */
  owner: number | null;
};

/**
 * The buffer only ever grows, to the largest heading on the page, and the
 * grow happens while preparing textures during idle. A hover therefore never
 * reallocates it — that cost showed up as 7ms of the remaining hitch.
 */
function fit(r: Renderer, pxW: number, pxH: number) {
  if (pxW <= r.canvas.width && pxH <= r.canvas.height) return;
  // Rounded up to an even number of device pixels, because the CSS size that
  // scales the buffer back onto the page is buffer ÷ density, and every
  // density here is 2, 1 or ½. An odd buffer gave the canvas a layout box of
  // 166.5px, which the compositor resampled — every glyph came back very
  // slightly soft, and at two device pixels per CSS pixel the difference
  // against the DOM text it replaced was thirty times what it is now.
  const even = (n: number) => Math.ceil(n / 2) * 2;
  r.canvas.width = even(Math.max(r.canvas.width, pxW));
  r.canvas.height = even(Math.max(r.canvas.height, pxH));
  primed = false;
}

let primed = false;

/**
 * Draw one invisible frame so the compositor builds and uploads this layer,
 * and the driver sets up the draw pipeline, before anybody hovers. A layer at
 * `opacity: 0` is skipped entirely, so it is made a five-hundredth visible for
 * two frames instead — which is why this waits for the buffer to have reached
 * its final size. Without it the page's first hover cost 42ms against the
 * 18ms every later one costs.
 */
function primeLayer() {
  const r = getRig();
  if (!r || primed) return;
  primed = true;
  const { gl, canvas } = r;
  canvas.style.opacity = "0.002";
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.bindTexture(gl.TEXTURE_2D, r.blank);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, r.indexCount, gl.UNSIGNED_INT, 0);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (r.owner === null) canvas.style.opacity = "0";
    })
  );
}

/** `undefined` — not attempted yet. `null` — attempted and unsupported. */
let rig: Renderer | null | undefined;

function build(): Renderer | null {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  // Fixed, and in the page from the start. Inserting a canvas at hover time
  // meant the browser building a compositing layer for it at the exact moment
  // the animation began; parking it here pays that once. Fixed also keeps an
  // oversized buffer from widening the document — a fixed box contributes
  // nothing to scrollable overflow. z-40 leaves the header (z-50) on top.
  canvas.style.cssText =
    "position:fixed;left:0;top:0;z-index:40;opacity:0;pointer-events:none;will-change:transform";
  // No multisampling: the letters' edges come from the texture's own alpha,
  // not from the geometry, so MSAA would only make the buffer four times the
  // size and the per-heading resize slower.
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const vertCount = (GRID_W + 1) * (GRID_H + 1);
  const positions = new Float32Array(vertCount * 2);
  const uvs = new Float32Array(vertCount * 2);
  for (let y = 0; y <= GRID_H; y++) {
    for (let x = 0; x <= GRID_W; x++) {
      const i = y * (GRID_W + 1) + x;
      const u = x / GRID_W;
      const v = y / GRID_H;
      positions[i * 2] = u * 2 - 1;
      positions[i * 2 + 1] = 1 - v * 2;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
  }
  const indices = new Uint32Array(GRID_W * GRID_H * 6);
  let k = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const a = y * (GRID_W + 1) + x;
      const c = a + (GRID_W + 1);
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = a + 1;
      indices[k++] = a + 1;
      indices[k++] = c;
      indices[k++] = c + 1;
    }
  }

  // The one and only VAO; nothing else ever binds, so it stays current.
  gl.bindVertexArray(gl.createVertexArray());
  const attach = (name: string, data: Float32Array, usage: number) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return buffer;
  };
  attach("aPos", positions, gl.STATIC_DRAW);
  attach("aUv", uvs, gl.STATIC_DRAW);
  const disp = new Float32Array(vertCount * 2);
  const dispBuf = attach("aDisp", disp, gl.DYNAMIC_DRAW);

  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // Context state that never changes, set once here rather than every frame.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);
  gl.uniform3f(gl.getUniformLocation(program, "uColorA"), ...FRINGE_A);
  gl.uniform3f(gl.getUniformLocation(program, "uColorB"), ...FRINGE_B);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0);

  // One transparent texel, so the priming draw below has something bound and
  // paints nothing whatever the sampler would otherwise have read.
  const blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  document.body.appendChild(canvas);

  return {
    blank,
    canvas,
    gl,
    dispBuf,
    indexCount: indices.length,
    disp,
    vel: new Float32Array(vertCount * 2),
    positions,
    owner: null,
  };
}

function getRig() {
  if (rig === undefined) rig = build();
  return rig;
}

/**
 * A coarse pointer has no hover to speak of and reduced motion has asked for
 * none, so on a phone none of this should be built at all — checked before the
 * warm-up rather than only at hover time, or a phone would pay for a WebGL
 * context and a megabyte of buffer it can never use.
 */
function usable() {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let warmScheduled = false;
/** Pay for the context and the shader compile while the page is otherwise idle. */
function scheduleWarmUp() {
  if (warmScheduled || !usable()) return;
  warmScheduled = true;
  const run = () => getRig();
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}

/** Every character's box, read out of the live layout. */
type Glyph = {
  char: string;
  x: number;
  top: number;
  height: number;
  /** Any stretch applied to this run, so the canvas can draw it the same. */
  sx: number;
  sy: number;
  font: string;
};

/**
 * How much a run of text has been stretched by its ancestors.
 *
 * Both properties matter: Tailwind v4 writes `scale-x-125` to the `scale`
 * property rather than into `transform`, so reading only the matrix reported
 * no stretch at all — and the hero's wordmark, which is 1.25 wide and 0.9
 * tall, snapped back to the plain letterforms the moment the canvas took over.
 */
function fontOf(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

/** Where the alphabetic baseline falls inside a glyph box, for the font in hand. */
function baselineShare(ctx: CanvasRenderingContext2D) {
  const m = ctx.measureText("M");
  const total = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  return total > 0 ? m.fontBoundingBoxAscent / total : 0.8;
}

function stretchOf(node: Node) {
  let sx = 1;
  let sy = 1;
  // Climbs to the document root, not just to the MeshText's own host span.
  // The hero's marquee stretches each repeat from a `motion.div` wrapping
  // the host, not from anything inside it, and stopping at the host missed
  // that: the canvas drew the pre-stretch font size inside a box measured
  // after the stretch, so the glyphs came in small the moment the pointer
  // triggered the swap.
  let el = node.parentElement;
  while (el) {
    const cs = getComputedStyle(el);
    if (cs.transform && cs.transform !== "none") {
      const m = new DOMMatrixReadOnly(cs.transform);
      sx *= m.a;
      sy *= m.d;
    }
    if (cs.scale && cs.scale !== "none") {
      const parts = cs.scale.split(/[\s,]+/).map(Number);
      if (Number.isFinite(parts[0])) {
        sx *= parts[0];
        sy *= Number.isFinite(parts[1]) ? parts[1] : parts[0];
      }
    }
    el = el.parentElement;
  }
  return { sx, sy };
}

function measureGlyphs(host: HTMLElement): { glyphs: Glyph[]; box: DOMRect } | null {
  const box = host.getBoundingClientRect();
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const glyphs: Glyph[] = [];

  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? "";
    const { sx, sy } = stretchOf(node);
    // Built by hand: Chromium returns an empty string for the `font`
    // shorthand whenever it cannot round-trip it, which is most of the time.
    // Trusting it meant every run looked font-less, the baseline ratio below
    // never got computed, and the fallback 0.8 drew the text a full 5 device
    // pixels lower than the DOM it was standing in for.
    const font = fontOf(node.parentElement ?? host);
    for (let i = 0; i < text.length; i++) {
      if (!text[i].trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      // The box, not a guess at where the glyph sits inside it — the baseline
      // is worked out from the font's own metrics further down.
      glyphs.push({
        char: text[i],
        x: r.left - box.left,
        top: r.top - box.top,
        height: r.height,
        sx,
        sy,
        font,
      });
    }
    node = walker.nextNode();
  }

  return glyphs.length ? { glyphs, box } : null;
}

type Prepared = { key: string; tex: WebGLTexture; cssW: number; cssH: number; pxW: number; pxH: number; dpr: number };

/**
 * Draw one heading into a texture. Everything expensive about a hover lives
 * here — laying the glyphs out, rasterising them into a 2D canvas and pushing
 * that to the GPU — which is exactly why it is called from an idle callback
 * long before anybody hovers, and only falls back to hover time if the idle
 * pass has not reached this heading yet.
 */
/**
 * Where the element sits between whole CSS pixels, in quarter-pixel steps.
 *
 * The canvas has to be parked on a whole CSS pixel — at 364.5 the compositor
 * resampled the layer and the heading differed from its own DOM text by 204
 * levels, against 9 for the ones that happened to land on 364 — so the
 * fraction that would otherwise be lost is drawn into the texture instead.
 * Quantised so that a page which scrolls by a hair does not rebuild it.
 */
function subpixel(element: HTMLElement) {
  const r = element.getBoundingClientRect();
  const frac = (v: number) => v - Math.floor(v);
  return { dx: frac(r.left - PAD), dy: frac(r.top - PAD) };
}

function prepare(element: HTMLElement, previous: Prepared | null): Prepared | null {
  const r = getRig();
  if (!r) return null;

  const measured = measureGlyphs(element);
  if (!measured) return null;
  const { glyphs, box } = measured;

  const cssW = box.width + PAD * 2;
  const cssH = box.height + PAD * 2;
  // Halved rather than scaled by an arbitrary ratio, so the density is always
  // the screen's, or a clean half or quarter of it. Anything in between makes
  // buffer ÷ density fractional, and a canvas with a fractional layout box is
  // resampled by the compositor.
  const base = Math.min(window.devicePixelRatio || 1, 2);
  let dpr = base;
  while (cssW * dpr > MAX_TEXTURE_PX && dpr > base / 4) dpr /= 2;
  const pxW = Math.max(2, Math.ceil(cssW * dpr));
  const pxH = Math.max(2, Math.ceil(cssH * dpr));

  const style = getComputedStyle(element);
  const { dx, dy } = subpixel(element);
  const key = `${pxW}x${pxH}|${style.font}|${style.color}|${element.textContent ?? ""}|${dx.toFixed(3)},${dy.toFixed(3)}`;
  if (previous && previous.key === key) return previous;

  const flat = document.createElement("canvas");
  flat.width = pxW;
  flat.height = pxH;
  const ctx = flat.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = style.color;
  const hostFont = fontOf(element);
  ctx.font = hostFont;

  // Sit the glyphs on their real baseline. `textBaseline: "middle"` centres
  // them on the em square, which is not where the browser puts them inside a
  // line box — measured, it drew the whole heading 2px high, and on the first
  // hover the title appeared to jump upwards. Splitting the measured box by
  // the font's own ascent-to-descent ratio lands on the same baseline the
  // layout used, whatever the font.
  // Where the alphabetic baseline sits inside a glyph's box, split by the
  // font's own ascent-to-descent ratio.
  //
  // A zero-height inline-block rests exactly on the baseline and looked like a
  // more direct way to ask the layout the same question — but only for a run
  // of plain inline text. The hero's marquee is a flex row, so the strut fell
  // onto a line of its own below it: it reported the baseline 100px too low
  // and grew the element by a whole line while it was being measured, which is
  // what made the marquee drop the moment it was hovered. On every heading the
  // two agreed to the pixel, so the strut was buying nothing and costing that.
  ctx.textBaseline = "alphabetic";

  // Each run may carry its own font and its own stretch. `share` says where
  // the baseline falls inside a glyph's box for the font in hand; the box was
  // measured after stretching, so it is divided back out before drawing and
  // reapplied by the transform.
  let current = hostFont;
  let share = baselineShare(ctx);
  for (const g of glyphs) {
    if (g.font !== current) {
      current = g.font;
      ctx.font = g.font;
      share = baselineShare(ctx);
    }
    const x = g.x + PAD + dx;
    const y = g.top + PAD + dy;
    if (g.sx === 1 && g.sy === 1) {
      ctx.fillText(g.char, x, y + g.height * share);
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(g.sx, g.sy);
    ctx.fillText(g.char, 0, (g.height / g.sy) * share);
    ctx.restore();
  }

  const { gl } = r;
  if (previous) gl.deleteTexture(previous.tex);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flat);
  fit(r, pxW, pxH);
  return { key, tex, cssW, cssH, pxW, pxH, dpr };
}

/**
 * Headings waiting to be drawn into a texture, worked through one per idle
 * slot so the preparation never becomes a stall of its own.
 */
const queue = new Set<() => void>();
let draining = false;

function drain(deadline?: IdleDeadline) {
  draining = false;
  for (const job of queue) {
    queue.delete(job);
    job();
    if (deadline && deadline.timeRemaining() < 4) break;
  }
  if (queue.size) schedule();
  else primeLayer();
}

function schedule() {
  if (draining || !usable()) return;
  draining = true;
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(drain, { timeout: 4000 });
  else window.setTimeout(drain, 1500);
}

let nextId = 1;

export function MeshText({
  children,
  layer = 40,
  className,
}: {
  children: ReactNode;
  /**
   * Where the canvas sits in the stacking order. The default clears the page
   * content and stops below the header. The hero's marquee is background at
   * `z-0` and passes 5, so its canvas replaces the ghost text without leaping
   * in front of the floating pieces at `z-10` or the headline at `z-20`.
   */
  layer?: number;
  className?: string;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const id = useRef<number | null>(null);
  if (id.current == null) id.current = nextId++;

  const [active, setActive] = useState(false);
  /** Set on pointerleave; the loop lets go once the mesh stops moving. */
  const leaving = useRef(false);
  /** This heading, already drawn into a texture. */
  const ready = useRef<Prepared | null>(null);

  // Warm the shared rig, then draw this heading into its texture — both while
  // the page is idle, so that a hover has nothing left to build.
  useEffect(() => {
    scheduleWarmUp();
    const job = () => {
      if (host.current) ready.current = prepare(host.current, ready.current);
    };
    queue.add(job);
    schedule();
    return () => {
      queue.delete(job);
    };
  }, []);

  // Textures belong to the shared context, so they outlive this component
  // unless it takes them with it.
  useEffect(() => {
    const held = ready;
    return () => {
      if (held.current && rig) rig.gl.deleteTexture(held.current.tex);
      held.current = null;
    };
  }, []);

  const onEnter = useCallback(() => {
    if (typeof window === "undefined") return;
    // Without a usable pointer or WebGL2 the heading simply stays plain text,
    // which is what it was anyway.
    if (!usable() || !getRig()) return;
    leaving.current = false;
    setActive(true);
  }, []);

  const onLeave = useCallback(() => {
    leaving.current = true;
  }, []);

  useEffect(() => {
    if (!active) return;
    const element = host.current;
    const r = getRig();
    if (!element || !r) return;

    // Normally already done during idle; this only bites if the pointer beat
    // the idle pass to it, or the heading has been resized since.
    const prepared = prepare(element, ready.current);
    if (!prepared) return;
    ready.current = prepared;

    const { gl, canvas } = r;
    const me = id.current!;
    const { cssW, cssH, pxW, pxH } = prepared;

    fit(r, pxW, pxH);
    // The buffer is shared and sized for the largest caller, but each one may
    // have been rendered at a different density, so the CSS size that scales
    // it back onto the page is set per activation rather than once.
    canvas.style.width = `${canvas.width / prepared.dpr}px`;
    canvas.style.height = `${canvas.height / prepared.dpr}px`;
    canvas.style.zIndex = String(layer);
    // The used corner of a buffer that may be larger; WebGL counts from the
    // bottom, so the heading occupies the top-left in CSS terms.
    gl.viewport(0, canvas.height - pxH, pxW, pxH);
    gl.bindTexture(gl.TEXTURE_2D, prepared.tex);

    /**
     * Follow the heading, which scrolls while the canvas does not, staying on
     * whole CSS pixels. The fraction is not thrown away — `subpixel` above put
     * it into the texture, so the letters still land exactly where the DOM
     * would have drawn them.
     */
    const place = () => {
      const rect = element.getBoundingClientRect();
      canvas.style.transform = `translate3d(${Math.floor(rect.left - PAD)}px, ${Math.floor(rect.top - PAD)}px, 0)`;
    };

    const { disp, vel, positions, dispBuf, indexCount } = r;
    disp.fill(0);
    vel.fill(0);

    r.owner = me;
    place();

    // Clear out whatever the last heading left in the buffer, so that the
    // first frame this one reveals cannot be somebody else's text.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Not shown yet — the first movement brings it in. See SHOW/HIDE above.
    let shown = false;
    const reveal = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.opacity = on ? "1" : "0";
      if (on) element.dataset.meshActive = "true";
      else delete element.dataset.meshActive;
    };

    const cursor = { x: 99, y: 99, px: 99, py: 99, inside: false };
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - (rect.left - PAD)) / cssW) * 2 - 1;
      const y = 1 - ((event.clientY - (rect.top - PAD)) / cssH) * 2;
      if (!cursor.inside) {
        cursor.px = x;
        cursor.py = y;
        cursor.inside = true;
      }
      cursor.x = x;
      cursor.y = y;
    };
    const forget = () => {
      cursor.inside = false;
      cursor.x = cursor.px = 99;
      cursor.y = cursor.py = 99;
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", forget);

    const vertCount = positions.length / 2;
    let raf = 0;
    let stopped = false;
    const tick = () => {
      // Something else took the canvas. Stand down properly rather than just
      // stopping: the text is transparent because this was painting it, and
      // leaving the flag set with nothing drawing meant the whole line simply
      // vanished. The hero's marquee sits under the headline, so the cursor
      // crosses one on its way to the other and hit this every time.
      if (r.owner !== me) {
        stopped = true;
        // Hand the text back this instant rather than waiting for React to
        // get round to the cleanup. The hero's marquee sits under the
        // headline, so moving from one to the other takes the canvas away
        // mid-frame — and until the flag came off, the marquee was
        // transparent with nothing drawing it, which is the half second of
        // nothing you could see.
        reveal(false);
        setActive(false);
        return;
      }

      let vx = cursor.x - cursor.px;
      let vy = cursor.y - cursor.py;
      // A jump this large is the pointer re-entering, not a swipe.
      if (Math.hypot(vx, vy) > 0.3) {
        vx = 0;
        vy = 0;
      }
      cursor.px = cursor.x;
      cursor.py = cursor.y;

      let moving = 0;
      for (let i = 0; i < vertCount; i++) {
        const i2 = i * 2;
        const dx = disp[i2];
        const dy = disp[i2 + 1];
        const cd = Math.hypot(cursor.x - (positions[i2] + dx), cursor.y - (positions[i2 + 1] + dy));
        const proximity = Math.max(0, 1 / (1 + cd / 0.05) - 0.1);

        let nvx = vel[i2] + vx * DRAG * proximity - dx * SPRING_K;
        let nvy = vel[i2 + 1] + vy * DRAG * proximity - dy * SPRING_K;
        nvx *= DAMPING;
        nvy *= DAMPING;
        vel[i2] = nvx;
        vel[i2 + 1] = nvy;

        disp[i2] = Math.max(-1, Math.min(1, dx + nvx * DT));
        disp[i2 + 1] = Math.max(-1, Math.min(1, dy + nvy * DT));
        moving = Math.max(moving, Math.abs(disp[i2]), Math.abs(disp[i2 + 1]));
      }

      // Pointer gone and the springs unwound: hand the text back to the DOM.
      // The rig itself stays warm for the next heading.
      if (leaving.current && moving < REST) {
        stopped = true;
        setActive(false);
        return;
      }

      place();
      if (moving > SHOW) reveal(true);
      else if (moving < HIDE) reveal(false);

      if (shown) {
        gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (!stopped) cancelAnimationFrame(raf);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", forget);
      delete element.dataset.meshActive;
      shown = false;
      // Only if it is still ours — a fast move to the next heading will have
      // handed the canvas on already.
      if (r.owner === me) {
        r.owner = null;
        canvas.style.opacity = "0";
      }
    };
  }, [active, layer]);

  return (
    <span
      ref={host}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      // The text is still here and still selectable; while the canvas paints
      // it, the glyphs themselves are simply not inked.
      className={cn(
        "relative inline-block [&[data-mesh-active]]:text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
