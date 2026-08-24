import React from "react";
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function TemplateCardSkeleton({ viewMode = "grid" }) {
  // We use a CSS class to style the skeleton differently in dark mode
  // The global CSS should ideally handle the .react-loading-skeleton variables 
  // but we will just provide default props here.

  if (viewMode === "list") {
    return (
      <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f1f5f9">
        <div className="group bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex items-center gap-4">
          <div className="w-14 h-14 flex-shrink-0">
            <Skeleton height="100%" borderRadius="0.75rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1/3 h-5">
                <Skeleton height="100%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
              </div>
              <div className="w-20 h-4">
                <Skeleton height="100%" borderRadius="9999px" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
              </div>
            </div>
            <div className="w-2/3 h-4">
              <Skeleton height="100%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9">
              <Skeleton height="100%" borderRadius="0.5rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
            <div className="w-20 h-9">
              <Skeleton height="100%" borderRadius="0.5rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
          </div>
        </div>
      </SkeletonTheme>
    );
  }

  return (
    <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f1f5f9">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12">
              <Skeleton height="100%" borderRadius="0.75rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
            <div className="w-20 h-6">
              <Skeleton height="100%" borderRadius="9999px" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 mt-4">
            <div className="w-3/4 h-6">
              <Skeleton height="100%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
          </div>

          <div className="space-y-2 mt-3">
            <Skeleton height="1rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            <Skeleton height="1rem" width="83%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            <Skeleton height="1rem" width="66%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
          </div>
        </div>

        <div className="px-5 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-28 h-4">
              <Skeleton height="100%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
            <div className="w-28 h-4">
              <Skeleton height="100%" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto flex gap-2">
          <div className="flex-1 h-11">
            <Skeleton height="100%" borderRadius="0.75rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
          </div>
          <div className="flex-1 h-11">
            <Skeleton height="100%" borderRadius="0.75rem" className="dark:!bg-slate-800 dark:after:!bg-slate-700" />
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
