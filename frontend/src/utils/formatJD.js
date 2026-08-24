/**
 * Strips internal highlight tags (e.g., [[mod:#color:Name]]...[[/mod]]) from text.
 * Used for clean editing or plain text export.
 */
export const stripHighlightTags = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[\[mod:(#[0-9A-F]{6}|#[0-9A-F]{3}|[a-z]+):(.*?)]]([\s\S]*?)\[\[\/mod]]/gi, '$3');
};

const extractText = (item) => {
  if (!item) return "";
  if (typeof item === "string") return stripHighlightTags(item);
  if (typeof item === "object") {
    const val = item.title || item.point || item.duty || item.description || "";
    return stripHighlightTags(String(val || ""));
  }
  return String(item);
};

/**
 * Converts a list (array of strings or objects) into a numbered bullet string.
 */
const formatList = (list, numbered = true) => {
  if (!Array.isArray(list) || list.length === 0) return "  Not specified";
  return list
    .map((item, i) => {
      const text = extractText(item);
      if (!text) return null;
      return numbered ? `  ${i + 1}. ${text}` : `  • ${text}`;
    })
    .filter(Boolean)
    .join("\n");
};

/**
 * Converts a JD content object (jd.content) into a clean, readable plain text string.
 * Handles both:
 *  - Array-of-objects format (from GenerateJD mapper)
 *  - Array-of-strings format (from mockHRDashboard)
 */
export const formatJDText = (content) => {
  if (!content) return "No content available.";

  const title       = content.title || "";
  const summary     = content.summary || "";
  const eeo         = content.eeo_statement || content.eeo || "";
  const department  = content.department || "";
  const location    = content.location || "";

  // Responsibilities — may be objects {title, weight, description} or strings
  const responsibilities =
    content.responsibilities ||
    content.key_duties ||
    content.essential_duties_and_responsibilities ||
    [];

  // Qualifications — may be nested { required: [...], preferred: [...] } or flat arrays
  const requiredQuals =
    content.qualifications?.required ||
    content.qualifications_required ||
    [];
  const preferredQuals =
    content.qualifications?.preferred ||
    content.qualifications_preferred ||
    [];

  // Core / Functional competencies
  const coreComps = content.coreCompetencies || content.core_competencies || [];
  const funcComps = content.functionalCompetencies || content.functional_competencies || [];

  const lines = [];

  if (title)       lines.push(title, "=".repeat(title.length), "");
  if (department)  lines.push(`Department : ${department}`);
  if (location)    lines.push(`Location   : ${location}`, "");

  lines.push("SUMMARY");
  lines.push("-".repeat(40));
  lines.push(summary || "Not specified", "");

  if (responsibilities.length > 0) {
    lines.push("KEY RESPONSIBILITIES");
    lines.push("-".repeat(40));
    lines.push(formatList(responsibilities), "");
  }

  if (requiredQuals.length > 0) {
    lines.push("REQUIRED QUALIFICATIONS");
    lines.push("-".repeat(40));
    lines.push(formatList(requiredQuals), "");
  }

  if (preferredQuals.length > 0) {
    lines.push("PREFERRED QUALIFICATIONS");
    lines.push("-".repeat(40));
    lines.push(formatList(preferredQuals), "");
  }

  if (coreComps.length > 0) {
    lines.push("CORE COMPETENCIES");
    lines.push("-".repeat(40));
    lines.push(formatList(coreComps, false), "");
  }

  if (funcComps.length > 0) {
    lines.push("FUNCTIONAL COMPETENCIES");
    lines.push("-".repeat(40));
    lines.push(formatList(funcComps, false), "");
  }

  if (eeo) {
    lines.push("EQUAL OPPORTUNITY STATEMENT");
    lines.push("-".repeat(40));
    lines.push(eeo, "");
  }
  return lines.join("\n");
};

/**
 * Formats a single salary value into a shortened string (L for India, k for others).
 */
export const formatSingleSalary = (val, symbol, period = "") => {
  if (!val) return "";
  
  // Remove commas and convert to number
  const numStr = val.toString().replace(/,/g, "");
  const num = parseFloat(numStr);
  if (isNaN(num)) return val;

  const isIndia = symbol === "₹" || symbol === "INR";
  const isYearly = period.toLowerCase().includes("yr") || period.toLowerCase().includes("year");

  if (isIndia) {
    if (num >= 1000) {
      // Full amount provided (e.g. 1200000), convert to lakhs
      return `${(num / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    }
    // Small number (e.g. 12), assume it's already in lakhs
    return `${num.toString().replace(/\.0$/, "")}L`;
  } else {
    // For non-rupee currencies
    if (isYearly) {
      if (num >= 1000) {
        // Full amount provided (e.g. 100000), convert to thousands
        return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
      }
      // Small number (e.g. 100), assume it's already in thousands
      return `${num.toString().replace(/\.0$/, "")}k`;
    }
    // Not yearly (e.g. /hr), just return the number
    return num.toString();
  }
};

/**
 * Formats a salary range with symbol and period.
 * Example: ₹12L/yr - ₹18L/yr or $100k/yr - $200k/yr
 */
export const formatSalaryRange = (min, max, symbol = "$", period = "") => {
  const formattedMin = formatSingleSalary(min, symbol, period);
  const formattedMax = formatSingleSalary(max, symbol, period);

  if (!formattedMin && !formattedMax) return "TBD";

  const unit = period ? (period.startsWith("/") ? period : `/${period}`) : "";

  if (formattedMin && formattedMax) {
    if (formattedMin === formattedMax) {
      return `${symbol}${formattedMin}${unit}`;
    }
    return `${symbol}${formattedMin}${unit} - ${symbol}${formattedMax}${unit}`;
  }
  
  return formattedMin ? `${symbol}${formattedMin}${unit}` : "TBD";
};

/**
 * Rebalances a list of items with weight attributes so that when one item's weight is modified,
 * the remaining weight is proportionally or equally distributed among the other items,
 * ensuring the total sum of all weights remains exactly 100%.
 */
export const rebalanceWeights = (items, changedIndex, newValue) => {
  const N = items.length;
  if (N === 0) return items;
  if (N === 1) {
    return items.map((item) => ({ ...item, weight: 100 }));
  }

  // Detect empty string input so that the user can delete/clear the number
  const isValueEmpty = newValue === "" || newValue === undefined || newValue === null;

  // Parse and clamp the new value between 0 and 100
  const parsedVal = parseInt(newValue);
  const clampedValue = isNaN(parsedVal) ? 0 : Math.max(0, Math.min(100, parsedVal));
  
  // Create a copy of the items with updated weight for the changed item
  const updatedItems = items.map((item, idx) => {
    if (idx === changedIndex) {
      // Keep empty string if it's empty, so it clears the input field
      return { ...item, weight: isValueEmpty ? "" : clampedValue };
    }
    const currentWeight = parseInt(item.weight);
    return { ...item, weight: isNaN(currentWeight) ? 0 : currentWeight };
  });

  const remainingWeight = 100 - clampedValue;
  const otherIndices = Array.from({ length: N }, (_, i) => i).filter(i => i !== changedIndex);
  
  // Calculate sum of other weights
  const sumOthers = otherIndices.reduce((sum, idx) => sum + updatedItems[idx].weight, 0);

  if (sumOthers > 0) {
    // Proportional distribution
    let currentSum = clampedValue;
    otherIndices.forEach((idx) => {
      const share = Math.round((updatedItems[idx].weight / sumOthers) * remainingWeight);
      updatedItems[idx].weight = share;
      currentSum += share;
    });

    // Adjust rounding error
    let diff = 100 - currentSum;
    if (diff !== 0 && otherIndices.length > 0) {
      // Add the difference to the other item with the largest weight (to minimize visual distortion)
      let targetIdx = otherIndices[0];
      let maxWeight = updatedItems[targetIdx].weight;
      otherIndices.forEach((idx) => {
        if (updatedItems[idx].weight > maxWeight) {
          maxWeight = updatedItems[idx].weight;
          targetIdx = idx;
        }
      });
      updatedItems[targetIdx].weight = Math.max(0, updatedItems[targetIdx].weight + diff);
    }
  } else {
    // Equal distribution since others are all 0
    let currentSum = clampedValue;
    const equalShare = Math.floor(remainingWeight / otherIndices.length);
    otherIndices.forEach((idx) => {
      updatedItems[idx].weight = equalShare;
      currentSum += equalShare;
    });

    // Adjust rounding error
    let diff = 100 - currentSum;
    if (diff !== 0 && otherIndices.length > 0) {
      // Add the difference to the first other item
      updatedItems[otherIndices[0]].weight = Math.max(0, updatedItems[otherIndices[0]].weight + diff);
    }
  }

  return updatedItems;
};

const WEIGHTED_SECTION_KEYS = new Set([
  "responsibilities", "core_competencies", "functional_competencies",
  "coreCompetencies", "functionalCompetencies", "key_duties",
  "qualifications_required", "qualifications_preferred"
]);

export const isStableSection = (obj) =>
  typeof obj === "object" && obj !== null && !Array.isArray(obj) &&
  (
    "section_data" in obj ||
    "SECTION_DATA" in obj ||
    ("name" in obj && "type" in obj) ||
    ("NAME" in obj && "TYPE" in obj)
  );

export const unwrapSectionData = (sectionContent) => {
  let current = sectionContent;
  let guard = 0;
  while (guard++ < 8) {
    if (isStableSection(current)) {
      const next = current.section_data ?? current.SECTION_DATA ?? current.data ?? current.DATA;
      if (next === current) break;
      current = next;
      continue;
    }
    if (typeof current === "object" && current !== null && !Array.isArray(current)) {
      const hasStableShape = "name" in current || "NAME" in current || "type" in current || "TYPE" in current;
      const nested = current.section_data ?? current.SECTION_DATA;
      if (hasStableShape && nested !== undefined) {
        current = nested;
        continue;
      }
    }
    break;
  }
  return current;
};

export const isSectionContentEmpty = (sectionContent) => {
  const data = unwrapSectionData(sectionContent);
  if (data === undefined || data === null || data === "") return true;
  if (Array.isArray(data)) {
    return data.length === 0 || data.every((item) => {
      if (item === null || item === undefined || item === "") return true;
      if (typeof item === "object") {
        const t = item.title || item.name || item.point || item.duty || item.DESCRIPTION || item.description || "";
        const d = item.description || item.DESCRIPTION || "";
        return String(t).trim() === "" && String(d).trim() === "";
      }
      return String(item).trim() === "";
    });
  }
  if (typeof data === "object") {
    return Object.keys(data).length === 0;
  }
  if (typeof data === "string") {
    return data.trim() === "" || data.replace(/<[^>]*>?/gm, "").trim() === "";
  }
  return false;
};

export const sectionTextValue = (sectionContent) => {
  const unwrapped = unwrapSectionData(sectionContent);
  if (typeof unwrapped === "string") return unwrapped;
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((item) => {
      if (typeof item === "object" && item !== null) {
        const t = item.title || item.name || item.point || "";
        const d = item.description || item.DESCRIPTION || "";
        if (t && d) return `${t}\n${d}`;
        if (t) return t;
        if (d) return d;
        return JSON.stringify(item);
      }
      return String(item);
    }).join("\n\n");
  }
  if (typeof unwrapped === "object" && unwrapped !== null) {
    return unwrapped.content || unwrapped.description || unwrapped.text || "";
  }
  return String(unwrapped ?? "");
};

const WEIGHTED_LABEL_PATTERN = /competenc|key performance|performance area|dut(y|ies)|responsibilit/i;

export const isWeightedSectionLabel = (label) =>
  WEIGHTED_LABEL_PATTERN.test(String(label || ""));

export const isWeightedSectionData = (sectionData, sectionKey, meta) => {
  if (WEIGHTED_SECTION_KEYS.has(sectionKey) || meta?.fieldType === "Weights" || meta?.type === "weighted_list") {
    return true;
  }
  if (isWeightedSectionLabel(meta?.label)) {
    return true;
  }
  if (Array.isArray(sectionData) && sectionData.length > 0) {
    const first = sectionData[0];
    if (typeof first === "object" && first !== null && "weight" in first) {
      return true;
    }
    if (typeof first === "object" && first !== null && "point" in first && isWeightedSectionLabel(meta?.label)) {
      return true;
    }
  }
  return false;
};

const parseItemWeight = (item) => {
  if (typeof item !== "object" || item === null) return 0;
  const raw = item.weight ?? item.Weight ?? item.percentage;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveWeightLockKey = (jd, sectionKey, titleStr) => {
  const semantic = String(titleStr || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const candidates = [
    `weight_view_${sectionKey}_view`,
    `weight_view_${semantic}_view`,
  ];
  if (semantic.includes("core_competenc")) {
    candidates.push("weight_view_corecompetencies_view", "weight_view_core_competencies_view");
  }
  if (semantic.includes("functional_competenc")) {
    candidates.push("weight_view_functionalcompetencies_view", "weight_view_functional_competencies_view");
  }
  if (semantic.includes("responsibilit") || semantic.includes("performance") || semantic.includes("dut")) {
    candidates.push("weight_view_responsibilities_view", "weight_view_key_duties_view");
  }
  for (const key of candidates) {
    if (jd?.[key] !== undefined || jd?.content?.[key] !== undefined) {
      return key;
    }
  }
  if (semantic.includes("functional_competenc")) return "weight_view_functionalcompetencies_view";
  if (semantic.includes("core_competenc")) return "weight_view_corecompetencies_view";
  if (semantic.includes("responsibilit") || semantic.includes("performance") || semantic.includes("dut")) {
    return "weight_view_responsibilities_view";
  }
  return `weight_view_${semantic}_view`;
};

export const resolveWeightLockState = (jd, sectionKey, titleStr) => {
  const semantic = String(titleStr || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const candidates = new Set([
    `weight_view_${sectionKey}_view`,
    `weight_view_${semantic}_view`,
  ]);
  if (semantic.includes("core_competenc")) {
    candidates.add("weight_view_corecompetencies_view");
    candidates.add("weight_view_core_competencies_view");
  }
  if (semantic.includes("functional_competenc")) {
    candidates.add("weight_view_functionalcompetencies_view");
    candidates.add("weight_view_functional_competencies_view");
  }
  if (semantic.includes("responsibilit") || semantic.includes("performance") || semantic.includes("dut")) {
    candidates.add("weight_view_responsibilities_view");
    candidates.add("weight_view_key_duties_view");
  }
  for (const key of candidates) {
    const val = jd?.[key] ?? jd?.content?.[key];
    if (val === "locked") return true;
    if (val === "unlocked") return false;
  }
  return false;
};

export const normalizeForEditableList = (sectionData) => {
  if (!Array.isArray(sectionData)) return [];
  return sectionData.map((item) => {
    if (typeof item === "string") return item;
    if (typeof item === "object" && item !== null) {
      return item.point || item.title || item.text || "";
    }
    return String(item ?? "");
  });
};

export const normalizeForWeightedList = (sectionData, autoAssignWeights = true) => {
  if (!Array.isArray(sectionData)) return [];
  const items = sectionData.map((item, i) => {
    if (typeof item === "string") {
      return { id: `item-${i}`, title: item, weight: 0, description: "" };
    }
    if (typeof item === "object" && item !== null) {
      return {
        id: item.id || `item-${i}`,
        title: item.title || item.point || item.text || "",
        weight: parseItemWeight(item),
        description: item.description || ""
      };
    }
    return { id: `item-${i}`, title: String(item ?? ""), weight: 0, description: "" };
  });

  if (autoAssignWeights && items.length > 0 && !items.some((item) => (parseInt(item.weight, 10) || 0) > 0)) {
    const base = Math.floor(100 / items.length);
    let remainder = 100 % items.length;
    items.forEach((item) => {
      item.weight = base + (remainder-- > 0 ? 1 : 0);
    });
  }

  return items;
};

export const toBackendSectionData = (items, isWeighted) => {
  if (!Array.isArray(items)) return isWeighted ? [] : "";
  if (isWeighted) {
    return items.map((item) => ({
      point: typeof item === "string" ? item : (item.title || item.point || ""),
      weight: parseInt(typeof item === "object" ? item.weight : 0, 10) || 0
    }));
  }
  return items.map((item) =>
    typeof item === "string" ? item : (item.point || item.title || item.text || "")
  );
};

/** Normalize section content for the regenerate-section API. */
export const prepareRegeneratePayload = (sectionKey, jd) => {
  const sectionObj = resolveSectionObject(jd, sectionKey);
  const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
  const unwrapped = unwrapSectionData(sectionObj);
  const weighted = isWeightedSectionData(unwrapped, sectionKey, meta);
  const isPoints = meta.type === "points" || meta.type === "weighted_list" || weighted || Array.isArray(unwrapped);

  let existingData;
  let sectionType = meta.type || "text";
  if (weighted) sectionType = "weighted_list";
  else if (isPoints) sectionType = meta.type === "weighted_list" ? "weighted_list" : "points";

  if (isPoints) {
    const rawItems = Array.isArray(unwrapped)
      ? unwrapped
      : (unwrapped && typeof unwrapped === "object" ? [unwrapped] : []);
    existingData = rawItems.map((item) => {
      if (typeof item === "string") return { point: item, weight: 0 };
      return {
        point: item.point || item.title || item.text || "",
        weight: parseInt(item.weight, 10) || 0,
      };
    });
  } else {
    existingData = typeof unwrapped === "string"
      ? unwrapped
      : (sectionTextValue(sectionObj) || "");
  }

  return {
    sectionName: sectionKey,
    sectionLabel: meta.label || String(sectionKey).replace(/_/g, " "),
    sectionType,
    existingData,
  };
};

/** Map AI regenerate response into editable section values. */
export const normalizeRegeneratedSectionContent = (updatedContent, meta, sectionKey) => {
  const weighted = meta.type === "weighted_list" || isWeightedSectionData(updatedContent, sectionKey, meta);
  const isPoints = meta.type === "points" || meta.type === "weighted_list" || weighted || Array.isArray(updatedContent);

  if (isPoints) {
    const rawItems = Array.isArray(updatedContent) ? updatedContent : [updatedContent];
    const mapped = rawItems.map((item) => {
      if (typeof item === "string") return { title: item, weight: 0, description: "" };
      return {
        ...item,
        title: item.title || item.point || "",
        weight: parseInt(item.weight, 10) || 0,
        description: item.description || "",
      };
    });
    return weighted ? normalizeForWeightedList(mapped, true) : mapped;
  }

  if (Array.isArray(updatedContent)) {
    return updatedContent.map((item) => {
      if (typeof item === "object" && item !== null) {
        const t = item.title || item.name || item.point || "";
        const d = item.description || item.DESCRIPTION || "";
        if (t && d) return `${t}\n${d}`;
        return t || d || JSON.stringify(item);
      }
      return String(item);
    }).join("\n\n");
  }

  return typeof updatedContent === "string" ? updatedContent : JSON.stringify(updatedContent);
};

const sectionKeyNumber = (key) => {
  const match = /^section_(\d+)$/.exec(key || "");
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

/** True only for real stable section keys (section_1, section_2) — not section_1_view lock keys. */
export const isStableSectionKey = (key) => /^section_\d+$/.test(String(key || "").trim());

/** True for section visibility lock keys like section_1_view. */
export const isSectionViewLockKey = (key) => /^section_\d+_view$/.test(String(key || "").trim());

/** Strip view-lock pseudo-sections from content and sections_order; merge locks into metadata.view. */
export const sanitizeStableContent = (content = {}, sectionsMetadata = {}) => {
  const nextContent = { ...(content || {}) };
  const nextMeta = { ...(sectionsMetadata || {}) };

  Object.keys(nextContent).forEach((key) => {
    const viewMatch = /^section_(\d+)_view$/.exec(key);
    if (!viewMatch) return;
    const baseKey = `section_${viewMatch[1]}`;
    const val = nextContent[key];
    delete nextContent[key];

    let lockVal = "unlocked";
    if (val === "locked" || val === "unlocked") lockVal = val;
    else if (val && typeof val === "object") {
      const sd = val.section_data ?? val.SECTION_DATA;
      if (sd === "locked" || sd === "unlocked") lockVal = sd;
      else if (val.metadata?.view) lockVal = val.metadata.view;
    }

    if (nextContent[baseKey] && typeof nextContent[baseKey] === "object") {
      nextContent[baseKey] = {
        ...nextContent[baseKey],
        metadata: {
          ...(nextContent[baseKey].metadata || {}),
          view: lockVal === "locked" ? "locked" : "unlocked",
        },
      };
    }
  });

  Object.keys(nextContent).forEach((key) => {
    if (String(key).startsWith("section_") && !isStableSectionKey(key)) {
      delete nextContent[key];
    }
  });

  const orderSource = nextContent.sections_order || nextMeta.order || [];
  const cleanedOrder = orderSource.filter((k) => isStableSectionKey(k) && nextContent[k] !== undefined);
  Object.keys(nextContent).forEach((k) => {
    if (isStableSectionKey(k) && !cleanedOrder.includes(k)) cleanedOrder.push(k);
  });
  nextContent.sections_order = cleanedOrder;

  const locks = { ...(nextMeta.locks || {}) };
  const labels = { ...(nextMeta.labels || {}) };
  cleanedOrder.forEach((k) => {
    const sec = nextContent[k];
    if (sec && typeof sec === "object") {
      locks[k] = sec.metadata?.view || locks[k] || "unlocked";
      labels[k] = sec.name || labels[k] || k.replace(/_/g, " ");
    }
  });

  return {
    content: nextContent,
    sections_metadata: { ...nextMeta, order: cleanedOrder, locks, labels },
  };
};

export const resolveSectionsOrder = (jd) => {
  const mergeStableSectionKeys = (order) => {
    const normalized = normalizeSectionsOrder(order);
    const content = jd?.content || jd || {};
    const discovered = Object.keys(content)
      .filter((k) => isStableSectionKey(k) && resolveSectionObject(jd, k) !== undefined)
      .sort((a, b) => sectionKeyNumber(a) - sectionKeyNumber(b));
    if (normalized.length === 0) return discovered;
    const merged = [...normalized];
    for (const key of discovered) {
      if (!merged.includes(key)) merged.push(key);
    }
    return merged;
  };

  const pickResolvableOrder = (order) => {
    const normalized = normalizeSectionsOrder(order);
    if (normalized.length === 0) return [];
    const resolvable = normalized.filter((key) => resolveSectionObject(jd, key) !== undefined);
    if (resolvable.length === 0) return [];
    return mergeStableSectionKeys(resolvable);
  };

  const orderSources = [
    jd?.content?.sections_order,
    jd?.sections_order,
    jd?.sections_metadata?.order,
    jd?.content?._section_order,
    jd?._section_order,
  ];

  for (const source of orderSources) {
    if (!Array.isArray(source) || source.length === 0) continue;
    const resolved = pickResolvableOrder(source);
    if (resolved.length > 0) return resolved;
  }

  const content = jd?.content || jd || {};
  const discoveredStable = Object.keys(content)
    .filter((k) => isStableSectionKey(k) && resolveSectionObject(jd, k) !== undefined)
    .sort((a, b) => sectionKeyNumber(a) - sectionKeyNumber(b));
  if (discoveredStable.length > 0) return discoveredStable;

  const legacySections = [
    "summary",
    "essential_duties_and_responsibilities",
    "key_duties",
    "responsibilities",
    "core_competencies",
    "coreCompetencies",
    "functional_competencies",
    "functionalCompetencies",
    "qualifications_required",
    "qualifications_preferred",
    "eeo_statement",
  ];
  const isNonEmpty = (val) => {
    if (val === undefined || val === null) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  };
  const legacyPresent = legacySections.filter((k) => isNonEmpty(resolveSectionObject(jd, k)));
  if (legacyPresent.length > 0) return legacyPresent;

  return [];
};

/** Normalize section order arrays to plain string keys (handles legacy weighted-object corruption). */
export const normalizeSectionsOrder = (order) => {
  if (!Array.isArray(order)) return [];
  return order
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null) {
        return String(item.point || item.title || item.name || item.key || item.id || "").trim();
      }
      return String(item ?? "").trim();
    })
    .filter(Boolean);
};

/** Keep section order in sync across content, metadata, and root-level mirrors. */
export const applySectionsOrder = (jd, newOrder) => {
  const normalizedOrder = normalizeSectionsOrder(newOrder);
  if (!Array.isArray(normalizedOrder) || normalizedOrder.length === 0) return jd;
  return {
    ...jd,
    sections_order: normalizedOrder,
    content: { ...(jd?.content || {}), sections_order: normalizedOrder },
    sections_metadata: {
      ...(jd?.sections_metadata || {}),
      order: normalizedOrder,
    },
  };
};

export const resolveSectionObject = (jd, sectionKey) => {
  if (!jd || sectionKey == null) return undefined;
  const key = String(sectionKey).trim();
  if (!key) return undefined;

  const nested = jd.content;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const fromContent = nested[key];
    if (fromContent !== undefined && fromContent !== null) return fromContent;
  }

  const fromRoot = jd[key];
  if (fromRoot !== undefined && fromRoot !== null) return fromRoot;

  return undefined;
};

export const resolveSectionMeta = (sectionKey, sectionObj, sectionsMetadata) => {
  const labels = sectionsMetadata?.labels || {};
  if (isStableSection(sectionObj)) {
    const label = sectionObj.name || sectionObj.NAME || labels[sectionKey] || sectionKey.replace(/_/g, " ");
    let type = sectionObj.type || sectionObj.TYPE || "text";
    if (type === "points" && isWeightedSectionLabel(label)) {
      type = "weighted_list";
    }
    return {
      label,
      type,
      fieldType: sectionsMetadata?.[sectionKey]?.fieldType
    };
  }
  const perSectionMeta = sectionsMetadata?.[sectionKey];
  const fallbackLabel = labels[sectionKey]
    || perSectionMeta?.label
    || sectionKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const fallbackType = perSectionMeta?.type
    || (isWeightedSectionLabel(fallbackLabel) ? "weighted_list" : "text");
  return perSectionMeta || {
    label: fallbackLabel,
    type: fallbackType
  };
};

/** Whether a section is included in CSOD push (defaults to true). */
export const resolvePushToCsod = (jd, sectionKey, sectionObj) => {
  const obj = sectionObj ?? resolveSectionObject(jd, sectionKey);
  if (isStableSection(obj) && obj.metadata?.push_to_csod !== undefined) {
    return obj.metadata.push_to_csod !== false;
  }
  const perMeta = jd?.sections_metadata?.[sectionKey];
  if (perMeta && typeof perMeta === "object" && perMeta.push_to_csod !== undefined) {
    return perMeta.push_to_csod !== false;
  }
  return true;
};

export const listItemDisplayText = (item) => {
  if (typeof item === "string") return stripHighlightTags(item);
  if (typeof item === "object" && item !== null) {
    return stripHighlightTags(item.point || item.title || item.text || "");
  }
  return stripHighlightTags(String(item ?? ""));
};

/** Remove a section and re-index section_N keys so no gaps remain (section_9 → section_8). */
export const deleteAndReindexStableSections = (content = {}, sectionsMetadata = {}, sectionKey) => {
  const nextContent = { ...(content || {}) };
  const nextMeta = { ...(sectionsMetadata || {}) };

  delete nextContent[sectionKey];
  if (nextMeta[sectionKey]) delete nextMeta[sectionKey];
  if (nextMeta.locks?.[sectionKey]) delete nextMeta.locks[sectionKey];
  if (nextMeta.labels?.[sectionKey]) delete nextMeta.labels[sectionKey];

  const orderSources = [
    nextContent.sections_order,
    nextMeta.order,
  ];
  const sectionsOrder = orderSources
    .find((order) => Array.isArray(order) && order.length > 0)
    ?.filter((k) => k !== sectionKey)
    ?? [];

  return reindexStableSections(nextContent, nextMeta, sectionsOrder);
};

/** Shift section_N keys down after deletions so keys are always sequential. */
export const reindexStableSections = (content = {}, sectionsMetadata = {}, sectionsOrder = null) => {
  const nextContent = { ...(content || {}) };
  const nextMeta = { ...(sectionsMetadata || {}) };

  const orderSource = sectionsOrder
    ?? (Array.isArray(nextContent.sections_order) ? nextContent.sections_order : nextMeta.order)
    ?? [];

  const nonSectionKeys = orderSource.filter((k) => !String(k).startsWith("section_"));

  // Preserve the user's display order from sections_order; append any orphan keys at the end
  const orderSectionKeys = orderSource.filter(
    (k) => isStableSectionKey(k) && nextContent[k] !== undefined
  );
  const discovered = Object.keys(nextContent).filter(
    (k) => isStableSectionKey(k) && nextContent[k] !== undefined
  );
  const orderedSectionKeys = [
    ...orderSectionKeys,
    ...discovered
      .filter((k) => !orderSectionKeys.includes(k))
      .sort((a, b) => sectionKeyNumber(a) - sectionKeyNumber(b)),
  ];

  const keyMap = {};
  const reindexedContent = {};

  orderedSectionKeys.forEach((oldKey, index) => {
    const newKey = `section_${index + 1}`;
    keyMap[oldKey] = newKey;
    reindexedContent[newKey] = nextContent[oldKey];
  });

  Object.keys(nextContent).forEach((k) => {
    if (k.startsWith("section_")) delete nextContent[k];
  });
  Object.assign(nextContent, reindexedContent);

  const newSectionOrder = orderedSectionKeys.map((oldKey) => keyMap[oldKey]);
  nextContent.sections_order = [...nonSectionKeys, ...newSectionOrder];

  const remapDict = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    const remapped = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (k.startsWith("section_")) {
        if (keyMap[k]) remapped[keyMap[k]] = v;
      } else {
        remapped[k] = v;
      }
    });
    return remapped;
  };

  Object.keys(nextMeta).forEach((k) => {
    if (k.startsWith("section_") && !keyMap[k]) delete nextMeta[k];
  });
  Object.entries(keyMap).forEach(([oldKey, newKey]) => {
    if (nextMeta[oldKey] !== undefined) {
      nextMeta[newKey] = nextMeta[oldKey];
      delete nextMeta[oldKey];
    }
  });

  if (nextMeta.locks) nextMeta.locks = remapDict(nextMeta.locks);
  if (nextMeta.labels) nextMeta.labels = remapDict(nextMeta.labels);
  nextMeta.order = nextContent.sections_order;

  return { content: nextContent, sections_metadata: nextMeta, keyMap };
};