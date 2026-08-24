import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { bindWebGLContextRecovery, conservativeCanvasProps } from '../../utils/safeWebGL';

// Rotating 3D Digital Hologram Globe with Connected Tenant Nodes
function HologramGlobe() {
  const globeGroupRef = useRef();
  const wireframeGlobeRef = useRef();
  const innerCoreRef = useRef();
  const ringGroupRef = useRef();

  // Generate 12 distributed tenant pinpoint nodes on the sphere surface
  const tenantPins = useMemo(() => {
    const pins = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 1.35;
      pins.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
        color: ['#38bdf8', '#818cf8', '#a855f7', '#34d399', '#f43f5e'][i % 5],
        size: 0.08 + (i % 3) * 0.02,
      });
    }
    return pins;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y = t * 0.22;
      globeGroupRef.current.rotation.x = Math.sin(t * 0.15) * 0.1;
    }
    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.y = -t * 0.35;
      innerCoreRef.current.rotation.z = t * 0.2;
    }
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z = t * 0.4;
      ringGroupRef.current.rotation.x = Math.PI / 2.6 + Math.cos(t * 0.3) * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Inner Glowing Holographic Prismatic Core */}
      <mesh ref={innerCoreRef} scale={0.7}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#4f46e5"
          emissive="#6366f1"
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Main Wireframe Digital Globe */}
      <group ref={globeGroupRef}>
        {/* Globe Grid Sphere */}
        <mesh ref={wireframeGlobeRef} scale={1.35}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshBasicMaterial
            color="#818cf8"
            wireframe
            transparent
            opacity={0.25}
          />
        </mesh>

        {/* Outer Translucent Glass Shell */}
        <mesh scale={1.34}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial
            color="#1e1b4b"
            emissive="#312e81"
            emissiveIntensity={0.3}
            roughness={0.1}
            transmission={0.8}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Tenant Pinpoints / HQ Nodes on Globe */}
        {tenantPins.map((pin, i) => (
          <group key={i} position={[pin.x, pin.y, pin.z]}>
            {/* Pulsing Pin Head */}
            <mesh scale={pin.size}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshStandardMaterial
                color={pin.color}
                emissive={pin.color}
                emissiveIntensity={2.5}
              />
            </mesh>
            {/* Pin Laser Spike to Core */}
            <mesh position={[-pin.x * 0.15, -pin.y * 0.15, -pin.z * 0.15]}>
              <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
              <meshBasicMaterial color={pin.color} transparent opacity={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Outer Telemetry & Coordinate Orbit Rings */}
      <group ref={ringGroupRef}>
        <mesh scale={1.85}>
          <torusGeometry args={[1, 0.015, 12, 64]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>
        <mesh scale={2.15}>
          <torusGeometry args={[1, 0.008, 8, 48]} />
          <meshBasicMaterial
            color="#c084fc"
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

// Floating 3D Tenant Holographic Shards
function FloatingTenantNodes() {
  return (
    <>
      <Float speed={2.0} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh position={[-2.2, 0.8, -0.4]} scale={0.22}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.7}>
        <mesh position={[2.1, -0.7, 0.3]} scale={0.2}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#7e22ce"
            emissiveIntensity={1.5}
            roughness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      <Float speed={2.2} rotationIntensity={0.7} floatIntensity={0.6}>
        <mesh position={[-1.7, -0.9, 0.6]} scale={0.16}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#059669"
            emissiveIntensity={1.4}
            roughness={0.2}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.9}>
        <mesh position={[1.9, 0.9, -0.2]} scale={0.18}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#f43f5e"
            emissive="#e11d48"
            emissiveIntensity={1.6}
            roughness={0.2}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>
    </>
  );
}

// Particle Constellation
function ConstellationParticles() {
  const pointsRef = useRef();
  const count = 100;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.04;
      pointsRef.current.rotation.x = Math.sin(t * 0.08) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#c7d2fe"
        transparent
        opacity={0.65}
        sizeAttenuation
      />
    </points>
  );
}

// Smooth camera parallax with pointer tracking
function CameraRig() {
  const { camera, pointer } = useThree();

  useFrame(() => {
    const targetX = pointer.x * 0.7;
    const targetY = pointer.y * 0.35;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 4, 4]} intensity={1.8} color="#818cf8" />
      <pointLight position={[-4, -3, 3]} intensity={1.2} color="#38bdf8" />
      <pointLight position={[0, -4, -3]} intensity={0.8} color="#ec4899" />
      <directionalLight position={[2, 5, 3]} intensity={1.0} color="#ffffff" />

      <CameraRig />
      <ConstellationParticles />
      <HologramGlobe />
      <FloatingTenantNodes />
    </>
  );
}

/**
 * OrganizationsHero3D - 3D Global Tenant Holographic Constellation.
 * Visualizes global multi-tenant reach, federated organization clusters, and live cloud nodes.
 */
export default function OrganizationsHero3D({ className = '' }) {
  return (
    <div
      className={`relative w-full h-full min-h-[180px] overflow-hidden pointer-events-auto ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-l from-indigo-950/60 via-slate-950/30 to-transparent pointer-events-none" />
      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/15 blur-[90px] rounded-full pointer-events-none" />
      
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 40 }}
        {...conservativeCanvasProps}
        onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-2.5 right-4 z-10 hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/60 backdrop-blur-md border border-violet-500/20 text-[10px] text-violet-300 font-mono tracking-wider pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>GLOBAL TENANT FEDERATION · 3D NEXUS</span>
      </div>
    </div>
  );
}
