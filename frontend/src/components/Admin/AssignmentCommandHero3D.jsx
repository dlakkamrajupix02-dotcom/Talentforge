import React, { useRef, useMemo, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { bindWebGLContextRecovery, conservativeCanvasProps } from '../../utils/safeWebGL';

const STATUS_COLORS = {
  pending: '#fb923c',
  completed: '#34d399',
  default: '#a5b4fc',
};

function CommandHub() {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.35;
      meshRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.05 + Math.sin(t * 1.6) * 0.04);
    }
  });

  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.72, 24, 24]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.12} />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#4338ca"
          emissiveIntensity={0.85}
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function RadarRing({ radius = 1.55, speed = 0.22, opacity = 0.35, color = '#818cf8' }) {
  const ringRef = useRef();
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * speed;
      ringRef.current.rotation.x = Math.PI / 2.15;
    }
  });
  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.012, 8, 96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function AssigneeNodes({ total = 4, pending = 1, completed = 1 }) {
  const groupRef = useRef();
  const count = Math.min(Math.max(total, 3), 10);

  const nodes = useMemo(() => {
    const pendingCount = Math.min(pending, count);
    const completedCount = Math.min(completed, count - pendingCount);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.75 + (i % 2) * 0.12;
      let color = STATUS_COLORS.default;
      if (i < pendingCount) color = STATUS_COLORS.pending;
      else if (i < pendingCount + completedCount) color = STATUS_COLORS.completed;
      return {
        angle,
        radius,
        y: Math.sin(angle * 2.2) * 0.22,
        z: Math.cos(angle * 1.4) * 0.18,
        color,
        scale: 0.055 + (i % 3) * 0.012,
        speed: 0.12 + (i % 4) * 0.03,
      };
    });
  }, [count, pending, completed]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.14;
    }
    groupRef.current?.children.forEach((child, i) => {
      const node = nodes[i];
      if (!node || !child) return;
      const a = node.angle + t * node.speed;
      child.position.set(
        Math.cos(a) * node.radius,
        node.y + Math.sin(t * 1.2 + i) * 0.06,
        Math.sin(a) * node.radius * 0.55 + node.z
      );
    });
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, idx) => (
        <group key={idx}>
          <mesh position={[Math.cos(node.angle) * node.radius, node.y, Math.sin(node.angle) * node.radius * 0.55]}>
            <sphereGeometry args={[node.scale, 12, 12]} />
            <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ConnectionLines({ total = 4 }) {
  const linesRef = useRef();
  const count = Math.min(Math.max(total, 3), 10);

  const geometry = useMemo(() => {
    const positions = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.75 + (i % 2) * 0.12;
      positions.push(0, 0, 0, Math.cos(angle) * radius, Math.sin(angle * 2.2) * 0.22, Math.sin(angle) * radius * 0.55);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.getElapsedTime() * 0.14;
      linesRef.current.material.opacity = 0.18 + Math.sin(state.clock.getElapsedTime() * 1.4) * 0.06;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#c7d2fe" transparent opacity={0.22} />
    </lineSegments>
  );
}

function FloatingDocuments({ campaigns = 1 }) {
  const groupRef = useRef();
  const docs = useMemo(() => {
    const n = Math.min(Math.max(campaigns, 2), 5);
    return Array.from({ length: n }, (_, i) => ({
      x: -0.55 + (i % 3) * 0.45,
      y: 0.35 + (i % 2) * 0.28,
      z: -0.2 + i * 0.18,
      rot: (i * 0.7) - 0.4,
      delay: i * 0.35,
    }));
  }, [campaigns]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    }
    groupRef.current?.children.forEach((child, i) => {
      child.position.y = docs[i].y + Math.sin(t * 0.9 + docs[i].delay) * 0.08;
      child.rotation.z = docs[i].rot + Math.sin(t * 0.5 + i) * 0.06;
    });
  });

  return (
    <group ref={groupRef} position={[0.15, -0.05, 0]}>
      {docs.map((doc, idx) => (
        <mesh key={idx} position={[doc.x, doc.y, doc.z]} rotation={[0.15, doc.rot, 0.08]}>
          <boxGeometry args={[0.28, 0.36, 0.02]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#6366f1"
            emissiveIntensity={0.15}
            metalness={0.2}
            roughness={0.6}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

function ScanPulse() {
  const meshRef = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const pulse = (Math.sin(t * 1.1) + 1) * 0.5;
      meshRef.current.scale.setScalar(0.85 + pulse * 0.55);
      meshRef.current.material.opacity = 0.08 + (1 - pulse) * 0.12;
    }
  });
  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.05, 64]} />
      <meshBasicMaterial color="#818cf8" transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene({ campaigns, totalAssignees, pending, completed }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 2, 4]} intensity={0.9} color="#a5b4fc" />
      <pointLight position={[-2, -1, 3]} intensity={0.45} color="#6366f1" />
      <Float speed={1.1} rotationIntensity={0.15} floatIntensity={0.25}>
        <group>
          <CommandHub />
          <RadarRing />
          <RadarRing radius={1.95} speed={-0.16} opacity={0.2} color="#6366f1" />
          <ScanPulse />
          <ConnectionLines total={totalAssignees} />
          <AssigneeNodes total={totalAssignees} pending={pending} completed={completed} />
        </group>
      </Float>
      <FloatingDocuments campaigns={campaigns} />
    </>
  );
}

export default function AssignmentCommandHero3D({
  campaigns = 1,
  totalAssignees = 2,
  pending = 1,
  completed = 1,
  className = '',
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={`relative w-full h-full min-h-[200px] overflow-hidden ${className}`} aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="w-28 h-28 rounded-full border border-indigo-400/30" />
          <div className="absolute w-40 h-40 rounded-full border border-indigo-300/20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[200px] overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/20 blur-[70px] rounded-full" />
        <Canvas
          camera={{ position: [0, 0.1, 4.2], fov: 42 }}
          {...conservativeCanvasProps}
          onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Scene
              campaigns={campaigns}
              totalAssignees={totalAssignees}
              pending={pending}
              completed={completed}
            />
          </Suspense>
        </Canvas>
      </div>
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
