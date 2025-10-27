export type BlockingStyle = "placeholder" | "remove" | "quotes" | "bible";

const BLOCKING_STYLE_FALLBACK: BlockingStyle = "placeholder";
const BLOCKING_STYLE_SET = new Set<BlockingStyle>(["placeholder", "remove", "quotes", "bible"]);

export const sanitizeBlockingStyle = (value: unknown): BlockingStyle => {
  if (typeof value === "string" && BLOCKING_STYLE_SET.has(value as BlockingStyle)) {
    return value as BlockingStyle;
  }

  return BLOCKING_STYLE_FALLBACK;
};

export interface ExtensionSettings {
  blockingEnabled: boolean;
  blockingStyle: BlockingStyle;
  showBlockedCounter: boolean;
  block18PlusContent: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  blockingEnabled: true,
  blockingStyle: "placeholder",
  showBlockedCounter: true,
  block18PlusContent: true,
};

const STORAGE_KEY = "guardYourMind.settings";
const BLOCKED_SUBS_KEY = "guardYourMind.blockedSubreddits";

/**
 * Domains that should be considered adult content even if Reddit does not flag them.
 */
export const ALWAYS_BLOCKED_DOMAINS = new Set(
  ["redgifs.com"].map((domain) => domain.toLowerCase()),
);

const storageArea: chrome.storage.StorageArea = chrome.storage?.sync ?? chrome.storage.local;
const storageAreaName: chrome.storage.AreaName =
  chrome.storage?.sync && storageArea === chrome.storage.sync ? "sync" : "local";
const blockedStorageArea: chrome.storage.StorageArea = chrome.storage.local;

/**
 * Normalizes a subreddit name into lowercase without the `r/` prefix.
 * Returns null when the supplied value does not resemble a subreddit.
 */
export const normalizeSubredditName = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/r/")) {
    trimmed = trimmed.slice(3);
  } else if (trimmed.startsWith("r/")) {
    trimmed = trimmed.slice(2);
  }

  trimmed = trimmed.toLowerCase();

  if (!/^[a-z0-9_]{2,21}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

/**
 * Normalizes, deduplicates, and sorts a list of subreddit names.
 */
const normalizeSubredditList = (subreddits: string[]): string[] => {
  const normalized = new Set<string>();
  subreddits.forEach((candidate) => {
    const value = normalizeSubredditName(candidate);
    if (value) {
      normalized.add(value);
    }
  });
  return Array.from(normalized).sort((a, b) => a.localeCompare(b));
};

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve, reject) => {
    storageArea.get(STORAGE_KEY, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      const stored = result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;

      const merged: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        ...stored,
      };

      merged.blockingStyle = sanitizeBlockingStyle(stored?.blockingStyle);

      resolve(merged);
    });
  });
}

export async function setSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    storageArea.set({ [STORAGE_KEY]: settings }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

export function subscribeToSettings(callback: (settings: ExtensionSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== storageAreaName) {
      return;
    }

    if (changes[STORAGE_KEY]) {
      const stored =
        (changes[STORAGE_KEY].newValue as Partial<ExtensionSettings> | undefined) ?? {};

      const nextValue: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        ...stored,
      };

      nextValue.blockingStyle = sanitizeBlockingStyle(stored?.blockingStyle);

      callback(nextValue);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

/**
 * Retrieves the blocked-sub list from chrome.storage.local.
 */
export async function getBlockedSubreddits(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    blockedStorageArea.get(BLOCKED_SUBS_KEY, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      const stored = (result[BLOCKED_SUBS_KEY] as string[] | undefined) ?? [];
      resolve(normalizeSubredditList(stored));
    });
  });
}

/**
 * Writes a blocked-sub list back to storage after normalization.
 */
export async function setBlockedSubreddits(subreddits: string[]): Promise<void> {
  const normalized = normalizeSubredditList(subreddits);
  return new Promise((resolve, reject) => {
    blockedStorageArea.set({ [BLOCKED_SUBS_KEY]: normalized }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Subscribes to chrome.storage changes for the blocked-sub list.
 * Returns an unsubscribe function.
 */
export function subscribeToBlockedSubreddits(callback: (subreddits: string[]) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== "local") {
      return;
    }

    if (BLOCKED_SUBS_KEY in changes) {
      const next = (changes[BLOCKED_SUBS_KEY].newValue as string[] | undefined) ?? [];
      callback(normalizeSubredditList(next));
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
