export type BlockingStyle = "placeholder" | "remove" | "quotes" | "blur";

export interface ExtensionSettings {
  blockingEnabled: boolean;
  blockingStyle: BlockingStyle;
  showBlockedCounter: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  blockingEnabled: true,
  blockingStyle: "placeholder",
  showBlockedCounter: true,
};

const STORAGE_KEY = "guardYourMind.settings";

const storageArea: chrome.storage.StorageArea = chrome.storage?.sync ?? chrome.storage.local;
const storageAreaName: chrome.storage.AreaName =
  chrome.storage?.sync && storageArea === chrome.storage.sync ? "sync" : "local";

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
