import type { ExtensionSettings } from "../shared/settings";
import { getSettings, subscribeToSettings } from "../shared/settings";
import { CONFIG, SELECTORS } from "./config";
import {
  clearBlurredContent,
  createSidebarPlaceholder,
  filterSearchResults,
  processPage,
  restoreBlockedElements,
} from "./blocking";
import { log } from "./logger";
import { setupShadowDOMWatcher } from "./shadowWatchers";
import { createSidebarFilter } from "./sidebarFilter";
import { extractSubredditFromHref } from "./subreddit";
import {
  areObserversInitialized,
  blockedSubreddits,
  flushBlockedSubredditPersistence,
  getBlockingStyle,
  isBlockingEnabled,
  loadStoredBlockedSubreddits,
  markObserversInitialized,
  onSubredditTracked,
  subscribeToBlockedSubredditStorage,
  updateExtensionSettings,
} from "./state";

const sidebarFilter = createSidebarFilter({
  config: {
    blankedClass: CONFIG.blankedClass,
    placeholderClass: CONFIG.placeholderClass,
  },
  selectors: {
    shadowDOM: {
      sidebarRecentItem: SELECTORS.shadowDOM.sidebarRecentItem,
      sidebarRecentLink: SELECTORS.shadowDOM.sidebarRecentLink,
      sidebarHost: SELECTORS.shadowDOM.sidebarHost,
      communityController: SELECTORS.shadowDOM.communityController,
      communityItem: SELECTORS.shadowDOM.communityItem,
      communityItemLink: SELECTORS.shadowDOM.communityItemLink,
      communityItemList: SELECTORS.shadowDOM.communityItemList,
    },
  },
  blockedSubreddits,
  isBlockingEnabled,
  extractSubredditFromHref,
  createSidebarPlaceholder,
  getBlockingStyle,
  isDebugEnabled: () => CONFIG.debugMode,
  log,
});

onSubredditTracked(({ isNew }) => {
  sidebarFilter.triggerRefresh();
  if (isNew) {
    sidebarFilter.resetState();
  }
});

void loadStoredBlockedSubreddits()
  .then((changed) => {
    if (changed) {
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
    }
  })
  .catch((error) => {
    console.error("Guard Your Mind failed to load blocked subreddits", error);
  });

subscribeToBlockedSubredditStorage(() => {
  sidebarFilter.resetState();
  sidebarFilter.triggerRefresh();
  processPage();
});

const ensureInitialized = (): void => {
  if (areObserversInitialized() || !isBlockingEnabled()) {
    return;
  }

  init();
  markObserversInitialized();
};

const setupObserver = (): void => {
  if (!document.body) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    if (!isBlockingEnabled()) {
      return;
    }

    const hasSearchResults = mutations.some((mutation) => {
      return Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          return (
            element.matches(SELECTORS.containers.searchResults[0]) ||
            element.querySelector(SELECTORS.containers.searchResults[0]) ||
            element.matches(SELECTORS.mature.search.warnings) ||
            element.querySelector(SELECTORS.mature.search.warnings)
          );
        }
        return false;
      });
    });

    if (hasSearchResults) {
      filterSearchResults();
    }

    window.clearTimeout((window as unknown as { gymTimeout?: number }).gymTimeout);
    (window as unknown as { gymTimeout?: number }).gymTimeout = window.setTimeout(() => {
      processPage();
    }, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

function init(): void {
  setupShadowDOMWatcher(sidebarFilter);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      processPage();
      setupObserver();
    });
  } else {
    processPage();
    setupObserver();
  }

  window.addEventListener("load", () => {
    processPage();
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
      setupShadowDOMWatcher(sidebarFilter);
      processPage();
    }
  }).observe(document, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    flushBlockedSubredditPersistence();
  });
}

const resetBlockedContent = (previousStyle?: ExtensionSettings["blockingStyle"]): void => {
  if (previousStyle === "blur") {
    clearBlurredContent();
  } else {
    restoreBlockedElements();
  }
};

const handleSettingsUpdate = (settings: ExtensionSettings): void => {
  const { wasBlocking, previousStyle, previousBlock18 } = updateExtensionSettings(settings);
  const block18Changed = previousBlock18 !== settings.block18PlusContent;
  const shouldReprocess =
    (!wasBlocking || previousStyle !== settings.blockingStyle || block18Changed) &&
    areObserversInitialized();

  if (settings.blockingEnabled) {
    ensureInitialized();
    if (shouldReprocess) {
      resetBlockedContent(previousStyle);
      processPage();
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
    } else if (block18Changed) {
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
    }
  } else if (wasBlocking) {
    log("Guard Your Mind blocking disabled via settings");
    resetBlockedContent(previousStyle);
  }

  if (previousStyle === "blur" && settings.blockingStyle !== "blur") {
    clearBlurredContent();
  }
};

if (typeof document !== "undefined") {
  subscribeToSettings(handleSettingsUpdate);

  void getSettings()
    .then((settings) => {
      handleSettingsUpdate(settings);
    })
    .catch((error) => {
      console.error("Failed to load Guard Your Mind settings", error);
      if (isBlockingEnabled()) {
        ensureInitialized();
      }
    });
}
