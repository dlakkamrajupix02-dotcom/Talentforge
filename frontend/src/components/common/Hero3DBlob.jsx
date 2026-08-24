import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────
   VERTEX SHADER  –  organic blob displacement
   ───────────────────────────────────────────────────────────────── */
const coreVertexShader = `
  uniform float uTime;
  uniform float uHover;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  float noise3D(vec3 p) {
    float w  = sin(p.x*0.85 + uTime*0.60) * cos(p.y*0.90 + uTime*0.70) * sin(p.z*0.80 + uTime*0.50);
          w += sin(p.x*2.20 - uTime*1.10) * cos(p.y*2.40 + uTime*0.95) * sin(p.z*2.00 - uTime*0.80) * 0.50;
          w += sin(p.x*4.50 + uTime*1.50) * cos(p.y*4.80 - uTime*1.25) * sin(p.z*4.50 + uTime*1.05) * 0.18;
    return w;
  }

  vec3 displace(vec3 p) {
    float d = noise3D(p);
    float amp = 0.38 + uHover * 0.10;
    return p + normalize(p) * d * amp;
  }

  void main() {
    vec3 dp = displace(position);

    vec3 t = vec3(1.0, 0.0, 0.0);
    if (abs(normal.x) > 0.95) t = vec3(0.0, 1.0, 0.0);
    vec3 b = normalize(cross(normal, t));
    t = normalize(cross(b, normal));
    float e = 0.015;
    vec3 dT = displace(position + t * e);
    vec3 dB = displace(position + b * e);
    vec3 n = cross(dT - dp, dB - dp);
    if (dot(n, normal) < 0.0) n = -n;

    vNormal   = normalize(normalMatrix * normalize(n));
    vPosition = dp;
    vWorldPos = (modelMatrix * vec4(dp, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(dp, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   FRAGMENT SHADER  –  dark plasma interior + iridescent rim
   NOTE: NO atan() — avoids the π discontinuity seam artifact.
   All patterns use continuous sin/cos of vPosition components.
   ───────────────────────────────────────────────────────────────── */
const coreFragmentShader = `
  uniform float uTime;
  uniform float uHover;
  uniform vec3 uDark;    // near-black indigo   #0a0830
  uniform vec3 uMid;     // deep blue-purple    #1a14a8
  uniform vec3 uBright;  // cobalt blue         #2828d8
  uniform vec3 uPurple;  // medium purple       #7030c0
  uniform vec3 uWhite;   // pure white          #ffffff
  uniform vec3 uPink;    // iridescent pink     #e8a0f8
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPos;

  void main() {
    vec3 V       = normalize(cameraPosition - vWorldPos);
    float NdotV  = abs(dot(V, vNormal));
    float fresnel = 1.0 - NdotV;

    // ── Continuous 3D flow (no atan discontinuity) ──────────────
    float f1 = sin(vPosition.x*2.2 + vPosition.y*1.6 - uTime*0.65 + vPosition.z*2.1) * 0.5 + 0.5;
    float f2 = cos(vPosition.x*1.3 + vPosition.z*2.6 - uTime*0.50 + vPosition.y*1.9) * 0.5 + 0.5;
    float f3 = sin(vPosition.y*2.8 - vPosition.z*1.8 + uTime*0.45 + vPosition.x*1.5) * 0.5 + 0.5;

    // ── Bright plasma arc highlights (smoothstep bands) ─────────
    float ph1  = vPosition.x*3.2 + vPosition.y*2.6 + vPosition.z*2.2 - uTime*1.20;
    float ph2  = vPosition.x*2.0 - vPosition.z*3.8 + uTime*0.95 + vPosition.y*2.4;
    float arc1 = smoothstep(0.82, 1.0, sin(ph1) * 0.5 + 0.5);
    float arc2 = smoothstep(0.78, 1.0, sin(ph2) * 0.5 + 0.5) * 0.70;
    float arcs = min(arc1 + arc2, 1.0);

    // ── Base interior colour ─────────────────────────────────────
    vec3 col = mix(uDark, uMid, f1 * 0.90);
    col = mix(col, uBright,  f2 * 0.50);
    col = mix(col, uPurple,  f3 * 0.30);
    col = mix(col, uWhite,   arcs * 0.72);   // bright plasma arcs

    // ── Iridescent Fresnel rim: lavender-pink band → white hot edge ──
    float rimWide  = pow(fresnel, 1.60);
    float rimTight = pow(fresnel, 3.00);
    col = mix(col, uPink,  rimWide  * 0.65);   // wider lavender-pink zone
    col = mix(col, uWhite, rimTight * 0.95);   // bright white outer edge
    col += uWhite * pow(fresnel, 2.50) * (0.70 + uHover * 0.40);
    col += uPink  * pow(fresnel, 1.60) * 0.40; // soft lavender sub-glow

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   HELPER: getScrollValues
   ───────────────────────────────────────────────────────────────── */
function getScrollValues(t, width, isMobile) {
  let keyframes;
  if (isMobile) {
    keyframes = [
      { t: 0.0, x: 0, y: 0.8, s: 1.15 },           // Hero: Centered
      { t: 0.06, x: 0, y: 0.0, s: 2.20 },          // Pre-product zoom: Centered
      { t: 0.12, x: 0, y: 0.0, s: 2.20 },          // Product section: Centered
      { t: 0.45, x: 0, y: -0.1, s: 0.75 },         // Features: Centered & compact
      { t: 0.62, x: -width * 0.15, y: -0.1, s: 0.75 }, // Roles: slides LEFT
      { t: 0.78, x: width * 0.15, y: -0.2, s: 0.75 },  // Testimonials: slides RIGHT
      { t: 0.90, x: 0, y: -0.3, s: 0.75 },         // CTA: slides back to CENTER
      { t: 1.0, x: 0, y: -0.4, s: 0.75 }           // Footer: stays CENTER
    ];
  } else {
    keyframes = [
      { t: 0.0, x: 0, y: -0.05, s: 1.35 },             // Hero: Centered (x = 0)
      { t: 0.06, x: 0, y: 0, s: 2.70 },                // Pre-product zoom: Centered
      { t: 0.12, x: 0, y: 0, s: 2.70 },                // Product section: Centered
      { t: 0.45, x: 0, y: 0, s: 0.95 },                // Features: Centered & compact
      { t: 0.62, x: -width * 0.26, y: -0.10, s: 0.95 }, // Roles: slides LEFT
      { t: 0.78, x: width * 0.26, y: -0.20, s: 0.95 },  // Testimonials: slides RIGHT
      { t: 0.90, x: 0, y: -0.28, s: 0.95 },            // CTA: slides back to CENTER (x = 0)
      { t: 1.0, x: 0, y: -0.35, s: 0.95 }              // Footer: stays CENTER (x = 0)
    ];
  }

  if (t <= keyframes[0].t) return keyframes[0];
  if (t >= keyframes[keyframes.length - 1].t) return keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (t >= k1.t && t <= k2.t) {
      const pct = (t - k1.t) / (k2.t - k1.t);
      const ease = pct * pct * (3 - 2 * pct); // Smoothstep easing
      return {
        x: k1.x + (k2.x - k1.x) * ease,
        y: k1.y + (k2.y - k1.y) * ease,
        s: k1.s + (k2.s - k1.s) * ease
      };
    }
  }
  return keyframes[0];
}

