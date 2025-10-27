import type { ShadowHost } from "../shared/dom";
import {
  filterSidebarContent,
  type FilterResult,
  type SidebarShadowSelectors,
} from "./sidebar/filterRunner";
import type { SidebarPlaceholderConfig } from "./sidebar/placeholders";

type SidebarFilterDependencies = {
  config: SidebarPlaceholderConfig;
  selectors: { shadowDOM: SidebarShadowSelectors };
  blockedSubreddits: Set<string>;
  isBlockingEnabled: () => boolean;
  extractSubredditFromHref: (href: string) => string | null;
  createSidebarPlaceholder: (subreddit: string) => HTMLElement;
  isDebugEnabled: () => boolean;
  log: (...args: unknown[]) => void;
};

export type SidebarFilterController = {
  triggerRefresh: () => void;
  observeSidebarDOM: () => void;
  resetState: () => void;
};

export function createSidebarFilter(deps: SidebarFilterDependencies): SidebarFilterController {
  const {
    config,
    selectors,
    blockedSubreddits,
    isBlockingEnabled,
    extractSubredditFromHref,
    createSidebarPlaceholder,
    isDebugEnabled,
    log,
  } = deps;

  const shadowSelectors = selectors.shadowDOM;

  let lastSnapshot = "";
  let pendingSidebarRefresh = false;
  let sidebarObserver: MutationObserver | null = null;
  let sidebarShadowRoot: ShadowRoot | null = null;
  let communityObserver: MutationObserver | null = null;
  let communityShadowRoot: ShadowRoot | null = null;
  let communityControllerObserver: MutationObserver | null = null;
  let communityShadowRootPoll: number | null = null;

  const debugLog = (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      log("[Guard Your Mind][sidebar]", ...args);
    }
  };

  const buildFilterContext = () => ({
    config,
    selectors: shadowSelectors,
    blockedSubreddits,
    extractSubredditFromHref,
    createSidebarPlaceholder,
    isBlockingEnabled,
    isDebugEnabled,
    debugLog,
  });

  const applyFilterForRoot = (
    root: ShadowRoot | null,
    mode: "recent" | "community",
    displayAccumulator: string[],
  ): string | null => {
    if (!root) {
      return null;
    }

    const result: FilterResult | null = filterSidebarContent(root, mode, buildFilterContext());
    if (!result) {
      return null;
    }

    result.display.forEach((item) => {
      displayAccumulator.push(`${mode}:${item}`);
    });

    return result.snapshot;
  };

  function triggerRefresh(): void {
    if (sidebarShadowRoot) {
      runFilters();
      return;
    }

    if (!pendingSidebarRefresh) {
      pendingSidebarRefresh = true;
    }
  }

  const ensureCommunityObserverAttached = (): void => {
    if (!shadowSelectors.communityController) {
      return;
    }

    const controller = document.querySelector(shadowSelectors.communityController);
    if (!controller) {
      if (!communityControllerObserver && document.body) {
        communityControllerObserver = new MutationObserver(() => {
          const candidate = document.querySelector(shadowSelectors.communityController);
          if (candidate && (candidate as ShadowHost).shadowRoot) {
            communityControllerObserver?.disconnect();
            communityControllerObserver = null;
            ensureCommunityObserverAttached();
            triggerRefresh();
          }
        });

        communityControllerObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      return;
    }

    communityControllerObserver?.disconnect();
    communityControllerObserver = null;

    const controllerHost = controller as ShadowHost | null;
    if (!controllerHost) {
      return;
    }

    if (!controllerHost.shadowRoot) {
      if (communityShadowRootPoll === null && typeof window !== "undefined") {
        communityShadowRootPoll = window.setInterval(() => {
          if (!controllerHost.isConnected) {
            if (communityShadowRootPoll !== null) {
              window.clearInterval(communityShadowRootPoll);
              communityShadowRootPoll = null;
            }
            return;
          }

          if (controllerHost.shadowRoot) {
            if (communityShadowRootPoll !== null) {
              window.clearInterval(communityShadowRootPoll);
              communityShadowRootPoll = null;
            }
            ensureCommunityObserverAttached();
            triggerRefresh();
          }
        }, 50);
      }
      return;
    }

    if (communityShadowRootPoll !== null && typeof window !== "undefined") {
      window.clearInterval(communityShadowRootPoll);
      communityShadowRootPoll = null;
    }

    const root = controllerHost.shadowRoot;
    communityShadowRoot = root;

    if (communityObserver) {
      communityObserver.disconnect();
    }

    communityObserver = new MutationObserver(() => {
      if (!isBlockingEnabled()) {
        return;
      }
      triggerRefresh();
    });

    communityObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  };

  function runFilters(): void {
    if (!isBlockingEnabled()) {
      return;
    }

    ensureCommunityObserverAttached();

    const displays: string[] = [];
    const snapshots: string[] = [];

    const recentSnapshot = applyFilterForRoot(sidebarShadowRoot, "recent", displays);
    if (recentSnapshot) {
      snapshots.push(`recent:${recentSnapshot}`);
    }

    const communitySnapshot = applyFilterForRoot(communityShadowRoot, "community", displays);
    if (communitySnapshot) {
      snapshots.push(`community:${communitySnapshot}`);
    }

    pendingSidebarRefresh = false;

    const combinedSnapshot = snapshots.join("||");
    if (!combinedSnapshot || combinedSnapshot === lastSnapshot) {
      return;
    }

    lastSnapshot = combinedSnapshot;

    if (isDebugEnabled()) {
      debugLog(
        `Sidebar (${location.pathname}): ${displays.length} items. Snapshot: ${displays.join(
          " | ",
        )}`,
      );
    }
  }

  const attachSidebarObserver = (root: ShadowRoot): void => {
    if (sidebarObserver) {
      sidebarObserver.disconnect();
    }

    sidebarObserver = new MutationObserver(() => {
      if (!isBlockingEnabled()) {
        return;
      }
      triggerRefresh();
    });

    sidebarObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  };

  const observeSidebarDOM = (): void => {
    if (!isBlockingEnabled()) {
      return;
    }

    const sidebarElement = document.querySelector(shadowSelectors.sidebarHost);
    if (!sidebarElement) {
      if (isDebugEnabled()) {
        debugLog("Sidebar element not found");
      }
      return;
    }

    if (!sidebarElement.shadowRoot) {
      const checkInterval = window.setInterval(() => {
        if (sidebarElement.shadowRoot) {
          window.clearInterval(checkInterval);
          sidebarShadowRoot = sidebarElement.shadowRoot;
          if (sidebarShadowRoot) {
            attachSidebarObserver(sidebarShadowRoot);
            ensureCommunityObserverAttached();
            runFilters();
          }
        }
      }, 50);
      return;
    }

    sidebarShadowRoot = sidebarElement.shadowRoot;
    if (sidebarShadowRoot) {
      attachSidebarObserver(sidebarShadowRoot);
    }
    ensureCommunityObserverAttached();
    runFilters();
  };

  const resetState = (): void => {
    lastSnapshot = "";
    pendingSidebarRefresh = false;
    runFilters();
  };

  return {
    triggerRefresh,
    observeSidebarDOM,
    resetState,
  };
}
