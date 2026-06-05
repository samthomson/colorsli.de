import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lookupTile, colorChangerColorAt, type TilePalette } from '@/lib/tile';
import { useWindowActive } from '@/hooks/useWindowActive';
import type { Board } from '@/lib/colorSlide';

/**
 * Approach B: a WebGL overlay that renders each color/changer tile as a true
 * 3D glossy sphere, positioned to match the DOM grid underneath it exactly.
 *
 * The DOM grid (in ColourSlideGame) stays mounted for hit-testing, layout,
 * and non-color sprites (images, emoji, treasure chests, hidden "?"). In
 * WebGL mode those color cells are rendered transparent in the DOM and this
 * canvas paints the spheres on top, tracking the same per-cell drag offset,
 * oscillation, and match-burst the CSS renderer uses — just in real 3D.
 *
 * `useFrame` re-registers its callback every render, so reading props inside
 * the loop always sees fresh board/drag/match state without a props ref.
 */

const GRID_GAP_PX = 4; // matches Tailwind `gap-1` on the board grid.

export type BubbleBoardGLProps = {
  board: Board;
  tiles: TilePalette;
  revealed: ReadonlySet<string>;
  dragging: {
    type: 'row' | 'col' | 'undecided';
    index: number;
    offsetX: number;
    offsetY: number;
  } | null;
  matching: { row: number; col: number }[];
};

const VERTEX = /* glsl */ `
  uniform vec2 uResolution;

  varying vec3 vNormalView;
  varying vec3 vColor;
  varying vec2 vUV;      // bubble centre, normalized across the board (0..1)
  varying float vSeed;   // stable-ish per-bubble random for lighting variety

  void main() {
    vColor = instanceColor;

    vec3 invScale = vec3(
      inversesqrt(dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz)),
      inversesqrt(dot(instanceMatrix[1].xyz, instanceMatrix[1].xyz)),
      inversesqrt(dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz))
    );
    mat3 instanceRot = mat3(
      instanceMatrix[0].xyz * invScale.x,
      instanceMatrix[1].xyz * invScale.y,
      instanceMatrix[2].xyz * invScale.z
    );
    vNormalView = normalize(normalMatrix * (instanceRot * normal));

    vec2 center = instanceMatrix[3].xy;
    vUV = center / max(uResolution, vec2(1.0));
    vSeed = fract(sin(dot(floor(center / 24.0), vec2(12.9898, 78.233))) * 43758.5453);

    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vColor;
  varying vec2 vUV;
  varying float vSeed;

  void main() {
    vec3 N = normalize(vNormalView);

    // The light direction sweeps across the board like one big soft studio
    // light overhead-left, plus a per-bubble jitter so no two catch it the
    // same way — kills the "every sphere looks identical" flatness.
    vec3 L = normalize(vec3(
      mix(-0.85, 0.85, vUV.x) + (vSeed - 0.5) * 0.5,
      mix(0.95, -0.35, vUV.y) + (vSeed - 0.5) * 0.4,
      0.7 + vSeed * 0.25
    ));

    float ndl = dot(N, L);
    float diff = ndl * 0.5 + 0.5;           // half-Lambert, soft wrap
    float shade = 0.72 + 0.85 * diff;       // brighter, richer body

    // Blinn specular — its tightness varies per bubble for extra variety.
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float specPow = mix(40.0, 90.0, vSeed);
    float spec = pow(max(dot(N, H), 0.0), specPow);

    float facing = max(N.z, 0.0);
    float fresnel = pow(1.0 - facing, 2.6);

    // Soap-film iridescence concentrated at the rim, phase offset per bubble.
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fresnel * 1.6 + vSeed) + vec3(0.0, 2.094, 4.188));

    vec3 col = vColor * shade;
    col += irid * fresnel * 0.35;           // rim shimmer (lighter, less washout)
    col += vec3(1.0) * spec * 1.2;          // crisp highlight

    // Mostly opaque so the colour stays vivid over the light board, with just
    // a hint of translucency in the centre for a glassy feel. The rim and the
    // specular hotspot are fully opaque so it still reads as a glossy bubble.
    float alpha = mix(0.82, 1.0, fresnel);
    alpha = clamp(max(alpha, spec), 0.0, 1.0);

    gl_FragColor = vec4(col, alpha);
  }
`;

type CellState = {
  /** Clock-space timestamp (s) at which this cell entered the matching set. */
  burstStart: number;
};

