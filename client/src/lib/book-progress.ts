type ReadingProgressStorage = Pick<Storage, "getItem" | "setItem">;

const progressKey = (bookId: string) =>
  `prangan-library:last-read:${bookId}`;

const browserStorage = () => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export const readLastReadPage = (
  bookId: string,
  storage: ReadingProgressStorage | undefined = browserStorage(),
) => {
  if (!storage) return 1;
  try {
    const page = Number(storage.getItem(progressKey(bookId)));
    return Number.isInteger(page) && page >= 1 ? page : 1;
  } catch {
    return 1;
  }
};

export const writeLastReadPage = (
  bookId: string,
  page: number,
  storage: ReadingProgressStorage | undefined = browserStorage(),
) => {
  if (!storage || !Number.isInteger(page) || page < 1) return;
  try {
    storage.setItem(progressKey(bookId), String(page));
  } catch {
    // Reading remains available when storage is blocked or full.
  }
};
