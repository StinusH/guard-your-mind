export type BlockingStyle = "placeholder" | "remove" | "quotes" | "blur";

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

export const ALWAYS_BLOCKED_DOMAINS = new Set(
  ["redgifs.com"].map((domain) => domain.toLowerCase()),
);

const storageArea: chrome.storage.StorageArea = chrome.storage?.sync ?? chrome.storage.local;
const storageAreaName: chrome.storage.AreaName =
  chrome.storage?.sync && storageArea === chrome.storage.sync ? "sync" : "local";
const blockedStorageArea: chrome.storage.StorageArea = chrome.storage.local;

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

      resolve({ ...DEFAULT_SETTINGS, ...stored });
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

      callback(nextValue);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

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
