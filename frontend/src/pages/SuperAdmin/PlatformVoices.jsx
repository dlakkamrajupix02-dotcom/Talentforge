import React from 'react';
import { RefreshCw } from 'lucide-react';
import PlatformVoicesSection from '../../components/superadmin/PlatformVoicesSection';

const SuperAdminPlatformVoices = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">Platform Voices</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            User feedback intelligence across all tenants — ratings, tips, comments, and analytics from every role except Super Admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <PlatformVoicesSection key={refreshKey} />
    </div>
  );
};

export default SuperAdminPlatformVoices;
