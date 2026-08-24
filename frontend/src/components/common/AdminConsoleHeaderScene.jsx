import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { bindWebGLContextRecovery, conservativeCanvasProps } from "../../utils/safeWebGL";

const MODULE_NODES = [
  { angle: 0, radius: 1.15, y: 0.15, color: "#6366f1", size: 0.11 },
  { angle: Math.PI * 0.35, radius: 1.05, y: -0.05, color: "#818cf8", size: 0.09 },
  { angle: Math.PI * 0.7, radius: 1.2, y: 0.25, color: "#7c3aed", size: 0.1 },
  { angle: Math.PI, radius: 1.1, y: -0.1, color: "#6366f1", size: 0.1 },
  { angle: Math.PI * 1.35, radius: 1.0, y: 0.1, color: "#a5b4fc", size: 0.08 },
  { angle: Math.PI * 1.7, radius: 1.18, y: 0.0, color: "#818cf8", size: 0.09 },
];

function SystemCore() {
  const coreRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.25;
      coreRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.4;
      ringRef.current.rotation.z = t * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={ringRef} scale={1.35}>
        <torusGeometry args={[1, 0.014, 10, 72]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
      </mesh>
      <Float speed={1.2} floatIntensity={0.12}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.42, 1]} />
          <meshStandardMaterial
            color="#6366f1"
            emissive="#4338ca"
            emissiveIntensity={0.45}
            metalness={0.55}
            roughness={0.22}
            transparent
            opacity={0.95}
          />
        </mesh>
      </Float>
    </group>
  );
}

function ModuleOrbit() {
  const groupRef = useRef();
  const core = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.14;
  });

  return (
    <group ref={groupRef}>
      {MODULE_NODES.map((node, i) => {
        const x = Math.cos(node.angle) * node.radius;
        const z = Math.sin(node.angle) * node.radius;
        const pos = new THREE.Vector3(x, node.y, z);
        return (
          <group key={i}>
            <Line points={[core, pos]} color="#93c5fd" lineWidth={1} transparent opacity={0.28} />
            <Float speed={1.4 + i * 0.15} floatIntensity={0.1}>
              <mesh position={pos}>
                <boxGeometry args={[node.size, node.size, node.size]} />
                <meshStandardMaterial
                  color={node.color}
                  emissive={node.color}
                  emissiveIntensity={0.4}
                  metalness={0.5}
                  roughness={0.25}
                />
              </mesh>
            </Float>
          </group>
        );
      })}
    </group>
  );
}

function TaxonomyLayers() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = -0.35 + Math.sin(t * 0.2) * 0.06;
      groupRef.current.rotation.x = 0.55;
    }
  });

  return (
    <group ref={groupRef} position={[-0.85, 0.05, -0.35]}>
      {[0, 1, 2].map((i) => (
        <RoundedBox
          key={i}
          args={[0.95, 0.04, 0.65]}
          radius={0.02}
          position={[0, i * 0.14, 0]}
        >
          <meshStandardMaterial
            color="#c7d2fe"
            emissive="#6366f1"
            emissiveIntensity={0.15 + i * 0.08}
            metalness={0.35}
            roughness={0.4}
            transparent
            opacity={0.55 - i * 0.08}
          />
        </RoundedBox>
      ))}
    </group>
  );
}

function WorkflowPipeline() {
  const groupRef = useRef();
  const steps = useMemo(
    () => [
      new THREE.Vector3(-0.55, -0.55, 0.25),
      new THREE.Vector3(-0.05, -0.35, 0.35),
      new THREE.Vector3(0.45, -0.55, 0.25),
      new THREE.Vector3(0.95, -0.4, 0.3),
    ],
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 0.45) * 0.03;
  });

  return (
    <group ref={groupRef} position={[0.15, 0, 0]}>
      <Line points={steps} color="#7c3aed" lineWidth={1.5} transparent opacity={0.5} />
      {steps.map((pt, i) => (
        <mesh key={i} position={pt}>
          <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} />
          <meshStandardMaterial
            color={i === steps.length - 1 ? "#10b981" : "#818cf8"}
            emissive={i === steps.length - 1 ? "#059669" : "#6366f1"}
            emissiveIntensity={0.45}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function ConfigHexRing() {
  const ref = useRef();
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.55, Math.sin(a) * 1.55, -0.25));
    }
    return pts;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.z = t * 0.08;
  });

  return (
    <group ref={ref}>
      <Line points={points} color="#a5b4fc" lineWidth={1} transparent opacity={0.22} closed />
    </group>
  );
}

function AdminParticles() {
  const ref = useRef();
  const count = 32;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 3.2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#818cf8" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function AdminScene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[2, 2, 4]} intensity={0.65} color="#a5b4fc" />
      <pointLight position={[-2, -1, 3]} intensity={0.3} color="#6366f1" />
      <AdminParticles />
      <ConfigHexRing />
      <TaxonomyLayers />
      <WorkflowPipeline />
      <SystemCore />
      <ModuleOrbit />
    </>
  );
}

/** 3D admin/configuration scene for the Admin Console header */
export default function AdminConsoleHeaderScene() {
  return (
    <div
      className="admin-console-scene absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[min(480px,52%)] h-[115%] min-h-[180px] opacity-95">
        <Canvas
          camera={{ position: [0, 0.05, 3.5], fov: 40 }}
          {...conservativeCanvasProps}
          onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <AdminScene />
          </Suspense>
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/75 dark:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/[0.03] via-transparent to-purple-500/[0.04] dark:from-indigo-500/10 dark:to-purple-500/5" />
    </div>
  );
}
