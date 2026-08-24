import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float noise3D(vec3 p) {
    float w  = sin(p.x*0.85 + uTime*0.60) * cos(p.y*0.90 + uTime*0.70) * sin(p.z*0.80 + uTime*0.50);
          w += sin(p.x*2.20 - uTime*1.10) * cos(p.y*2.40 + uTime*0.95) * sin(p.z*2.00 - uTime*0.80) * 0.50;
    return w;
  }

  void main() {
    vec3 dp = position + normalize(position) * noise3D(position) * (0.28 + uPulse * 0.12);
    vNormal = normalize(normalMatrix * normal);
    vPosition = dp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(dp, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
    float wave = sin(vPosition.x*2.0 + vPosition.y*1.5 - uTime*0.8) * 0.5 + 0.5;
    vec3 col = mix(uColorA, uColorB, wave);
    col = mix(col, vec3(1.0), fresnel * (0.55 + uPulse * 0.25));
    gl_FragColor = vec4(col, 0.95);
  }
`;

function PulseOrb({ healthScore = 85 }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const pulse = Math.max(0, Math.min(1, healthScore / 100));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: pulse },
      uColorA: { value: new THREE.Color('#312e81') },
      uColorB: { value: new THREE.Color('#6366f1') },
    }),
    [pulse]
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
      materialRef.current.uniforms.uPulse.value = pulse;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.35;
      meshRef.current.rotation.x = Math.sin(t * 0.25) * 0.15;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.35}>
      <mesh ref={meshRef} scale={1.15}>
        <icosahedronGeometry args={[1, 64]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
        />
      </mesh>
    </Float>
  );
}

function OrbitRing() {
  const ringRef = useRef();
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.25;
      ringRef.current.rotation.x = Math.PI / 2.4;
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.65, 0.02, 16, 120]} />
      <meshBasicMaterial color="#a5b4fc" transparent opacity={0.55} />
    </mesh>
  );
}

function DataNodes({ count = 6 }) {
  const groupRef = useRef();
  const nodes = useMemo(() => {
    return Array.from({ length: Math.min(count, 12) }, (_, i) => {
      const angle = (i / Math.min(count, 12)) * Math.PI * 2;
      const radius = 2.1 + (i % 3) * 0.15;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.35,
        z: Math.sin(angle) * radius * 0.4,
        scale: 0.06 + (i % 4) * 0.015,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, idx) => (
        <mesh key={idx} position={[node.x, node.y, node.z]}>
          <sphereGeometry args={[node.scale, 16, 16]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#818cf8" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ healthScore, orgCount }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#a5b4fc" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#6366f1" />
      <Stars radius={40} depth={30} count={500} factor={2.5} saturation={0} fade speed={0.6} />
      <PulseOrb healthScore={healthScore} />
      <OrbitRing />
      <DataNodes count={orgCount} />
    </>
  );
}

const AnalyticsHero3D = ({ healthScore = 85, orgCount = 6, className = '' }) => {
  return (
    <div className={`relative w-full h-full min-h-[280px] ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/20 to-violet-950/30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 42 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (event) => event.preventDefault(), false);
        }}
      >
        <Suspense fallback={null}>
          <Scene healthScore={healthScore} orgCount={orgCount} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default AnalyticsHero3D;