/* ─────────────────────────────────────────────────────────────────
   BlobCore Component (pure presentation)
   ───────────────────────────────────────────────────────────────── */
function BlobCore({ meshRef, shaderRef }) {
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHover: { value: 0 },
    uDark: { value: new THREE.Color('#120e88') },  // deep royal indigo
    uMid: { value: new THREE.Color('#2020b8') },  // mid cobalt-indigo
    uBright: { value: new THREE.Color('#3535e8') },  // electric cobalt blue
    uPurple: { value: new THREE.Color('#5535b8') },  // blue-violet purple
    uWhite: { value: new THREE.Color('#ffffff') },  // pure white arcs
    uPink: { value: new THREE.Color('#d0b0ff') },  // cool lavender-pink rim
  }), []);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.0, 96, 96]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={uniforms}
        vertexShader={coreVertexShader}
        fragmentShader={coreFragmentShader}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Orb Component (pure presentation)
   ───────────────────────────────────────────────────────────────── */
function Orb({ childGroupRef, meshRef, shaderRef }) {
  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.45}>
      <group ref={childGroupRef}>
        <BlobCore
          meshRef={meshRef}
          shaderRef={shaderRef}
        />
      </group>
    </Float>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Scene Component (Unified High-Performance Animation Loop)
   ───────────────────────────────────────────────────────────────── */
