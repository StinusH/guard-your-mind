import type { BlockingStyle, ExtensionSettings } from "../shared/settings";
import {
  DEFAULT_SETTINGS,
  getBlockedSubreddits,
  setBlockedSubreddits,
  subscribeToBlockedSubreddits,
  sanitizeBlockingStyle,
} from "../shared/settings";
import { CONFIG } from "./config";
import { log } from "./logger";

export const blockedSubreddits = new Set<string>();
export const nsfwSubredditCache = new Map<string, boolean>();
export const pendingSubredditChecks = new Map<string, Promise<void>>();

let extensionSettings: ExtensionSettings = DEFAULT_SETTINGS;
let observersInitialized = false;
let persistBlockedSubredditsTimeout: number | null = null;

type TrackedSubredditListener = (details: {
  subreddit: string;
  reason: string;
  isNew: boolean;
}) => void;

const trackedSubredditListeners = new Set<TrackedSubredditListener>();

const notifyTrackedListeners = (details: {
  subreddit: string;
  reason: string;
  isNew: boolean;
}): void => {
  trackedSubredditListeners.forEach((listener) => listener(details));
};

const normalizeSubreddit = (value: string): string => value.trim().toLowerCase();

const schedulePersistBlockedSubreddits = (): void => {
  if (persistBlockedSubredditsTimeout !== null) {
    window.clearTimeout(persistBlockedSubredditsTimeout);
  }

  persistBlockedSubredditsTimeout = window.setTimeout(() => {
    persistBlockedSubredditsTimeout = null;
    void setBlockedSubreddits(Array.from(blockedSubreddits)).catch((error) => {
      console.error("Guard Your Mind failed to persist blocked subreddits", error);
    });
  }, 100);
};

export const flushBlockedSubredditPersistence = (): void => {
  if (persistBlockedSubredditsTimeout === null) {
    return;
  }

  window.clearTimeout(persistBlockedSubredditsTimeout);
  persistBlockedSubredditsTimeout = null;
  void setBlockedSubreddits(Array.from(blockedSubreddits)).catch((error) => {
    console.error("Guard Your Mind failed to persist blocked subreddits before unload", error);
  });
};

export const isBlockingEnabled = (): boolean => extensionSettings.blockingEnabled;
export const getBlockingStyle = (): BlockingStyle =>
  sanitizeBlockingStyle(extensionSettings.blockingStyle);
export const shouldBlock18Plus = (): boolean => extensionSettings.block18PlusContent !== false;

export const areObserversInitialized = (): boolean => observersInitialized;
export const markObserversInitialized = (): void => {
  observersInitialized = true;
};

export const resetObserversInitialized = (): void => {
  observersInitialized = false;
};

export const updateExtensionSettings = (
  settings: ExtensionSettings,
): {
  wasBlocking: boolean;
  previousStyle: BlockingStyle | undefined;
  previousBlock18: boolean | undefined;
} => {
  const previous = extensionSettings;
  extensionSettings = settings;

  return {
    wasBlocking: previous.blockingEnabled,
    previousStyle: previous.blockingStyle,
    previousBlock18: previous.block18PlusContent,
  };
};

export const onSubredditTracked = (listener: TrackedSubredditListener): (() => void) => {
  trackedSubredditListeners.add(listener);
  return () => trackedSubredditListeners.delete(listener);
};

const replaceBlockedSubredditSet = (values: string[]): boolean => {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => normalizeSubreddit(value));

  const incoming = new Set(normalized);
  let changed = incoming.size !== blockedSubreddits.size;

  if (!changed) {
    for (const value of incoming) {
      if (!blockedSubreddits.has(value)) {
        changed = true;
        break;
      }
    }
  }

  if (!changed) {
    return false;
  }

  blockedSubreddits.clear();
  incoming.forEach((value) => blockedSubreddits.add(value));
  return true;
};

export const loadStoredBlockedSubreddits = async (): Promise<boolean> => {
  const storedSubreddits = await getBlockedSubreddits();
  if (!storedSubreddits.length) {
    return false;
  }

  const changed = replaceBlockedSubredditSet(storedSubreddits);
  if (changed) {
    log(`Loaded blocked subreddits from storage: ${Array.from(blockedSubreddits).join(", ")}`);
  }
  return changed;
};

export const subscribeToBlockedSubredditStorage = (onChange: () => void): void => {
  subscribeToBlockedSubreddits((storedSubreddits) => {
    const changed = replaceBlockedSubredditSet(storedSubreddits);
    if (changed) {
      onChange();
    }
  });
};

export const trackCurrentSubreddit = (reason: string, explicitSubreddit?: string): void => {
  const match = explicitSubreddit ?? location.pathname.match(/^\/r\/([^/]+)/)?.[1];
  if (!match) {
    if (CONFIG.debugMode) {
      log(
        `trackCurrentSubreddit invoked via ${reason} but no subreddit matched in location.pathname "${location.pathname}"`,
      );
    }
    return;
  }

  const subreddit = normalizeSubreddit(match);
  const wasNew = !blockedSubreddits.has(subreddit);
  blockedSubreddits.add(subreddit);

  if (wasNew) {
    log(
      `Tracked new blocked subreddit "${subreddit}" via ${reason}. Full blocked set: ${Array.from(blockedSubreddits).join(", ")}`,
    );
    schedulePersistBlockedSubreddits();
  } else {
    log(`Subreddit "${subreddit}" already tracked (triggered by ${reason}).`);
  }

  notifyTrackedListeners({ subreddit, reason, isNew: wasNew });
};
