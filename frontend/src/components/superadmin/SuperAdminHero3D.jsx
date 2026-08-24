import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { bindWebGLContextRecovery, conservativeCanvasProps } from '../../utils/safeWebGL';

// Shaders for glowing cyber floor grid with traveling radar wave
const floorVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec2 grid = abs(fract(vWorldPos.xz * 1.5 - 0.5) - 0.5) / fwidth(vWorldPos.xz * 1.5);
    float line = min(grid.x, grid.y);
    float c = 1.0 - min(line, 1.0);
    
    // Circular wave expanding from center
    float dist = length(vWorldPos.xz);
    float wave = sin(dist * 2.5 - uTime * 3.0) * 0.5 + 0.5;
    wave = pow(wave, 4.0);
    
    // Radial fade out
    float fade = smoothstep(5.0, 0.5, dist);
    
    vec3 baseColor = vec3(0.04, 0.06, 0.15);
    vec3 gridColor = mix(vec3(0.3, 0.2, 0.8), vec3(0.1, 0.7, 1.0), wave);
    
    vec3 finalCol = mix(baseColor, gridColor, c * 0.75 * fade);
    finalCol += vec3(0.2, 0.5, 1.0) * wave * 0.18 * fade;
    
    gl_FragColor = vec4(finalCol, fade * 0.7);
  }
