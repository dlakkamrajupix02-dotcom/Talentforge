import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import * as THREE from "three";

const BAR_CONFIG = [
  { x: -1.05, h: 0.55, delay: 0.0, color: "#6366f1" },
  { x: -0.63, h: 0.85, delay: 0.4, color: "#818cf8" },
  { x: -0.21, h: 1.15, delay: 0.8, color: "#a5b4fc" },
  { x: 0.21, h: 0.72, delay: 1.2, color: "#6366f1" },
  { x: 0.63, h: 1.35, delay: 1.6, color: "#7c3aed" },
  { x: 1.05, h: 0.95, delay: 2.0, color: "#818cf8" },
];

function AnimatedBar({ x, h, delay, color }) {
  const meshRef = useRef();
  const targetScale = useRef(h);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() + delay;
    const pulse = 0.55 + (Math.sin(t * 1.35) * 0.5 + 0.5) * 0.45;
    targetScale.current = h * pulse;
    if (meshRef.current) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale.current, 0.08);
      meshRef.current.position.y = meshRef.current.scale.y * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, h * 0.5, 0]} scale={[1, h, 1]}>
      <boxGeometry args={[0.2, 1, 0.2]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        metalness={0.45}
        roughness={0.28}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

function BarChartGroup() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.12;
      groupRef.current.rotation.x = -0.22 + Math.sin(t * 0.25) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[-0.15, -0.35, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[2.8, 1.2]} />
        <meshBasicMaterial color="#312e81" transparent opacity={0.25} />
      </mesh>
      {BAR_CONFIG.map((bar) => (
        <AnimatedBar key={bar.x} {...bar} />
      ))}
    </group>
  );
}

function TrendLine() {
  const lineRef = useRef();
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const x = -1.2 + (i / 24) * 2.4;
      const y = 0.35 + Math.sin(i * 0.45) * 0.22 + (i / 24) * 0.55;
      pts.push(new THREE.Vector3(x, y, 0.35));
    }
    return pts;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (lineRef.current) {
      lineRef.current.position.y = Math.sin(t * 0.5) * 0.04;
    }
  });

  return (
    <group ref={lineRef} position={[0, 0.55, 0.2]}>
      <Line
        points={points}
        color="#fbbf24"
        lineWidth={2}
        transparent
        opacity={0.85}
      />
      {points.filter((_, i) => i % 4 === 0).map((pt, i) => (
        <mesh key={i} position={[pt.x, pt.y, pt.z]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#fde68a" />
        </mesh>
      ))}
    </group>
  );
}

function DataNodes() {
  const groupRef = useRef();
  const nodes = useMemo(
    () => [
      new THREE.Vector3(-0.9, 1.05, -0.15),
      new THREE.Vector3(-0.2, 1.25, 0.1),
      new THREE.Vector3(0.45, 0.95, -0.05),
      new THREE.Vector3(0.95, 1.15, 0.15),
      new THREE.Vector3(0.3, 1.45, -0.2),
    ],
    []
  );

  const edges = useMemo(
    () => [
      [0, 1], [1, 2], [2, 3], [1, 4], [4, 3],
    ],
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.12;
    }
  });

  return (
    <group ref={groupRef} position={[0.1, 0.15, -0.3]}>
      {edges.map(([a, b], i) => (
        <Line
          key={`edge-${i}`}
          points={[nodes[a], nodes[b]]}
          color="#60a5fa"
          lineWidth={1}
          transparent
          opacity={0.35}
        />
      ))}
      {nodes.map((pos, i) => (
        <Float key={i} speed={1.5 + i * 0.2} floatIntensity={0.15}>
          <mesh position={pos}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial
              color="#93c5fd"
              emissive="#3b82f6"
              emissiveIntensity={0.6}
              metalness={0.5}
              roughness={0.2}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function OrbitRing() {
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.2;
      ringRef.current.rotation.z = t * 0.15;
    }
  });

  return (
    <mesh ref={ringRef} position={[0.2, 0.1, -0.5]} scale={1.85}>
      <torusGeometry args={[1, 0.012, 8, 64]} />
      <meshBasicMaterial color="#818cf8" transparent opacity={0.28} />
    </mesh>
  );
}

function AnalyticsParticles() {
  const ref = useRef();
  const count = 36;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 3.5;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color="#a5b4fc" transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

function AnalyticsScene() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[2, 3, 4]} intensity={0.7} color="#a5b4fc" />
      <pointLight position={[-2, -1, 3]} intensity={0.35} color="#6366f1" />
      <AnalyticsParticles />
      <OrbitRing />
      <BarChartGroup />
      <TrendLine />
      <DataNodes />
    </>
  );
}

/** 3D analytics visualization for the Outcome Intelligence header bar */
export default function AnalyticsHeaderScene() {
  return (
    <div
      className="analytics-header-scene absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[min(520px,55%)] h-[110%] min-h-[200px] opacity-90">
        <Canvas
          camera={{ position: [0, 0.2, 3.6], fov: 42 }}
          dpr={[1, 1.25]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <AnalyticsScene />
          </Suspense>
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-800/40 via-transparent to-slate-900/30" />
    </div>
  );
}
