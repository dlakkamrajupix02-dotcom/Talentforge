import React, { useRef, useMemo, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { bindWebGLContextRecovery, conservativeCanvasProps } from '../../utils/safeWebGL';

function TemplateStack() {
  const groupRef = useRef();
  const layers = useMemo(
    () => [
      { y: -0.12, z: 0, rot: 0, color: '#e2e8f0', emissive: '#6366f1' },
      { y: 0, z: 0.04, rot: 0.06, color: '#f8fafc', emissive: '#818cf8' },
      { y: 0.12, z: 0.08, rot: -0.04, color: '#ffffff', emissive: '#a5b4fc' },
      { y: 0.24, z: 0.12, rot: 0.03, color: '#f1f5f9', emissive: '#c4b5fd' },
    ],
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.25;
      groupRef.current.rotation.x = Math.sin(t * 0.28) * 0.08;
    }
    groupRef.current?.children.forEach((child, i) => {
      if (i >= layers.length) return;
      child.position.y = layers[i].y + Math.sin(t * 0.9 + i * 0.6) * 0.015;
    });
  });

  return (
    <group ref={groupRef}>
      {layers.map((layer, i) => (
        <mesh key={i} position={[0, layer.y, layer.z]} rotation={[0.12, layer.rot, 0.05]}>
          <boxGeometry args={[0.72, 0.92, 0.025]} />
          <meshStandardMaterial
            color={layer.color}
            emissive={layer.emissive}
            emissiveIntensity={0.45}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.38, 0.14]} rotation={[0.12, 0.03, 0.05]}>
        <boxGeometry args={[0.72, 0.08, 0.01]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function CatalogGrid() {
  const gridRef = useRef();
  useFrame((state) => {
    if (gridRef.current?.material) {
      gridRef.current.rotation.x = Math.PI / 2.05;
      gridRef.current.material.opacity = 0.22 + Math.sin(state.clock.getElapsedTime() * 0.8) * 0.06;
    }
  });
  return (
    <mesh ref={gridRef} position={[0, -0.75, 0]}>
      <planeGeometry args={[2.8, 2.8, 12, 12]} />
      <meshBasicMaterial color="#a5b4fc" wireframe transparent opacity={0.22} />
    </mesh>
  );
}

function OrbitingTemplates({ count = 0 }) {
  const groupRef = useRef();
  const n = count > 0 ? Math.min(count, 8) : 3;

  const items = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        angle: (i / n) * Math.PI * 2,
        radius: 1.35 + (i % 2) * 0.1,
        y: -0.15 + (i % 3) * 0.12,
        speed: 0.1 + (i % 3) * 0.025,
        scale: 0.14 + (i % 2) * 0.02,
      })),
    [n]
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.08;
    groupRef.current?.children.forEach((child, i) => {
      const item = items[i];
      if (!item) return;
      const a = item.angle + t * item.speed;
      child.position.set(
        Math.cos(a) * item.radius,
        item.y + Math.sin(t * 1.1 + i) * 0.05,
        Math.sin(a) * item.radius * 0.45
      );
      child.rotation.y = -a + Math.PI / 2;
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((item, idx) => (
        <mesh key={idx} scale={[item.scale, item.scale * 1.25, 0.012]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#818cf8"
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

function StructureRing() {
  const ringRef = useRef();
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.18;
      ringRef.current.rotation.x = Math.PI / 2.2;
    }
  });
  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.05, 0.014, 8, 80]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
    </mesh>
  );
}

function Scene({ templateCount }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[3, 2, 4]} intensity={1.1} color="#c7d2fe" />
      <pointLight position={[-2, 0, 3]} intensity={0.65} color="#fbbf24" />
      <CatalogGrid />
      <Float speed={1.0} rotationIntensity={0.1} floatIntensity={0.2}>
        <group>
          <TemplateStack />
          <StructureRing />
          <OrbitingTemplates count={templateCount} />
        </group>
      </Float>
    </>
  );
}

export default function TemplateLibraryHero3D({ templateCount = 0, className = '' }) {
  const reduceMotion = useReducedMotion();
  const isEmpty = templateCount === 0;

  if (reduceMotion) {
    return (
      <div className={`relative w-full h-[160px] overflow-hidden ${className}`} aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="w-20 h-24 rounded-lg border-2 border-amber-400/40 bg-indigo-500/15 shadow-[0_0_24px_rgba(99,102,241,0.2)]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-[160px] overflow-hidden ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.05, 3.4], fov: 44 }}
        {...conservativeCanvasProps}
        onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene templateCount={templateCount} />
        </Suspense>
      </Canvas>

      {isEmpty && (
        <div className="absolute bottom-2.5 left-0 right-0 text-center pointer-events-none z-10">
          <span className="text-[9px] font-semibold text-slate-400/90 uppercase tracking-wider">
            Demo catalog · add templates to scale orbit
          </span>
        </div>
      )}
    </div>
  );
}