function Spheres({ board, tiles, revealed, dragging, matching }: BubbleBoardGLProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const cellStatesRef = useRef<Map<string, CellState>>(new Map());
  const timeRef = useRef(0);

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const maxInstances = Math.max(1, rows * cols);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uResolution: { value: new THREE.Vector2(1, 1) } },
        toneMapped: false,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const colorArray = useMemo(
    () => new Float32Array(maxInstances * 3),
    [maxInstances],
  );

  const scratch = useMemo(
    () => ({ dummy: new THREE.Object3D(), color: new THREE.Color() }),
    [],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (rows === 0 || cols === 0) return;

    // Clamped accumulator (see CirclesBackground) so pause/resume on tab
    // switch continues smoothly instead of fast-forwarding the wobble/burst.
    timeRef.current += Math.min(delta, 0.05);

    const W = state.size.width;
    const Hpx = state.size.height;

    // Keep the orthographic camera locked to the canvas pixel box so sphere
    // positions can be expressed directly in DOM pixels (y flipped).
    const cam = state.camera as THREE.OrthographicCamera;
    if (cam.right !== W || cam.top !== Hpx || cam.left !== 0) {
      cam.left = 0;
      cam.right = W;
      cam.top = Hpx;
      cam.bottom = 0;
      cam.near = -1000;
      cam.far = 1000;
      cam.position.set(0, 0, 10);
      cam.updateProjectionMatrix();
    }

    material.uniforms.uResolution.value.set(W, Hpx);

    const cellW = (W - GRID_GAP_PX * (cols - 1)) / cols;
    const cellH = (Hpx - GRID_GAP_PX * (rows - 1)) / rows;
    const baseR = (Math.min(cellW, cellH) / 2) * 0.94;

    const t = timeRef.current;
    const matchSet = new Set(matching.map((m) => `${m.row}-${m.col}`));
    const states = cellStatesRef.current;
    const { dummy, color } = scratch;

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (i >= maxInstances) break;
        const cellId = board[r][c];
        const key = `${r}-${c}`;

        // Resolve whether this cell is a plain sphere, and its color.
        let hex: string | null = null;
        if (cellId) {
          const tile = lookupTile(tiles, cellId);
          const behavior = tile.behavior;
          const hidden = behavior?.type === 'hidden' && !revealed.has(behavior.group);
          const isTreasure = behavior?.type === 'treasure';
          if (!hidden && !isTreasure) {
            if (tile.sprite.type === 'color') hex = tile.sprite.value;
            else if (tile.sprite.type === 'changer') {
              hex = colorChangerColorAt(tile.sprite, Date.now());
            }
          }
        }

        if (hex === null) {
          // Not a GL sphere (empty, image, emoji, treasure, hidden) — collapse.
          states.delete(key);
          dummy.position.set(-9999, -9999, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          i++;
          continue;
        }

        // Pixel center of this cell in DOM space.
        const cx = c * (cellW + GRID_GAP_PX) + cellW / 2;
        const cy = r * (cellH + GRID_GAP_PX) + cellH / 2;

        // Live drag offset: the dragged row/col slides with the pointer.
        let dx = 0;
        let dy = 0;
        if (dragging) {
          if (dragging.type === 'row' && dragging.index === r) dx = dragging.offsetX;
          else if (dragging.type === 'col' && dragging.index === c) dy = dragging.offsetY;
        }

        // Burst handling: record the moment a cell enters the matching set,
        // then drive a pop-then-vanish curve off that timestamp.
        let st = states.get(key);
        if (matchSet.has(key)) {
          if (!st) {
            st = { burstStart: t };
            states.set(key, st);
          }
        } else if (st) {
          states.delete(key);
          st = undefined;
        }

        let scale: number;
        let bright = 1;
        if (st) {
          const p = Math.min(1, (t - st.burstStart) / 0.5);
          // pop out to 1.45 then collapse toward 0.
          const pop = p < 0.35 ? 1 + (p / 0.35) * 0.45 : 1.45 * (1 - (p - 0.35) / 0.65);
          scale = baseR * Math.max(0.001, pop);
          bright = 1 + p * 1.4;
        } else {
          const phase = r * 1.7 + c * 2.3;
          scale = baseR * (1 + 0.035 * Math.sin(t * 2.2 + phase));
        }

        dummy.position.set(cx + dx, Hpx - (cy + dy), 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        color.set(hex).multiplyScalar(bright);
        mesh.setColorAt(i, color);
        i++;
      }
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, material, maxInstances]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 24, 18]} />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

export const BubbleBoardGL = memo(function BubbleBoardGL(props: BubbleBoardGLProps) {
  const active = useWindowActive();
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <Canvas
        orthographic
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        style={{ pointerEvents: 'none' }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 10], near: -1000, far: 1000 }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
      >
        <Spheres {...props} />
      </Canvas>
    </div>
  );
});
