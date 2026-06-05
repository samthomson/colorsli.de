import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWindowActive } from '@/hooks/useWindowActive';

const SPHERE_COUNT = 9000;
const BOUNDS = { x: 36, y: 28, z: 24 };
const BOUNCE_DAMPING = 0.97;

const PALETTE = [
  '#ef4444', '#f43f5e', '#dc2626',
  '#f97316', '#ea580c', '#fb923c',
  '#f59e0b', '#eab308', '#facc15',
  '#a3e635', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4',
  '#22d3ee', '#0ea5e9', '#38bdf8',
  '#3b82f6', '#2563eb', '#1d4ed8',
  '#60a5fa', '#4ade80', '#fde047',
];

type Sphere = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  color: THREE.Color;
  pulseSpeed: number;
  pulsePhase: number;
};

function generateSpheres(): Sphere[] {
  const spheres: Sphere[] = [];
  for (let i = 0; i < SPHERE_COUNT; i++) {
    const sizeRoll = Math.random();
    const radius = sizeRoll < 0.04 ? 0.8 + Math.random() * 1.0
      : sizeRoll < 0.18 ? 0.4 + Math.random() * 0.45
      : sizeRoll < 0.55 ? 0.18 + Math.random() * 0.22
      : 0.08 + Math.random() * 0.12;

    const baseColor = new THREE.Color(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    baseColor.multiplyScalar(1.4);

    const speed = 0.15 + Math.random() * 0.8;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI * 0.9;

    spheres.push({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * BOUNDS.x * 2,
        (Math.random() - 0.5) * BOUNDS.y * 2,
        (Math.random() - 0.5) * BOUNDS.z * 1.8 - 4,
      ),
      vel: new THREE.Vector3(
        Math.cos(angle1) * Math.cos(angle2) * speed,
        Math.sin(angle2) * speed,
        Math.sin(angle1) * Math.cos(angle2) * speed * 0.5,
      ),
      radius,
      color: baseColor,
      pulseSpeed: 0.3 + Math.random() * 1.4,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }
  return spheres;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const SPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vColor;

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
    vec3 transformedNormal = instanceRot * normal;
    vNormalView = normalize(normalMatrix * transformedNormal);

    vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const SPHERE_FRAGMENT = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vColor;

  void main() {
    vec3 N = normalize(vNormalView);

    // Half-Lambert wraps light all the way around for a soft, non-harsh look.
    vec3 L = normalize(vec3(0.3, 0.7, 0.6));
    float ndl = dot(N, L);
    float halfL = ndl * 0.5 + 0.5;

    // Mostly ambient, very gentle directional.
    float shading = 0.85 + 0.25 * halfL;

    float facing = max(N.z, 0.0);
    float fresnel = pow(1.0 - facing, 2.0);

    // Iridescent shimmer at glancing angles - soap film effect, not chrome.
    vec3 iridescent = vec3(
      0.5 + 0.5 * sin(facing * 7.0 + 0.0),
      0.5 + 0.5 * sin(facing * 7.0 + 2.1),
      0.5 + 0.5 * sin(facing * 7.0 + 4.2)
    );

    // Edge tint blends sphere color with iridescent shift, never pure white.
    vec3 edge = mix(vColor, iridescent * 1.2 + vColor * 0.4, 0.5);

    vec3 base = vColor * shading;
    vec3 finalColor = base + edge * fresnel * 0.6;

    // Bubble alpha: thin in middle, more opaque at edges (like soap film).
    float alpha = 0.42 + 0.5 * fresnel;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function Spheres() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const spheres = useMemo(generateSpheres, []);

  const colorArray = useMemo(() => {
    const arr = new Float32Array(SPHERE_COUNT * 3);
    for (let i = 0; i < SPHERE_COUNT; i++) {
      arr[i * 3] = spheres[i].color.r;
      arr[i * 3 + 1] = spheres[i].color.g;
      arr[i * 3 + 2] = spheres[i].color.b;
    }
    return arr;
  }, [spheres]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERTEX,
      fragmentShader: SPHERE_FRAGMENT,
      toneMapped: false,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < SPHERE_COUNT; i++) {
      const s = spheres[i];

      s.pos.x += s.vel.x * dt;
      s.pos.y += s.vel.y * dt;
      s.pos.z += s.vel.z * dt;

      if (s.pos.x > BOUNDS.x) { s.pos.x = BOUNDS.x; s.vel.x = -Math.abs(s.vel.x) * BOUNCE_DAMPING; }
      else if (s.pos.x < -BOUNDS.x) { s.pos.x = -BOUNDS.x; s.vel.x = Math.abs(s.vel.x) * BOUNCE_DAMPING; }
      if (s.pos.y > BOUNDS.y) { s.pos.y = BOUNDS.y; s.vel.y = -Math.abs(s.vel.y) * BOUNCE_DAMPING; }
      else if (s.pos.y < -BOUNDS.y) { s.pos.y = -BOUNDS.y; s.vel.y = Math.abs(s.vel.y) * BOUNCE_DAMPING; }
      if (s.pos.z > BOUNDS.z) { s.pos.z = BOUNDS.z; s.vel.z = -Math.abs(s.vel.z) * BOUNCE_DAMPING; }
      else if (s.pos.z < -BOUNDS.z - 8) { s.pos.z = -BOUNDS.z - 8; s.vel.z = Math.abs(s.vel.z) * BOUNCE_DAMPING; }

      const sp2 = s.vel.x * s.vel.x + s.vel.y * s.vel.y + s.vel.z * s.vel.z;
      if (sp2 < 0.04) {
        const boost = 1.4;
        s.vel.x *= boost;
        s.vel.y *= boost;
        s.vel.z *= boost;
      }

      const breathe = 0.85 + 0.15 * Math.sin(t * s.pulseSpeed + s.pulsePhase);
      const scale = s.radius * breathe;

      _dummy.position.set(s.pos.x, s.pos.y, s.pos.z);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      const flash = 1 + 0.2 * Math.sin(t * s.pulseSpeed * 0.6 + s.pulsePhase + 2);
      _color.copy(s.color).multiplyScalar(flash);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, material, SPHERE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 14, 10]} />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

function CameraRig() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.04;
    camera.position.x = Math.sin(t) * 5 + Math.sin(t * 2.7) * 2;
    camera.position.y = Math.cos(t * 0.8) * 4 + Math.cos(t * 1.9) * 1.5;
    camera.position.z = 18 + Math.sin(t * 0.5) * 4;
    camera.lookAt(Math.sin(t * 0.4) * 3, Math.cos(t * 0.3) * 2, -3);
  });
  return null;
}

export const CirclesBackground = memo(function CirclesBackground() {
  // Pause the (heavy) 9000-sphere render loop whenever the tab is hidden or
  // the window loses focus — no point animating for nobody.
  const active = useWindowActive();
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="bubble-bg absolute inset-0" />
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 18], fov: 70, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
      >
        <CameraRig />
        <Spheres />
      </Canvas>
    </div>
  );
});
