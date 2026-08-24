import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { bindWebGLContextRecovery, conservativeCanvasProps } from "../../utils/safeWebGL";

const vertexShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  float noise3D(vec3 p) {
    float w  = sin(p.x*0.85 + uTime*0.55) * cos(p.y*0.90 + uTime*0.65) * sin(p.z*0.80 + uTime*0.45);
          w += sin(p.x*2.20 - uTime*1.00) * cos(p.y*2.40 + uTime*0.85) * sin(p.z*2.00 - uTime*0.70) * 0.42;
    return w;
  }

  vec3 displace(vec3 p) {
    return p + normalize(p) * noise3D(p) * 0.28;
  }

  void main() {
    vec3 dp = displace(position);
    vec3 t = vec3(1.0, 0.0, 0.0);
    if (abs(normal.x) > 0.95) t = vec3(0.0, 1.0, 0.0);
    vec3 b = normalize(cross(normal, t));
    t = normalize(cross(b, normal));
    float e = 0.015;
    vec3 n = cross(displace(position + t * e) - dp, displace(position + b * e) - dp);
    if (dot(n, normal) < 0.0) n = -n;
    vNormal = normalize(normalMatrix * normalize(n));
    vPosition = dp;
    vWorldPos = (modelMatrix * vec4(dp, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(dp, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - abs(dot(V, vNormal));
    float f1 = sin(vPosition.x*2.0 + vPosition.y*1.4 - uTime*0.55) * 0.5 + 0.5;
    float f2 = cos(vPosition.x*1.2 + vPosition.z*2.2 - uTime*0.42) * 0.5 + 0.5;
    vec3 dark = vec3(0.18, 0.16, 0.55);
    vec3 mid = vec3(0.35, 0.28, 0.85);
    vec3 bright = vec3(0.55, 0.45, 0.98);
    vec3 col = mix(dark, mid, f1 * 0.8);
    col = mix(col, bright, f2 * 0.35);
    col = mix(col, vec3(0.92, 0.88, 1.0), pow(fresnel, 2.2) * 0.55);
    col += vec3(0.75, 0.65, 1.0) * pow(fresnel, 1.6) * 0.25;
    gl_FragColor = vec4(col, 0.78);
  }
`;

function PlasmaBlob() {
  const meshRef = useRef();
  const shaderRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = t;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.14;
      meshRef.current.rotation.x = Math.sin(t * 0.22) * 0.08;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <mesh ref={meshRef} scale={1.15} position={[0.35, 0.05, 0]}>
        <icosahedronGeometry args={[1, 5]} />
        <shaderMaterial
          ref={shaderRef}
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
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.8 + Math.sin(t * 0.3) * 0.12;
      ringRef.current.rotation.z = t * 0.22;
    }
  });

  return (
    <mesh ref={ringRef} position={[0.2, 0.1, -0.4]} scale={1.55}>
      <torusGeometry args={[1, 0.018, 12, 80]} />
      <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
    </mesh>
  );
}

function FloatingGem({ position, scale = 0.12, speed = 1 }) {
  const ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed;
    if (ref.current) {
      ref.current.rotation.x = t * 0.6;
      ref.current.rotation.y = t * 0.85;
      ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.08;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#a5b4fc"
        emissive="#6366f1"
        emissiveIntensity={0.55}
        metalness={0.65}
        roughness={0.25}
        transparent
        opacity={0.82}
      />
    </mesh>
  );
}

function ParticleField() {
  const pointsRef = useRef();
  const count = 48;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 3.2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.05;
      pointsRef.current.rotation.x = Math.sin(t * 0.18) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#c4b5fd" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function GreetingScene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 2, 4]} intensity={0.75} color="#a5b4fc" />
      <pointLight position={[-2, -1, 3]} intensity={0.35} color="#7c3aed" />
      <ParticleField />
      <OrbitRing />
      <PlasmaBlob />
      <FloatingGem position={[-0.75, 0.55, 0.35]} scale={0.1} speed={1.1} />
      <FloatingGem position={[0.95, -0.45, 0.2]} scale={0.08} speed={0.9} />
      <Float speed={1.6} floatIntensity={0.5}>
        <mesh position={[-0.55, -0.35, 0.15]} scale={0.18}>
          <sphereGeometry args={[1, 24, 24]} />
          <MeshDistortMaterial
            color="#6366f1"
            emissive="#4338ca"
            emissiveIntensity={0.35}
            distort={0.35}
            speed={2.5}
            transparent
            opacity={0.55}
          />
        </mesh>
      </Float>
    </>
  );
}

/** Soft 3D orb scene for dashboard greeting widgets */
export default function DashboardGreetingOrb() {
  return (
    <div className="dashboard-greeting-orb absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent dark:from-indigo-500/15 dark:via-violet-600/10" />
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-[115%] h-[130%] min-h-[220px]">
        <Canvas
          camera={{ position: [0, 0, 3.8], fov: 38 }}
          {...conservativeCanvasProps}
          onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <GreetingScene />
          </Suspense>
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-transparent dark:from-[#0f172a]/90 dark:via-[#0f172a]/50 dark:to-transparent" />
    </div>
  );
}
