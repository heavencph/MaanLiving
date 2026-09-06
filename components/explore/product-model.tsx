"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";

/**
 * These set the *ratio* between the sources, which is what shapes the piece.
 * The overall level lives in the canvas exposure below, so the two can be
 * tuned independently.
 */
const ENV_INTENSITY = 0.35;
const KEY_LIGHT = 0.85;
const FILL_LIGHT = 0.25;
const AMBIENT = 0.14;
const HEMI = 0.22;

/**
 * Measured, not guessed: reading the rendered pixels back off the canvas put
 * the scene at 2.9x the radiance these materials want, which flattened the
 * pieces into near-white silhouettes. This is the one knob that sets level.
 */
const EXPOSURE = 0.3;

/**
 * Pieces are normalised by the radius they sweep as they turn, not by their
 * height. Frankie and the stool are both exactly 1.0 tall, but Frankie's
 * corners reach 0.691 from the axis against the stool's 0.614 — so as it
 * turned, its front-bottom corner swung nearer the camera, projected lower
 * under perspective, and the legs left the bottom of the frame. Fitting the
 * swept cylinder makes the constraint rotation-invariant: whatever the angle,
 * the piece occupies the same footprint.
 */
const FIT_RADIUS = 0.6;
const FIT_HALF_HEIGHT = 0.46;

/**
 * Marble, drawn rather than downloaded — same reasoning as the environment
 * below, and it keeps the promise that nothing here comes from a third-party
 * host. Colours are sampled from the sticker artwork so the modelled piece and
 * the flat one agree: a cream field around rgb(234,228,216) with warm gold
 * veining near rgb(197,167,128).
 */
function createMarbleTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);

  // Deterministic value noise: the grain should be identical on every visit,
  // and identical between two cards showing the same piece.
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const GRID = 64;
  const lattice = new Float32Array(GRID * GRID);
  for (let i = 0; i < lattice.length; i++) lattice[i] = random();

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const at = (x: number, y: number) =>
    lattice[(((y % GRID) + GRID) % GRID) * GRID + (((x % GRID) + GRID) % GRID)];

  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * tx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * tx;
    return a + (b - a) * ty;
  };

  /** Layered noise; the veins follow this rather than running straight. */
  const turbulence = (x: number, y: number) => {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let norm = 0;
    for (let octave = 0; octave < 5; octave++) {
      sum += noise(x * frequency, y * frequency) * amplitude;
      norm += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return sum / norm;
  };

  const BASE = [236, 230, 219];
  const VEIN = [197, 167, 128];
  const SHADE = [214, 205, 190];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8;
      const v = (y / size) * 8;
      const t = turbulence(u, v);

      // Classic marble: a sine field warped by turbulence, so the zero
      // crossings meander into veins instead of parallel stripes.
      const wave = Math.sin((u * 0.9 + t * 3.2) * Math.PI);
      const vein = Math.pow(1 - Math.min(1, Math.abs(wave)), 14);
      const wash = turbulence(u * 0.5 + 11, v * 0.5 + 7);

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const bed = BASE[c] + (SHADE[c] - BASE[c]) * wash * 0.75;
        image.data[i + c] = Math.round(bed + (VEIN[c] - bed) * vein * 0.85);
      }
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * The GLB carries no UVs, so a map has nothing to sit on. The top is a slab,
 * which makes this straightforward: find the axis it is thin along and project
 * the other two. Grain then runs across the face the way it would be cut, and
 * the sliver of edge takes a stretched streak — which is what a sawn edge
 * looks like anyway.
 */
