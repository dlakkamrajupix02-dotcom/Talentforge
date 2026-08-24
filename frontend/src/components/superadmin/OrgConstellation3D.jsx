import React, { useRef, useMemo, Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Search, X, RotateCcw, LayoutGrid, Filter, Building2, CalendarClock, Wrench } from 'lucide-react';
import { format } from 'date-fns';

const HEALTH_COLORS = {
  healthy: '#22c55e',
  expiring: '#f59e0b',
  suspended: '#ef4444',
  expired: '#dc2626',
  idle: '#94a3b8',
};

const HEALTH_LABELS = {
  healthy: 'Healthy',
  expiring: 'Expiring Soon',
  suspended: 'Suspended',
  expired: 'Expired',
  idle: 'Idle',
};

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const accentColor = new THREE.Color('#6366f1');

function gridPosition(index, total) {
  const cols = Math.ceil(Math.sqrt(Math.max(total, 1)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rows = Math.ceil(total / cols);
  const spacing = total > 200 ? 0.32 : total > 80 ? 0.42 : total > 30 ? 0.55 : 0.72;
  return {
    x: (col - (cols - 1) / 2) * spacing,
    z: (row - (rows - 1) / 2) * spacing,
    spacing,
    cols,
    rows,
  };
}

function columnHeight(org) {
  const signal = Math.max(org.monthly_count || 0, org.total_users || 0, 1);
  return 0.18 + Math.log10(signal + 1) * 0.38;
}

function columnWidth(total) {
  if (total > 200) return 0.18;
  if (total > 80) return 0.24;
  if (total > 30) return 0.3;
  return 0.36;
}

function InstancedColumns({ organizations, highlightedId, selectedId, onHover, onSelect }) {
  const bodyRef = useRef();
  const capRef = useRef();
  const hoverIndex = useRef(-1);
  const width = columnWidth(organizations.length);

  const layout = useMemo(
    () =>
      organizations.map((org, index) => {
        const { x, z } = gridPosition(index, organizations.length);
        const height = columnHeight(org);
        return {
          org,
          index,
          x,
          z,
          height,
          color: HEALTH_COLORS[org.health] || HEALTH_COLORS.healthy,
        };
      }),
    [organizations]
  );

  const paintInstances = useCallback(
    (activeHoverIndex = hoverIndex.current) => {
      const body = bodyRef.current;
      const cap = capRef.current;
      if (!body || !layout.length) return;

      layout.forEach(({ x, z, height, color, org, index }) => {
        const isHighlighted =
          org.org_id === highlightedId ||
          org.org_id === selectedId ||
          index === activeHoverIndex;
        const scaleBoost = isHighlighted ? 1.12 : 1;
        const y = (height / 2) * scaleBoost;

        tempObject.position.set(x, y, z);
        tempObject.rotation.set(0, 0, 0);
        tempObject.scale.set(width * scaleBoost, height * scaleBoost, width * scaleBoost);
        tempObject.updateMatrix();
        body.setMatrixAt(index, tempObject.matrix);

        tempColor.set(isHighlighted ? accentColor : '#e2e8f0');
        body.setColorAt(index, tempColor);

        tempObject.position.set(x, height * scaleBoost + 0.025, z);
        tempObject.scale.set(width * 1.08 * scaleBoost, 0.05, width * 1.08 * scaleBoost);
        tempObject.updateMatrix();
        cap.setMatrixAt(index, tempObject.matrix);
        tempColor.set(color);
        if (isHighlighted) tempColor.lerp(accentColor, 0.25);
        cap.setColorAt(index, tempColor);
      });

      body.instanceMatrix.needsUpdate = true;
      cap.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (cap.instanceColor) cap.instanceColor.needsUpdate = true;
    },
    [layout, highlightedId, selectedId, width]
  );

  useEffect(() => {
    paintInstances();
  }, [paintInstances]);

  const updateHover = useCallback(
    (instanceId) => {
      if (hoverIndex.current === instanceId) return;
      hoverIndex.current = instanceId;
      paintInstances(instanceId);
      onHover(instanceId >= 0 ? layout[instanceId]?.org ?? null : null);
    },
    [layout, onHover, paintInstances]
  );

  if (!layout.length) return null;

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[null, null, layout.length]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          updateHover(e.instanceId ?? -1);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          updateHover(-1);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const org = layout[e.instanceId]?.org;
          if (org) onSelect(org);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.05} />
      </instancedMesh>

      <instancedMesh ref={capRef} args={[null, null, layout.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.25} metalness={0.35} emissive="#0f172a" emissiveIntensity={0.05} />
      </instancedMesh>
    </>
  );
}

function PlatformHub({ healthScore = 84, totalOrgs = 0 }) {
  const ringRef = useRef();
  const pulse = healthScore / 100;

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.15;
    }
  });

  const hubSize = 0.9 + Math.min(totalOrgs, 100) * 0.004;

  return (
    <group position={[0, 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[hubSize, 64]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[hubSize * 0.55, hubSize * 0.62, 64]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#818cf8"
          emissiveIntensity={0.25 * pulse}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[hubSize * 0.78, hubSize * 0.79, 64]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function SoftGroundShadow({ totalOrgs }) {
  const size = Math.max(8, Math.ceil(Math.sqrt(Math.max(totalOrgs, 4))) * 1.4);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <circleGeometry args={[size * 0.72, 64]} />
      <meshBasicMaterial color="#64748b" transparent opacity={0.08} depthWrite={false} />
    </mesh>
  );
}

function SceneFloor({ totalOrgs }) {
  const size = Math.max(8, Math.ceil(Math.sqrt(Math.max(totalOrgs, 4))) * 1.4);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={1} metalness={0} />
      </mesh>
      <Grid
        args={[size * 2, size * 2]}
        cellSize={0.5}
        cellThickness={0.4}
        sectionSize={2}
        sectionThickness={0.8}
        fadeDistance={size * 1.6}
        fadeStrength={1.2}
        cellColor="#e2e8f0"
        sectionColor="#cbd5e1"
        infiniteGrid={false}
        position={[0, 0.001, 0]}
      />
    </>
  );
}

function CameraRig({ totalOrgs }) {
  const { camera } = useThree();
  const dist = 7.5 + Math.sqrt(Math.max(totalOrgs, 1)) * 0.28;

  useFrame(() => {
    const target = new THREE.Vector3(dist * 0.72, dist * 0.58, dist * 0.72);
    camera.position.lerp(target, 0.04);
    camera.lookAt(0, 0.4, 0);
  });

  return null;
}

function SafeOrbitControls(props) {
  const { gl } = useThree();
  if (!gl?.domElement) return null;
  return <OrbitControls {...props} />;
}

function FleetMapScene({ organizations, healthScore, highlightedId, selectedId, onHover, onSelect }) {
  return (
    <>
      <color attach="background" args={['#f8fafc']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <directionalLight position={[-4, 6, -3]} intensity={0.35} color="#c7d2fe" />
      <CameraRig totalOrgs={organizations.length} />
      <SceneFloor totalOrgs={organizations.length} />
      <SoftGroundShadow totalOrgs={organizations.length} />
      <PlatformHub healthScore={healthScore} totalOrgs={organizations.length} />
      <InstancedColumns
        organizations={organizations}
        highlightedId={highlightedId}
        selectedId={selectedId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <SafeOrbitControls
        enablePan
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={4}
        maxDistance={24}
        target={[0, 0.35, 0]}
        dampingFactor={0.06}
        enableDamping
      />
    </>
  );
}

function HealthDistributionBar({ counts, activeFilter, onFilter }) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/60">
        {Object.entries(counts).map(([health, count]) =>
          count > 0 ? (
            <button
              key={health}
              type="button"
              title={`${HEALTH_LABELS[health]}: ${count}`}
              onClick={() => onFilter(activeFilter === health ? 'all' : health)}
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: HEALTH_COLORS[health],
                opacity: activeFilter === 'all' || activeFilter === health ? 1 : 0.3,
              }}
              className="transition-all duration-200"
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(counts).map(([health, count]) => (
          <button
            key={health}
            type="button"
            onClick={() => onFilter(activeFilter === health ? 'all' : health)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              activeFilter === health
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: HEALTH_COLORS[health] }} />
            {HEALTH_LABELS[health]} · {count}
          </button>
        ))}
      </div>
    </div>
  );
}

