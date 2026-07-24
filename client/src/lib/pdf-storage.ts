const LEGACY_PDF_DB = "prangan-pdf-storage";
const CLEANUP_KEY = "prangan-legacy-pdf-cache-cleared";

export const clearLegacyPdfCache = () => {
  if (localStorage.getItem(CLEANUP_KEY)) return;

  const request = indexedDB.deleteDatabase("prangan-pdf-storage");
  request.onsuccess = () => localStorage.setItem(CLEANUP_KEY, "1");
  request.onerror = () => {
    console.warn(
      "[Library] Could not clear the legacy PDF cache",
      request.error,
    );
  };
  request.onblocked = () => {
    console.warn(`[Library] Legacy cache cleanup blocked: ${LEGACY_PDF_DB}`);
  };
};