function projectSlabUVs(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute("uv")) return;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const span = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z];
  const thin = span.indexOf(Math.min(...span));
  const [a, b] = [0, 1, 2].filter((axis) => axis !== thin);

  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  const min = [box.min.x, box.min.y, box.min.z];

  for (let i = 0; i < position.count; i++) {
    const p = [position.getX(i), position.getY(i), position.getZ(i)];
    uv[i * 2] = (p[a] - min[a]) / (span[a] || 1);
    uv[i * 2 + 1] = (p[b] - min[b]) / (span[b] || 1);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/**
 * A procedural studio environment. The pieces carry polished materials, and
 * without something to reflect a low roughness just reads as dark. This is
 * generated in memory, so it costs no request and cannot fail to load.
 */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl);

  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    return target.texture;
  }, [gl]);

  useEffect(() => () => texture.dispose(), [texture]);

  return <primitive object={texture} attach="environment" />;
}

function Piece({ rotationY, src }: { rotationY: MotionValue<number>; src: string }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, src);

  // The GLB already carries its materials and crease-angle normals, so this
  // only takes a copy. Recomputing normals here would flatten every hard edge
  // the export deliberately kept sharp.
  // clone(true) shares materials with the loader's cached scene, so the
  // materials are cloned before touching them.
  const marble = useMemo(() => createMarbleTexture(), []);
  useEffect(() => () => marble.dispose(), [marble]);

  const { scene, fit } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const material = child.material.clone();
        material.envMapIntensity = ENV_INTENSITY;

        // The export names the slab and its material; either is enough to
        // find it, and matching both survives one of them being renamed.
        if (child.name === "marble_top" || material.name === "marble") {
          projectSlabUVs(child.geometry);
          material.map = marble;
          // the flat baseColor would otherwise tint the whole map
          material.color.set("#ffffff");
          material.needsUpdate = true;
        }

        child.material = material;
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const radius = Math.max(
      Math.hypot(box.min.x, box.min.z),
      Math.hypot(box.min.x, box.max.z),
      Math.hypot(box.max.x, box.min.z),
      Math.hypot(box.max.x, box.max.z)
    );
    const halfHeight = Math.max(Math.abs(box.min.y), Math.abs(box.max.y));

    return {
      scene: cloned,
      fit: Math.min(FIT_RADIUS / (radius || 1), FIT_HALF_HEIGHT / (halfHeight || 1)),
    };
  }, [gltf, marble]);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.degToRad(rotationY.get());
    // gentle idle float, independent of scroll
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
  });

  return (
    <group ref={group} scale={fit}>
      <primitive object={scene} />
    </group>
  );
}

export function ProductModel({
  rotationY,
  src,
  active,
}: {
  rotationY: MotionValue<number>;
  src: string;
  /** Whether the piece is on screen. Off screen it stops drawing entirely. */
  active: boolean;
}) {
  return (
    <Canvas
      /**
       * A scene left to itself redraws sixty times a second for as long as it
       * is mounted, and both pieces were doing that whether or not either was
       * on screen — the page never went quiet, which on a phone is the
       * battery. A piece nobody is looking at has nothing to say, so it holds
       * its last frame and stops.
       */
      frameloop={active ? "always" : "never"}
      // 28 degrees of elevation, looking slightly down onto the top surface
      camera={{ position: [0, 1.202, 2.356], fov: 32 }}
      onCreated={({ camera }) => camera.lookAt(0, -0.05, 0)}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: EXPOSURE,
      }}
      // the card sits in a sticky, opacity-animated parent; measuring by
      // offsetWidth/Height instead of the bounding rect keeps the canvas
      // from mounting at the default 300x150
      resize={{ offsetSize: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <StudioEnvironment />
      <ambientLight intensity={AMBIENT} />
      <hemisphereLight args={["#fffaf0", "#b9a684", HEMI]} />
      <directionalLight position={[3.5, 5, 3]} intensity={KEY_LIGHT} />
      <directionalLight position={[-4, 1.5, -2.5]} intensity={FILL_LIGHT} color="#f0e2c4" />
      <Suspense fallback={null}>
        <Piece rotationY={rotationY} src={src} />
      </Suspense>
    </Canvas>
  );
}
