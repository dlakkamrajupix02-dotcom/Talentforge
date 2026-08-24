import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { bindWebGLContextRecovery, conservativeCanvasProps } from "../../utils/safeWebGL";

const vertexShader = `
  uniform float uTime;
  uniform float uHover;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  float noise3D(vec3 p) {
    float w  = sin(p.x*0.85 + uTime*0.55) * cos(p.y*0.90 + uTime*0.65) * sin(p.z*0.80 + uTime*0.45);
          w += sin(p.x*2.20 - uTime*1.00) * cos(p.y*2.40 + uTime*0.85) * sin(p.z*2.00 - uTime*0.70) * 0.45;
    return w;
  }

  vec3 displace(vec3 p) {
    return p + normalize(p) * noise3D(p) * (0.32 + uHover * 0.08);
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
    vWorldPos = (modelMatrix * vec4(dp, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(dp, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uHover;
  uniform vec3 uDark;
  uniform vec3 uMid;
  uniform vec3 uBright;
  uniform vec3 uPurple;
  uniform vec3 uWhite;
  uniform vec3 uPink;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - abs(dot(V, vNormal));
    float f1 = sin(vPosition.x*2.2 + vPosition.y*1.6 - uTime*0.60) * 0.5 + 0.5;
    float f2 = cos(vPosition.x*1.3 + vPosition.z*2.6 - uTime*0.48) * 0.5 + 0.5;
    float ph1 = vPosition.x*3.0 + vPosition.y*2.4 - uTime*1.1;
    float arcs = smoothstep(0.84, 1.0, sin(ph1) * 0.5 + 0.5);
    vec3 col = mix(uDark, uMid, f1 * 0.85);
    col = mix(col, uBright, f2 * 0.45);
    col = mix(col, uPurple, 0.22);
    col = mix(col, uWhite, arcs * 0.65);
    col = mix(col, uPink, pow(fresnel, 1.8) * 0.55);
    col += uWhite * pow(fresnel, 2.4) * (0.55 + uHover * 0.35);
    gl_FragColor = vec4(col, 0.92);
  }
`;

function HeroBlob({ mouseRef }) {
  const meshRef = useRef();
  const shaderRef = useRef();
  const hoverRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uDark: { value: new THREE.Color("#0f0d5c") },
      uMid: { value: new THREE.Color("#1e1a9e") },
      uBright: { value: new THREE.Color("#4338ca") },
      uPurple: { value: new THREE.Color("#6d28d9") },
      uWhite: { value: new THREE.Color("#ffffff") },
      uPink: { value: new THREE.Color("#c4b5fd") },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouse = mouseRef.current;

    if (meshRef.current) {
      const targetRotX = mouse.active ? mouse.y * 0.35 : Math.sin(t * 0.25) * 0.08;
      const targetRotY = mouse.active ? mouse.x * 0.35 : t * 0.18;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.06);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.06);
    }

    hoverRef.current = THREE.MathUtils.lerp(
      hoverRef.current,
      mouse.active ? 1 : 0.35,
      0.05
    );

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t;
      shaderRef.current.uniforms.uHover.value = hoverRef.current;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={meshRef} scale={1.05}>
        <sphereGeometry args={[1, 72, 72]} />
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

function OrbScene({ mouseRef }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 2, 6]} intensity={0.8} color="#a5b4fc" />
      <pointLight position={[-3, -2, 4]} intensity={0.4} color="#7c3aed" />
      <group position={[0.15, -0.05, 0]}>
        <HeroBlob mouseRef={mouseRef} />
      </group>
    </>
  );
}

/** Compact WebGL orb for the Job Openings hero bar */
export default function JobOpeningsHeroOrb({ mouseRef }) {
  return (
    <div className="jo-hero-orb-canvas relative w-full h-full">
      <div className="jo-hero-orb-glow absolute inset-0 pointer-events-none" aria-hidden="true" />
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        {...conservativeCanvasProps}
        onCreated={({ gl }) => bindWebGLContextRecovery(gl)}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <OrbScene mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
