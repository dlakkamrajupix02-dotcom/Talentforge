/** Backend generation_mode / status values for PDF-imported job descriptions. */
export const PDF_IMPORT_MODE = "saba";
export const PDF_IMPORT_STATUS = "saba";

export function isPdfImportedJd(jd) {
  if (!jd) return false;
  return (
    jd.generation_mode === PDF_IMPORT_MODE ||
    jd.source === PDF_IMPORT_STATUS ||
    jd._source === PDF_IMPORT_STATUS ||
    jd.status === PDF_IMPORT_STATUS ||
    (jd.industry && jd.industry.toLowerCase().includes("imported"))
  );
}

export function isPdfImportedMode(mode) {
  return mode === PDF_IMPORT_MODE || mode === "import";
}

export function isPdfImportedSource(source) {
  return source === PDF_IMPORT_STATUS || source === "import";
}
