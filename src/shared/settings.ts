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

const storageArea: chrome.storage.StorageArea = chrome.storage?.sync ?? chrome.storage.local;
const storageAreaName: chrome.storage.AreaName =
  chrome.storage?.sync && storageArea === chrome.storage.sync ? "sync" : "local";
const blockedStorageArea: chrome.storage.StorageArea = chrome.storage.local;

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

      const stored = result[BLOCKED_SUBS_KEY] as string[] | undefined;
      if (!stored || stored.length === 0) {
        resolve([]);
        return;
      }

      resolve(stored.map((subreddit) => subreddit.toLowerCase()));
    });
  });
}

export async function setBlockedSubreddits(subreddits: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    blockedStorageArea.set({ [BLOCKED_SUBS_KEY]: subreddits }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
