import React from 'react';
import { AlignLeft } from 'lucide-react';
import {
  resolveSectionsOrder,
  resolveSectionObject,
  resolveSectionMeta,
  unwrapSectionData,
  sectionTextValue,
  isStableSection,
  isSectionContentEmpty,
  isWeightedSectionData,
  normalizeForWeightedList,
} from '../../utils/formatJD';

/**
 * Read-only renderer for assigned JD sections (SABA stable shape + legacy keys).
 */
const AssignedJDContent = ({ jd, compact = false }) => {
  if (!jd) return null;

  const sectionsOrder = resolveSectionsOrder(jd);
  const sectionClass = compact
    ? 'bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4'
    : 'bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6';

  return (
    <>
      {sectionsOrder.map((sectionKey) => {
        if (sectionKey === 'sections_order') return null;

        const sectionObj = resolveSectionObject(jd, sectionKey);
        if (sectionObj === undefined || sectionObj === null) return null;

        const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
        const isUserCreated = !!(
          jd?.sections_metadata?.[sectionKey] || jd?.sections_metadata?.labels?.[sectionKey]
        );
        if (isSectionContentEmpty(sectionObj) && !isUserCreated) return null;

        const sectionContent = unwrapSectionData(sectionObj);
        const isLocked = isStableSection(sectionObj)
          ? (sectionObj.metadata?.view ?? sectionObj.METADATA?.view) === 'locked'
          : (jd?.[`${sectionKey}_view`] === 'locked' || jd?.content?.[`${sectionKey}_view`] === 'locked');
        const isWeightLocked = jd?.[`weight_view_${sectionKey}_view`] === 'locked'
          || jd?.content?.[`weight_view_${sectionKey}_view`] === 'locked';
        const weighted = isWeightedSectionData(sectionContent, sectionKey, meta);
        const isPoints = meta.type === 'points' || meta.type === 'weighted_list' || Array.isArray(sectionContent);

        if (isLocked) return null;

        return (
          <section key={sectionKey} className={sectionClass}>
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className={`${compact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'} bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100`}>
                <AlignLeft size={compact ? 18 : 24} />
              </div>
              <div>
                <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-black text-slate-900 leading-none uppercase`}>
                  {meta.label}
                </h3>
              </div>
            </div>

            {isPoints ? (
              <div className="space-y-3 pt-2">
                {(weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : [])).map((item, i) => {
                  const isObj = typeof item === 'object' && item !== null;
                  const title = isObj ? (item.title || item.point || item.name || item.text || '') : item;
                  const desc = isObj ? (item.description || '') : '';
                  const weight = isObj ? item.weight : undefined;

                  return (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 text-sm font-medium leading-relaxed">{title}</p>
                        {desc && (
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed italic">{desc}</p>
                        )}
                      </div>
                      {!isWeightLocked && weight !== undefined && weight > 0 && (
                        <div className="w-12 shrink-0 flex items-center justify-end">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">{weight}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pt-2">
                {sectionTextValue(sectionObj)}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
};

export default AssignedJDContent;