`;

// Central Quantum Multi-Tenant Orchestrator Tower
function CentralSuperAdminCore() {
  const coreRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  const beaconRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.4;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = t * 0.6;
      ringRef1.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.8) * 0.15;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -t * 0.45;
      ringRef2.current.rotation.y = Math.cos(t * 0.6) * 0.2;
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = 1.8 + Math.sin(t * 2.5) * 0.15;
      beaconRef.current.rotation.y = t * 1.2;
    }
  });

  return (
    <group position={[0, -0.4, 0]}>
      {/* Base Server Pedestal */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.7, 0.85, 0.4, 6]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Cybernetic Tier 1 Monolith */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.5, 6]} />
        <meshStandardMaterial
          color="#1e1b4b"
          emissive="#312e81"
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Glass Quantum Chamber */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.55, 16]} />
        <meshPhysicalMaterial
          color="#6366f1"
          emissive="#4338ca"
          emissiveIntensity={0.9}
          transmission={0.85}
          opacity={1}
          transparent
          roughness={0.1}
          ior={1.5}
        />
      </mesh>

      {/* Inner Rotating Quantum Crystal */}
      <mesh ref={coreRef} position={[0, 1.15, 0]} scale={0.28}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#06b6d4"
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Floating Holographic Ring 1 */}
      <mesh ref={ringRef1} position={[0, 1.15, 0]} scale={0.72}>
        <torusGeometry args={[1, 0.018, 12, 48]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Floating Holographic Ring 2 with Dashed HUD feel */}
      <mesh ref={ringRef2} position={[0, 1.15, 0]} scale={0.92}>
        <torusGeometry args={[1, 0.012, 12, 6]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#a855f7"
          emissiveIntensity={1.4}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Top Floating Security Beacon / AI Brain Node */}
      <mesh ref={beaconRef} scale={0.15}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ec4899"
          emissive="#f43f5e"
          emissiveIntensity={2.0}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// Tenant Server Towers representing organizations
function TenantServerTower({ position, height = 1.0, color = '#6366f1', label = '', pulseSpeed = 1, delay = 0 }) {
  const meshRef = useRef();
  const ledRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * pulseSpeed + delay;
    if (ledRef.current) {
      // Pulsing LED server rack indicators
      const intensity = 0.6 + Math.sin(t * 4) * 0.5;
      ledRef.current.material.emissiveIntensity = intensity;
    }
  });

  return (
    <group position={position}>
      {/* Ground Connection Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Main Server Tower Body */}
      <mesh ref={meshRef} position={[0, height / 2, 0]}>
        <boxGeometry args={[0.35, height, 0.35]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Server Glass Front Panel with Cyber LED Lines */}
      <mesh position={[0, height / 2, 0.18]}>
        <planeGeometry args={[0.28, height * 0.88]} />
        <meshStandardMaterial
          color="#1e1b4b"
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Flashing Activity LED Nodes */}
      <mesh ref={ledRef} position={[0, height * 0.85, 0.185]}>
        <boxGeometry args={[0.22, 0.04, 0.01]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Server Tower Rooftop Holographic Cap */}
      <mesh position={[0, height + 0.04, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>

      {/* Floating Tenant Micro Beacon above tower */}
      <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.25}>
        <mesh position={[0, height + 0.22, 0]} scale={0.07}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={color}
            emissiveIntensity={2.2}
          />
        </mesh>
      </Float>
    </group>
  );
}

// Optical Data Stream Particle Highway between Tower and Core
function DataStreamBeam({ start, end, color = '#38bdf8', speed = 1.2 }) {
  const curve = useMemo(() => {
    const midX = (start[0] + end[0]) / 2;
    const midZ = (start[2] + end[2]) / 2;
    const midY = Math.max(start[1], end[1]) + 0.65; // Arch up in 3D space
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.008, 6, false);
  }, [curve]);

  // Traveling data packet
  const packetRef = useRef();

  useFrame((state) => {
    const t = (state.clock.getElapsedTime() * speed) % 1;
    if (packetRef.current) {
      const pos = curve.getPoint(t);
      packetRef.current.position.copy(pos);
    }
  });

  return (
    <>
      {/* Translucent Laser Conduit Line */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>

      {/* Traveling Data Packet Light */}
      <mesh ref={packetRef} scale={0.045}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  );
}

// Cybernetic Floor Grid
function CyberFloor() {
  const shaderRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 12, 32, 32]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={floorVertexShader}
        fragmentShader={floorFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Orbiting SuperAdmin Broadcast Drone / Security Satellite
function OrbitingSatellite() {
  const satelliteRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.65;
    if (satelliteRef.current) {
      const radius = 2.4;
      satelliteRef.current.position.x = Math.cos(t) * radius;
      satelliteRef.current.position.z = Math.sin(t) * radius * 0.7;
      satelliteRef.current.position.y = 0.8 + Math.sin(t * 2) * 0.3;
      satelliteRef.current.rotation.y = -t + Math.PI / 2;
    }
  });

  return (
    <group ref={satelliteRef}>
      {/* Central Drone Core */}
      <mesh scale={0.1}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.5}
        />
      </mesh>
      {/* Drone Solar / Sensor Wings */}
      <mesh position={[0.16, 0, 0]} scale={[0.18, 0.02, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} emissive="#0284c7" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.16, 0, 0]} scale={[0.18, 0.02, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} emissive="#0284c7" emissiveIntensity={0.5} />
      </mesh>
      {/* Scanning Target Light */}
      <pointLight distance={1.2} intensity={2.0} color="#38bdf8" />
    </group>
  );
}

// Floating Ambient Cyber Dust Particles
function CyberDustParticles() {
  const pointsRef = useRef();
  const count = 90;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 3 - 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#a5b4fc"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Camera parallax responding smoothly to mouse movement
function CameraRig() {
  const { camera, pointer } = useThree();

  useFrame(() => {
    // Subtle, smooth camera tilt based on pointer
    const targetX = pointer.x * 0.8;
    const targetY = 1.6 + pointer.y * 0.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.lookAt(0, 0.5, 0);
  });

  return null;
}

function InfrastructureScene() {
  // Define 5 distinct Tenant Infrastructure Towers surrounding the Central Orchestrator
  const tenantTowers = useMemo(() => [
    { pos: [-1.85, -0.4, 0.4], height: 0.95, color: '#38bdf8', label: 'Org Alpha', speed: 1.1, delay: 0 },
    { pos: [-1.1, -0.4, -1.2], height: 1.25, color: '#a855f7', label: 'Org Beta', speed: 0.9, delay: 1.2 },
    { pos: [1.25, -0.4, -1.3], height: 1.1, color: '#34d399', label: 'Org Gamma', speed: 1.3, delay: 0.6 },
    { pos: [1.95, -0.4, 0.35], height: 0.85, color: '#f43f5e', label: 'Org Delta', speed: 1.0, delay: 1.8 },
    { pos: [0.35, -0.4, 1.45], height: 0.75, color: '#fbbf24', label: 'Org Epsilon', speed: 1.4, delay: 2.2 },
  ], []);

  const corePosition = [0, 0.75, 0];

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} color="#c7d2fe" />
      <pointLight position={[0, 1.8, 0]} intensity={2.5} color="#6366f1" distance={5} />
      <pointLight position={[-3, 2, 2]} intensity={1.2} color="#38bdf8" />
      <pointLight position={[3, -1, -2]} intensity={1.0} color="#ec4899" />

      <CameraRig />
      <CyberFloor />
      <CyberDustParticles />
      <CentralSuperAdminCore />
      <OrbitingSatellite />

      {/* Render Tenant Towers */}
      {tenantTowers.map((tower, idx) => (
        <TenantServerTower
          key={idx}
          position={tower.pos}
          height={tower.height}
          color={tower.color}
          label={tower.label}
          pulseSpeed={tower.speed}
          delay={tower.delay}
        />
      ))}

      {/* Render Live Optical Data Highways to Core */}
      {tenantTowers.map((tower, idx) => (
        <DataStreamBeam
          key={`beam-${idx}`}
          start={[tower.pos[0], tower.pos[1] + tower.height, tower.pos[2]]}
          end={corePosition}
          color={tower.color}
          speed={0.8 + idx * 0.15}
        />
      ))}
    </>
  );
}

/**
 * SuperAdminHero3D - Futuristic Multi-Tenant Cloud Architecture & Server Grid 3D Animation.
 * Represents Central SuperAdmin Orchestration, Live Tenant Server Infrastructure, and Flowing Telemetry.
 */
export default function SuperAdminHero3D({ className = '' }) {
  return (
    <div
      className={`relative w-full h-full min-h-[220px] overflow-hidden pointer-events-auto ${className}`}
      aria-hidden="true"
    >
      {/* Tech Grid & Holographic Backdrop Gradients */}
      <div className="absolute inset-0 bg-gradient-to-l from-indigo-950/70 via-slate-950/40 to-transparent pointer-events-none" />
      <div className="absolute right-12 top-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/15 blur-[90px] rounded-full pointer-events-none" />
      
      {/* Interactive 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 4.4], fov: 42 }}
        {...conservativeCanvasProps}
        onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <InfrastructureScene />
        </Suspense>
      </Canvas>

      {/* Subdued futuristic HUD telemetry label */}
      <div className="absolute bottom-2.5 right-4 z-10 hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/60 backdrop-blur-md border border-indigo-500/20 text-[10px] text-indigo-300 font-mono tracking-wider pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>MULTI-TENANT MATRIX · LIVE TELEMETRY</span>
      </div>
    </div>
  );
}