function Scene({ scrollRef, zoomRef, mouseRef }) {
  const { width, height } = useThree((state) => state.viewport);
  const aspect = width / height;
  const isMobile = aspect < 1.0;

  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentScale = useRef(0.01);
  const hasInitialized = useRef(false);

  const parentGroupRef = useRef();
  const childGroupRef = useRef();
  const meshRef = useRef();
  const shaderRef = useRef();
  const hoverValueRef = useRef(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scrollProgress = scrollRef.current;
    const target = getScrollValues(scrollProgress, width, isMobile);

    // Initialize position directly to the target starting point on the first frame to prevent ugly sliding
    if (!hasInitialized.current) {
      currentPos.current.set(target.x, target.y, 0);
      currentScale.current = 0.01;
      hasInitialized.current = true;
    }

    // 1. Camera Zoom Rig & Cinematic Fly-In (snappy Z translation from Z=12 to Z=7)
    const zoom = zoomRef ? zoomRef.current : 0;
    const targetZ = 7 - zoom * 3.2;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.28);

    // 2. Parent Group Position & Scale (Fast scroll-driven + Entrance Scale-up)
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, target.x, 0.28);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, target.y, 0.28);
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, target.s, 0.28);

    if (parentGroupRef.current) {
      parentGroupRef.current.position.x = currentPos.current.x;
      parentGroupRef.current.position.y = currentPos.current.y;
      parentGroupRef.current.scale.setScalar(currentScale.current);
    }

    // 3. Snappy Mesh Rotation (Reacts quickly to scroll and cursor moves)
    const mouse = mouseRef.current;

    if (meshRef.current) {
      const targetRotX = (mouse.active ? mouse.y * 0.4 : 0) + scrollProgress * 1.0;
      const targetRotY = (mouse.active ? mouse.x * 0.4 : 0) + t * 0.15 + scrollProgress * 1.5;

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.28);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.28);
    }

    // 4. Dynamic center in NDC coordinates (-1 to 1)
    const orbCenterX = width ? (currentPos.current.x / (width / 2)) : (isMobile ? 0.0 : 0.44);
    const orbCenterY = height ? (currentPos.current.y / (height / 2)) : (isMobile ? 0.18 : -0.05);

    // 5. Hover Detection (only if mouse has moved/interacted)
    const dist = mouse.active
      ? Math.sqrt(Math.pow(mouse.x - orbCenterX, 2) + Math.pow(mouse.y - orbCenterY, 2))
      : 999;
    const hovered = dist < 0.28;

    hoverValueRef.current = THREE.MathUtils.lerp(hoverValueRef.current, hovered ? 1 : 0, 0.08);

    // 6. Shader Uniforms
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t;
      shaderRef.current.uniforms.uHover.value = hoverValueRef.current;
    }

    // 7. Child Group Position (Magnetic Hover Offset)
    if (childGroupRef.current) {
      const px = (mouse.active ? (mouse.x - orbCenterX) * 0.8 : 0) * hoverValueRef.current;
      const py = (mouse.active ? (mouse.y - orbCenterY) * 0.8 : 0) * hoverValueRef.current;
      childGroupRef.current.position.x = THREE.MathUtils.lerp(childGroupRef.current.position.x, px, 0.08);
      childGroupRef.current.position.y = THREE.MathUtils.lerp(childGroupRef.current.position.y, py, 0.08);
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <group ref={parentGroupRef}>
        <Orb
          childGroupRef={childGroupRef}
          meshRef={meshRef}
          shaderRef={shaderRef}
        />
      </group>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Component: Hero3DBlob
   ───────────────────────────────────────────────────────────────── */
const Hero3DBlob = ({ className = '' }) => {
  const scrollRef = useRef(0);
  const zoomRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) {
        scrollRef.current = window.scrollY / max;
      }
      zoomRef.current = Math.min(window.scrollY / window.innerHeight, 1);
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.active = true;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Premium background spotlights behind the orb */}
      <div className="absolute top-[22%] right-[10%] w-[550px] h-[550px] hidden lg:block pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-white/10 blur-[120px] scale-[0.6]" />
        <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-[130px] scale-80" />
      </div>
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] lg:hidden pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-white/10 blur-[90px] scale-[0.6]" />
        <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-[100px] scale-80" />
      </div>

      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene scrollRef={scrollRef} zoomRef={zoomRef} mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3DBlob;
