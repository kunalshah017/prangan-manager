// PDF Storage using IndexedDB for large file caching
const DB_NAME = "prangan-pdf-storage";
const STORE_NAME = "pdfs";
const DB_VERSION = 1;
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface PDFCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

class PDFStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "url" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  async getPDF(url: string): Promise<Blob | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(url);

        request.onsuccess = () => {
          const entry = request.result as PDFCacheEntry | undefined;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if cache is still valid
          const age = Date.now() - entry.timestamp;
          if (age > CACHE_DURATION) {
            console.log("[PDF Storage] Cache expired for:", url);
            // Delete expired entry
            this.deletePDF(url);
            resolve(null);
            return;
          }

          console.log(
            `[PDF Storage] Retrieved from IndexedDB (${(
              entry.size /
              1024 /
              1024
            ).toFixed(2)}MB):`,
            url
          );
          resolve(entry.blob);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[PDF Storage] Error retrieving PDF:", error);
      return null;
    }
  }

  async storePDF(url: string, blob: Blob): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const entry: PDFCacheEntry = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size,
      };

      return new Promise((resolve, reject) => {
        const request = store.put(entry);

        request.onsuccess = () => {
          console.log(
            `[PDF Storage] Stored in IndexedDB (${(
              blob.size /
              1024 /
              1024
            ).toFixed(2)}MB):`,
            url
          );
          resolve(true);
        };

        request.onerror = () => {
          console.error("[PDF Storage] Error storing PDF:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("[PDF Storage] Error storing PDF:", error);
      return false;
    }
  }

  async deletePDF(url: string): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(url);
    } catch (error) {
      console.error("[PDF Storage] Error deleting PDF:", error);
    }
  }

  async clearExpired(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as PDFCacheEntry;
          const age = Date.now() - entry.timestamp;

          if (age > CACHE_DURATION) {
            cursor.delete();
            console.log("[PDF Storage] Deleted expired:", entry.url);
          }

          cursor.continue();
        }
      };
    } catch (error) {
      console.error("[PDF Storage] Error clearing expired:", error);
    }
  }

  async getStorageInfo(): Promise<{ used: number; quota: number }> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
    } catch (error) {
      console.error("[PDF Storage] Error getting storage info:", error);
    }
    return { used: 0, quota: 0 };
  }

  async listCachedPDFs(): Promise<string[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[PDF Storage] Error listing PDFs:", error);
      return [];
    }
  }
}

// Singleton instance
export const pdfStorage = new PDFStorage();

// Custom fetch wrapper that uses IndexedDB cache
export async function fetchPDFWithCache(url: string): Promise<string> {
  try {
    // Check IndexedDB cache first
    const cachedBlob = await pdfStorage.getPDF(url);
    if (cachedBlob) {
      return URL.createObjectURL(cachedBlob);
    }

    // Fetch from network
    console.log("[PDF Storage] Fetching from network:", url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // Store in IndexedDB (async, don't wait)
    pdfStorage.storePDF(url, blob).catch((err) => {
      console.warn("[PDF Storage] Failed to cache PDF:", err);
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("[PDF Storage] Error fetching PDF:", error);
    throw error;
  }
}