function TenantDetailCard({ org }) {
  if (!org) return null;

  const needsMaintenance = ['expiring', 'suspended', 'expired', 'idle'].includes(org.health);
  const accessLabel = org.access_valid_until
    ? format(new Date(org.access_valid_until), 'MMM dd, yyyy')
    : 'No expiry set';

  return (
    <div className="rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-200/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{org.org_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{org.industry || 'Industry not set'}</p>
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ backgroundColor: `${HEALTH_COLORS[org.health]}18`, color: HEALTH_COLORS[org.health] }}
        >
          {HEALTH_LABELS[org.health]}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: 'Users', value: org.total_users },
          { label: 'JDs/mo', value: org.monthly_count },
          { label: 'Today', value: org.daily_count },
          { label: 'Total JDs', value: org.total_count },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 py-2 text-center">
            <p className="text-sm font-bold text-slate-800">{item.value}</p>
            <p className="text-[9px] uppercase tracking-wide text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <CalendarClock size={12} className="text-slate-400" />
          Access until: <span className="font-medium text-slate-800">{accessLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Building2 size={12} className="text-slate-400" />
          Status:{' '}
          <span className={`font-medium ${org.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
            {org.is_active ? 'Active tenant' : 'Suspended'}
          </span>
        </div>
        {needsMaintenance && (
          <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-900">
            <Wrench size={12} className="mt-0.5 shrink-0" />
            <span>
              {org.health === 'expiring' && 'Renew access or notify tenant admin before expiry.'}
              {org.health === 'suspended' && 'Users are blocked from login until reactivated.'}
              {org.health === 'expired' && 'Access has expired — immediate renewal required.'}
              {org.health === 'idle' && 'No JD activity this month. Consider a health check.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const OrgConstellation3D = ({ organizations = [], healthScore = 84, className = '' }) => {
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [hoveredOrg, setHoveredOrg] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [viewMode, setViewMode] = useState('fleet');

  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, expiring: 0, suspended: 0, expired: 0, idle: 0 };
    organizations.forEach((org) => {
      counts[org.health] = (counts[org.health] || 0) + 1;
    });
    return counts;
  }, [organizations]);

  const maintenanceCount = useMemo(
    () => organizations.filter((o) => ['expiring', 'suspended', 'expired', 'idle'].includes(o.health)).length,
    [organizations]
  );

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((org) => {
      const matchesHealth = healthFilter === 'all' || org.health === healthFilter;
      const matchesSearch =
        !query ||
        org.org_name?.toLowerCase().includes(query) ||
        org.industry?.toLowerCase().includes(query);
      return matchesHealth && matchesSearch;
    });
  }, [organizations, search, healthFilter]);

  const displayOrganizations = useMemo(() => {
    if (viewMode === 'filtered' || healthFilter !== 'all' || search.trim()) {
      return filteredOrganizations;
    }
    return organizations;
  }, [viewMode, healthFilter, search, filteredOrganizations, organizations]);

  const highlightedId = useMemo(() => {
    if (selectedOrg) return selectedOrg.org_id;
    if (search.trim() && filteredOrganizations.length === 1) return filteredOrganizations[0].org_id;
    return hoveredOrg?.org_id ?? null;
  }, [selectedOrg, search, filteredOrganizations, hoveredOrg]);

  const topTenants = useMemo(
    () => [...organizations].sort((a, b) => (b.total_users || 0) - (a.total_users || 0)).slice(0, 8),
    [organizations]
  );

  const activeOrg = selectedOrg || hoveredOrg;

  const resetView = () => {
    setSearch('');
    setHealthFilter('all');
    setSelectedOrg(null);
    setHoveredOrg(null);
    setViewMode('fleet');
  };

  return (
    <div className={`grid lg:grid-cols-[1fr_340px] ${className}`}>
      {/* 3D Fleet Map */}
      <div className="relative min-h-[440px] lg:min-h-[540px] bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />

        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tenant or industry..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/90 backdrop-blur border border-slate-200/80 text-slate-800 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={resetView}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/90 backdrop-blur border border-slate-200/80 text-slate-600 text-xs font-medium shadow-sm hover:bg-white hover:text-slate-800 transition-colors"
          >
            <RotateCcw size={13} /> Reset
          </button>

          <div className="inline-flex rounded-xl border border-slate-200/80 overflow-hidden shadow-sm bg-white/90 backdrop-blur text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('fleet')}
              className={`px-3.5 py-2.5 inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'fleet' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={13} /> Fleet Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('filtered')}
              className={`px-3.5 py-2.5 inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'filtered' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Filter size={13} /> Focused
            </button>
          </div>
        </div>

        {/* Platform health badge */}
        <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 backdrop-blur border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-600">{healthScore}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Platform Health</p>
            <p className="text-xs font-medium text-slate-700">{organizations.length} tenants mapped</p>
          </div>
        </div>

        {/* Detail card */}
        {activeOrg && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-10">
            <TenantDetailCard org={activeOrg} />
          </div>
        )}

        {/* Footer hint */}
        <div className="absolute bottom-4 right-4 z-10 hidden sm:block text-[10px] text-slate-400 bg-white/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-200/60">
          Column height = activity · Cap color = health · {displayOrganizations.length}/{organizations.length} visible
        </div>

        {filteredOrganizations.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center px-6">
              <p className="text-sm font-medium text-slate-700">No tenants match your criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing search or health filters</p>
              <button type="button" onClick={resetView} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Reset filters
              </button>
            </div>
          </div>
        )}

        <Canvas
          camera={{ position: [5.5, 4.2, 5.5], fov: 42 }}
          dpr={[1, 1.25]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%', minHeight: 440 }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (event) => event.preventDefault(), false);
          }}
        >
          <Suspense fallback={null}>
            <FleetMapScene
              organizations={displayOrganizations}
              healthScore={healthScore}
              highlightedId={highlightedId}
              selectedId={selectedOrg?.org_id ?? null}
              onHover={setHoveredOrg}
              onSelect={setSelectedOrg}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Intelligence panel */}
      <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-5 space-y-5 bg-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Fleet Intelligence</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-3.5">
              <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Total Tenants</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100/80 p-3.5">
              <p className="text-2xl font-bold text-indigo-600">{healthScore}%</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Health Score</p>
            </div>
          </div>
        </div>

        {maintenanceCount > 0 && (
          <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5">
            <div className="flex items-center gap-2 text-amber-800">
              <Wrench size={14} />
              <p className="text-xs font-semibold">{maintenanceCount} tenant{maintenanceCount > 1 ? 's' : ''} need attention</p>
            </div>
            <p className="text-[11px] text-amber-700/80 mt-1">Expiring access, idle activity, or suspended logins.</p>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Health Breakdown</p>
          <HealthDistributionBar counts={healthCounts} activeFilter={healthFilter} onFilter={setHealthFilter} />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Top Tenants by Users</p>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-0.5 custom-scrollbar">
            {topTenants.map((org, index) => (
              <button
                key={org.org_id}
                type="button"
                onClick={() => setSelectedOrg(org)}
                className={`w-full group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedOrg?.org_id === org.org_id
                    ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                    : 'bg-slate-50/50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-300 w-4 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white" style={{ backgroundColor: HEALTH_COLORS[org.health] }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                    {org.org_name}
                  </span>
                  <span className="block text-[10px] text-slate-500">{org.total_users} users · {org.monthly_count} JDs/mo</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          Isometric fleet map with GPU instancing — built for hundreds of tenants. Drag to inspect, click a column or list item to drill down.
        </p>
      </div>
    </div>
  );
};

export default OrgConstellation3D;
