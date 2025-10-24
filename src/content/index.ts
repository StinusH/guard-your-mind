import type { BlockingStyle, ExtensionSettings } from "../shared/settings";
import {
  DEFAULT_SETTINGS,
  getBlockedSubreddits,
  getSettings,
  setBlockedSubreddits,
  subscribeToSettings,
} from "../shared/settings";
import { createSidebarFilter } from "./sidebarFilter";
/**
 * Guard Your Mind - Content Script
 * Detects and blanks mature (18+) content on Reddit
 */

// Configuration
const CONFIG = {
  debugMode: false, // Toggle manually when deep debugging is required
  blankedClass: "gym-blanked",
  placeholderClass: "gym-placeholder",
  blurredClass: "gym-blurred",
};

let extensionSettings: ExtensionSettings = DEFAULT_SETTINGS;
let observersInitialized = false;

const isBlockingEnabled = (): boolean => extensionSettings.blockingEnabled;
const getBlockingStyle = (): BlockingStyle => extensionSettings.blockingStyle ?? "placeholder";
const shouldBlock18Plus = (): boolean => extensionSettings.block18PlusContent !== false;

type ShadowHost = Element & { shadowRoot?: ShadowRoot | null };

const querySelectorWithin = (element: Element, selector: string): Element | null => {
  const direct = element.querySelector(selector);
  if (direct) {
    return direct;
  }
  const host = element as ShadowHost;
  return host.shadowRoot?.querySelector(selector) ?? null;
};

const querySelectorAllWithin = (element: Element, selector: string): Element[] => {
  const matches = Array.from(element.querySelectorAll(selector));
  const host = element as ShadowHost;
  if (host.shadowRoot) {
    matches.push(...host.shadowRoot.querySelectorAll(selector));
  }
  return matches;
};

const hasTruthyAttribute = (element: Element, attributeName: string): boolean => {
  if (!element.hasAttribute(attributeName)) {
    return false;
  }

  const value = element.getAttribute(attributeName);
  if (value === null) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "true" || normalized === attributeName.toLowerCase();
};
const ensureInitialized = (): void => {
  if (observersInitialized || !isBlockingEnabled()) {
    return;
  }

  init();
  observersInitialized = true;
};

// CSS Selectors for different Reddit UI elements
const SELECTORS = {
  // Mature content detection selectors
  mature: {
    // Subreddit-level indicators
    subreddit: {
      badges: '[data-testid="nsfw-badge"], .nsfw-badge, ._1poyrkZ7g36PawDueRza-J',
      app: "shreddit-app",
    },
    // Post-level indicators
    post: {
      tags: '[data-testid="post-nsfw-tag"], .nsfw-tag, ._3VgTjAJVNNV7jzlnwY-OFY, faceplate-tag[icon*="nsfw"], faceplate-badge[icon*="nsfw"], faceplate-pill[icon*="nsfw"], faceplate-tag[icon*="18"], faceplate-badge[icon*="18"], faceplate-pill[icon*="18"]',
      blur: '[data-blur-nsfw], .blur, ._1TrMDpkvzUBleMF5LjV_gS, [style*="blur"]',
      title: '[data-testid="post-title"]',
    },
    // Search result indicators
    search: {
      icon: '[data-testid="nsfw-subreddit-icon"]',
      warnings: '[data-testid="search-warnings"]',
      badges: '[data-testid="nsfw-badge"], .nsfw-badge, faceplate-pill, faceplate-badge',
    },
  },

  // Content container selectors
  containers: {
    // Subreddit feed containers
    feed: [
      "shreddit-feed",
      '[data-testid="subreddit-feed"]',
      "#siteTable", // Old Reddit
      ".Post",
      "shreddit-post",
    ],
    // Individual post selectors
    posts: [
      "shreddit-post",
      '[data-testid="post-container"]',
      ".Post",
      ".thing[data-subreddit]", // Old Reddit
      "article[data-testid]",
    ],
    // Search result selectors
    searchResults: [
      '[data-testid="search-sdui-typeahead-suggestion"]',
      "shreddit-search-result",
      '[data-testid="search-result"]',
      '[data-testid="community-result"]',
      "faceplate-typeahead-result",
      '[data-testid="typeahead-result"]',
      ".search-result", // Old Reddit
      ".search-subreddit-link-wrapper", // Old Reddit
    ],
  },

  // Shadow DOM selectors
  shadowDOM: {
    searchHost: "reddit-search-large",
    sidebarHost: "reddit-recent-pages",
    nsfwSection: "faceplate-expandable-section-helper#nsfw_typeahead_section",
    recentSearchItem: "faceplate-tracker[data-faceplate-tracking-context]",
    sidebarRecentItem: "li[role='presentation']",
    sidebarRecentLink: "a[href*='/r/']",
    cssId: "gym-hide-nsfw-search",
  },
};

// Track blocked subreddits (in-memory only, resets on page reload)
const blockedSubreddits = new Set<string>();

// Logging utility
function log(...args: unknown[]): void {
  if (CONFIG.debugMode) {
    console.log("[Guard Your Mind]", ...args);
  }
}

let persistBlockedSubredditsTimeout: number | null = null;
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
    },
  },
  blockedSubreddits,
  isBlockingEnabled,
  extractSubredditFromHref,
  createSidebarPlaceholder,
  isDebugEnabled: () => CONFIG.debugMode,
  log,
});

void getBlockedSubreddits()
  .then((storedSubreddits) => {
    if (!storedSubreddits.length) {
      return;
    }

    storedSubreddits.forEach((subreddit) => blockedSubreddits.add(subreddit));
    sidebarFilter.resetState();
    sidebarFilter.triggerRefresh();
  })
  .catch((error) => {
    console.error("Guard Your Mind failed to load blocked subreddits", error);
  });

function extractSubredditFromHref(href: string): string | null {
  const match = href.match(/\/r\/([^/?#]+)/i);
  if (!match) {
    return null;
  }

  const raw = match[1];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Detects if current page is a mature subreddit
 * Also tracks blocked subreddits for sidebar filtering
 */
function isMatureSubreddit(): boolean {
  const block18Plus = shouldBlock18Plus();

  // Check for over18 attribute on body
  const body = document.body;
  if (block18Plus && (body?.dataset.over18 === "true" || body?.dataset.isOver18 === "true")) {
    trackCurrentSubreddit("body dataset flag");
    return true;
  }

  // Check shreddit-app element (new Reddit)
  const shredditApp = document.querySelector(SELECTORS.mature.subreddit.app);
  const appRouteIsNSFW = shredditApp?.getAttribute("routeisnsfw") === "true";
  if (appRouteIsNSFW) {
    trackCurrentSubreddit("shreddit-app attributes");
    return true;
  }
  if (block18Plus && shredditApp?.getAttribute("over18") === "true") {
    trackCurrentSubreddit("shreddit-app attributes");
    return true;
  }

  // Check for NSFW indicator in subreddit header
  const badgeElement = document.querySelector(SELECTORS.mature.subreddit.badges);
  if (badgeElement) {
    const badgeIcon = (badgeElement as HTMLElement).getAttribute("icon")?.toLowerCase() ?? "";
    const badgeText = badgeElement.textContent?.toLowerCase() ?? "";
    const isNSFWBadge = badgeIcon.includes("nsfw") || badgeText.includes("nsfw");
    const is18Badge = badgeIcon.includes("18") || badgeText.includes("18+");

    if (isNSFWBadge || (block18Plus && is18Badge)) {
      trackCurrentSubreddit("subreddit header badge");
      return true;
    }
  }

  // Check page title
  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes("nsfw")) {
    trackCurrentSubreddit("page title hint");
    return true;
  }
  if (block18Plus && pageTitle.includes("18+")) {
    trackCurrentSubreddit("page title hint");
    return true;
  }

  return false;
}

/**
 * Tracks the current subreddit as blocked if we're on a subreddit page
 * Triggers sidebar filtering to block it from recent pages
 */
function trackCurrentSubreddit(reason: string): void {
  const match = location.pathname.match(/^\/r\/([^/]+)/);
  if (match) {
    const subreddit = match[1].toLowerCase();
    const wasNew = !blockedSubreddits.has(subreddit);
    blockedSubreddits.add(subreddit);

    if (wasNew) {
      log(
        `Tracked new blocked subreddit "${subreddit}" via ${reason}. Full blocked set: ${Array.from(blockedSubreddits).join(", ")}`,
      );
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
      schedulePersistBlockedSubreddits();
    } else {
      log(`Subreddit "${subreddit}" already tracked (triggered by ${reason}).`);
      sidebarFilter.triggerRefresh();
    }
  } else {
    log(
      `trackCurrentSubreddit invoked via ${reason} but no subreddit matched in location.pathname "${location.pathname}"`,
    );
  }
}

/**
 * Detects if a specific post element is mature content
 */
function isMaturePost(element: Element): boolean {
  const block18Plus = shouldBlock18Plus();

  const badgeElements = querySelectorAllWithin(element, SELECTORS.mature.post.tags);
  for (const badge of badgeElements) {
    const icon = (badge as HTMLElement).getAttribute("icon")?.toLowerCase() ?? "";
    const badgeText = badge.textContent?.toLowerCase() ?? "";

    if (icon.includes("nsfw") || badgeText.includes("nsfw")) {
      return true;
    }

    if (block18Plus && (icon.includes("18") || badgeText.includes("18+"))) {
      return true;
    }
  }

  // Check for blur overlay (Reddit's native NSFW blur)
  if (querySelectorWithin(element, SELECTORS.mature.post.blur)) {
    return true;
  }

  // Explicit NSFW attributes
  if (hasTruthyAttribute(element, "data-nsfw") || hasTruthyAttribute(element, "nsfw")) {
    return true;
  }

  const shredditPostHost = element.closest("shreddit-post");

  // 18+ attributes guarded by the user preference
  if (block18Plus) {
    if (hasTruthyAttribute(element, "data-over18") || hasTruthyAttribute(element, "over18")) {
      return true;
    }

    if (
      shredditPostHost &&
      (hasTruthyAttribute(shredditPostHost, "over18") ||
        hasTruthyAttribute(shredditPostHost, "data-over18"))
    ) {
      return true;
    }

    if (shredditPostHost && hasTruthyAttribute(shredditPostHost, "nsfw")) {
      return true;
    }

    if (querySelectorWithin(element, '[data-over18="true"], [over18="true"]')) {
      return true;
    }
  } else if (shredditPostHost && hasTruthyAttribute(shredditPostHost, "nsfw")) {
    return true;
  }

  // Check for NSFW in post title or flair text
  const postText =
    querySelectorWithin(element, SELECTORS.mature.post.title)?.textContent ||
    querySelectorWithin(element, "h3")?.textContent ||
    "";
  const postTextLower = postText.toLowerCase();
  if (postTextLower.includes("nsfw")) {
    return true;
  }
  if (block18Plus && postTextLower.includes("18+")) {
    return true;
  }

  // Check aria-label or other accessibility attributes
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
  if (ariaLabel.includes("nsfw")) {
    return true;
  }
  if (block18Plus && ariaLabel.includes("18+")) {
    return true;
  }

  return false;
}

/**
 * Detects if a search result or subreddit suggestion is mature
 * Used for filtering individual search results outside of Shadow DOM
 */
function isMatureSearchResult(element: Element): boolean {
  const block18Plus = shouldBlock18Plus();

  // Check for NSFW subreddit icon in autocomplete
  if (element.querySelector(SELECTORS.mature.search.icon)) {
    return true;
  }

  // Check for search warnings (contains NSFW badge)
  if (element.querySelector(SELECTORS.mature.search.warnings)) {
    return true;
  }

  // Check the tracking context data for nsfw:true
  const trackingContext = element.getAttribute("data-faceplate-tracking-context");
  if (trackingContext) {
    if (trackingContext.includes('"nsfw":true')) {
      return true;
    }
    if (
      block18Plus &&
      (trackingContext.includes('"over18":true') ||
        trackingContext.includes('"over_18":true') ||
        trackingContext.includes('"isOver18":true'))
    ) {
      return true;
    }
  }

  // Check for NSFW badge/flair in search result
  const nsfwBadge = element.querySelector(SELECTORS.mature.search.badges);
  if (nsfwBadge) {
    const badgeElement = nsfwBadge as HTMLElement;
    const badgeText = badgeElement.textContent?.toLowerCase() || "";
    const badgeIcon = badgeElement.getAttribute("icon")?.toLowerCase() || "";
    if (badgeText.includes("nsfw") || badgeIcon.includes("nsfw")) {
      return true;
    }
    if (block18Plus && (badgeText.includes("18+") || badgeIcon.includes("18"))) {
      return true;
    }
  }

  // Check data attributes
  if (element.getAttribute("data-nsfw") === "true" || element.getAttribute("nsfw") === "true") {
    return true;
  }

  if (block18Plus) {
    if (
      hasTruthyAttribute(element, "data-over18") ||
      hasTruthyAttribute(element, "over18") ||
      hasTruthyAttribute(element, "nsfw")
    ) {
      return true;
    }

    const shredditPost = element.closest("shreddit-post");
    if (
      shredditPost &&
      (hasTruthyAttribute(shredditPost, "over18") ||
        hasTruthyAttribute(shredditPost, "nsfw") ||
        hasTruthyAttribute(shredditPost, "data-over18"))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a placeholder element to replace blanked content
 * Matches the original element's dimensions and applies consistent styling
 */
function createPlaceholder(originalElement: Element): HTMLDivElement {
  const placeholder = document.createElement("div");
  placeholder.className = CONFIG.placeholderClass;

  // Match the original element's dimensions
  const rect = originalElement.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(originalElement);

  placeholder.style.cssText = `
    min-height: ${rect.height > 0 ? rect.height : 200}px;
    background: #f6f7f8;
    border: 1px solid #edeff1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: ${computedStyle.margin};
    padding: ${computedStyle.padding};
    color: #7c7c7c;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  placeholder.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-weight: 500; margin-bottom: 4px;">Content Blocked</div>
      <div style="font-size: 12px; opacity: 0.7;">Blocked by Guard Your Mind</div>
    </div>
  `;

  return placeholder;
}

const QUOTES = [
  "Small habits today shape who you become tomorrow.",
  "You get stronger every time you choose what uplifts you.",
  "Guard your focus and your focus will guard your goals.",
  "Discipline is doing what matters even when it’s hard.",
  "Feed the mind with purpose, not distraction.",
];

let quoteIndex = 0;

const getNextQuote = (): string => {
  const quote = QUOTES[quoteIndex % QUOTES.length];
  quoteIndex += 1;
  return quote;
};

function createQuotePlaceholder(originalElement: Element): HTMLDivElement {
  const placeholder = createPlaceholder(originalElement);
  placeholder.innerHTML = `
    <div style="text-align: center; padding: 20px; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-weight: 500; font-size: 13px; opacity: 0.8;">Guard Your Mind</div>
      <div style="font-size: 14px; line-height: 1.4;">“${getNextQuote()}”</div>
    </div>
  `;
  return placeholder;
}

let blurStylesInjected = false;

function ensureBlurStylesInjected(): void {
  if (blurStylesInjected) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .${CONFIG.blurredClass} {
      position: relative !important;
      filter: blur(6px) saturate(0.4);
      border-radius: inherit;
      overflow: hidden;
    }

    .${CONFIG.blurredClass}::after {
      content: "Blurred by Guard Your Mind";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(17, 24, 39, 0.55);
      color: #f9fafb;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      padding: 16px;
      pointer-events: none;
    }
  `;

  const target = document.head ?? document.documentElement ?? document.body;
  if (target) {
    target.appendChild(style);
    blurStylesInjected = true;
  }
}

type PlaceholderFactory = (original: Element, style: BlockingStyle) => Element;

function blurElement(element: Element): void {
  ensureBlurStylesInjected();
  const target = element as HTMLElement;
  target.classList.add(CONFIG.blankedClass, CONFIG.blurredClass);
}

function clearBlurredElements(): void {
  document.querySelectorAll(`.${CONFIG.blurredClass}`).forEach((element) => {
    element.classList.remove(CONFIG.blurredClass);
    element.classList.remove(CONFIG.blankedClass);
  });
}

function applyBlockingToElement(element: Element, factory?: PlaceholderFactory): void {
  const style = getBlockingStyle();

  switch (style) {
    case "remove": {
      element.remove();
      break;
    }
    case "blur": {
      blurElement(element);
      break;
    }
    case "quotes": {
      const placeholder = factory ? factory(element, style) : createQuotePlaceholder(element);
      placeholder.classList.add(CONFIG.blankedClass);
      element.replaceWith(placeholder);
      break;
    }
    case "placeholder":
    default: {
      const placeholder = factory ? factory(element, style) : createPlaceholder(element);
      placeholder.classList.add(CONFIG.blankedClass);
      element.replaceWith(placeholder);
      break;
    }
  }
}

/**
 * Blanks a single element by replacing it with a placeholder
 * Prevents double-processing by checking for the blanked class
 */
function blankElement(element: Element): void {
  if (!isBlockingEnabled()) {
    return;
  }

  // Avoid blanking the same element multiple times
  if (element.classList.contains(CONFIG.blankedClass)) {
    return;
  }

  applyBlockingToElement(element);
}

/**
 * Blanks entire subreddit page content when navigating to a mature subreddit
 * Targets main content containers for both new and old Reddit
 */
function blankSubreddit(): void {
  SELECTORS.containers.feed.forEach((selector) => {
    const container = document.querySelector(selector);
    if (container) {
      blankElement(container);
    }
  });
}

/**
 * Finds and blanks individual mature posts in feeds
 */
function blankMaturePosts(): void {
  SELECTORS.containers.posts.forEach((selector) => {
    const posts = document.querySelectorAll(selector);
    posts.forEach((post) => {
      if (isMaturePost(post) && !post.classList.contains(CONFIG.blankedClass)) {
        blankElement(post);
      }
    });
  });
}

/**
 * Filters mature content from search results in the main document
 * Note: The NSFW section in the search dropdown is handled separately via Shadow DOM
 */
function filterSearchResults(): void {
  if (!isBlockingEnabled()) {
    return;
  }

  SELECTORS.containers.searchResults.forEach((selector) => {
    const results = document.querySelectorAll(selector);

    results.forEach((result) => {
      if (isMatureSearchResult(result) && !result.classList.contains(CONFIG.blankedClass)) {
        // Mark as blanked to avoid processing multiple times
        result.classList.add(CONFIG.blankedClass);
        applyBlockingToElement(result);
      }
    });
  });
}

/**
 * Main processing function
 */
function processPage(): void {
  if (!isBlockingEnabled()) {
    return;
  }

  // Always filter search results first
  filterSearchResults();

  // Check if we're on a mature subreddit
  if (isMatureSubreddit()) {
    blankSubreddit();
  } else {
    // Blank individual mature posts in feeds
    blankMaturePosts();
  }
}

/**
 * Sets up MutationObserver to handle dynamic content changes
 * Watches for new posts and search results appearing in the DOM
 */
function setupObserver(): void {
  const observer = new MutationObserver((mutations) => {
    if (!isBlockingEnabled()) {
      return;
    }

    // Check if any mutations involve search results outside Shadow DOM
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

    // Debounce processing to avoid excessive calls during rapid DOM changes
    clearTimeout((window as unknown as { gymTimeout?: number }).gymTimeout);
    (window as unknown as { gymTimeout?: number }).gymTimeout = window.setTimeout(() => {
      processPage();
    }, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Injects CSS into Shadow DOM to hide NSFW search section
 * This ensures the section never flashes on screen before JS can replace it
 */
function injectHidingCSS(): void {
  if (!isBlockingEnabled()) {
    return;
  }

  const searchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (searchElement && searchElement.shadowRoot) {
    // Check if we already injected the CSS to avoid duplicates
    if (searchElement.shadowRoot.querySelector(`#${SELECTORS.shadowDOM.cssId}`)) {
      return;
    }

    const style = document.createElement("style");
    style.id = SELECTORS.shadowDOM.cssId;
    style.textContent = `
      ${SELECTORS.shadowDOM.nsfwSection} {
        display: none !important;
      }
    `;
    searchElement.shadowRoot.appendChild(style);
  }
}

/**
 * Creates a placeholder for the NSFW search section
 */
function createSearchPlaceholder(): HTMLDivElement {
  const placeholder = document.createElement("div");
  placeholder.className = CONFIG.placeholderClass;
  placeholder.style.cssText = `
    padding: 12px 16px;
    background: #f6f7f8;
    border-radius: 4px;
    margin: 8px 0;
    color: #7c7c7c;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center;
  `;
  placeholder.innerHTML = `
    <div style="font-weight: 500; font-size: 12px;">
      🔒 Mature content blocked
    </div>
  `;
  return placeholder;
}

/**
 * Checks if a recent search item in Shadow DOM is NSFW
 */
function isNSFWRecentSearch(element: Element): boolean {
  const trackingContext = element.getAttribute("data-faceplate-tracking-context");
  if (!trackingContext) {
    return false;
  }

  try {
    // The tracking context contains JSON with subreddit info
    // Look for "nsfw":true in the tracking context
    if (trackingContext.includes('"nsfw":true')) {
      return true;
    }

    if (shouldBlock18Plus()) {
      return (
        trackingContext.includes('"over18":true') ||
        trackingContext.includes('"over_18":true') ||
        trackingContext.includes('"isOver18":true')
      );
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Creates a compact placeholder for a single recent search item
 */
function createRecentSearchPlaceholder(): HTMLElement {
  const placeholder = document.createElement("div");
  placeholder.className = CONFIG.placeholderClass;
  placeholder.style.cssText = `
    padding: 8px 16px;
    background: #f6f7f8;
    border-radius: 4px;
    margin: 2px 0;
    color: #7c7c7c;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center;
  `;
  placeholder.innerHTML = `
    <div style="font-weight: 500;">
      🔒 Blocked recent search
    </div>
  `;
  return placeholder;
}

/**
 * Filters NSFW recent search items in Shadow DOM
 * Replaces them with placeholders instead of removing
 */
function filterRecentSearches(shadowRoot: ShadowRoot): void {
  if (!isBlockingEnabled()) {
    return;
  }

  const recentSearchItems = shadowRoot.querySelectorAll(SELECTORS.shadowDOM.recentSearchItem);

  recentSearchItems.forEach((item) => {
    if (isNSFWRecentSearch(item) && !item.classList.contains(CONFIG.blankedClass)) {
      item.classList.add(CONFIG.blankedClass);
      applyBlockingToElement(item, () => createRecentSearchPlaceholder());
    }
  });
}

/**
 * Replaces NSFW section with placeholder in Shadow DOM
 * Called by the Shadow DOM MutationObserver when changes are detected
 */
function replaceNSFWSection(shadowRoot: ShadowRoot): void {
  if (!isBlockingEnabled()) {
    return;
  }

  // Handle the 18+ expandable section
  const nsfwSection = shadowRoot.querySelector(SELECTORS.shadowDOM.nsfwSection);
  if (nsfwSection && !nsfwSection.classList.contains(CONFIG.blankedClass)) {
    nsfwSection.classList.add(CONFIG.blankedClass);
    // For the NSFW section, respect user's blocking style
    applyBlockingToElement(nsfwSection, () => createSearchPlaceholder());
  }

  // Also filter NSFW items from recent searches
  filterRecentSearches(shadowRoot);
}

/**
 * Sets up the Shadow DOM MutationObserver
 * Separated helper to avoid code duplication
 */
function setupShadowObserver(shadowRoot: ShadowRoot): void {
  if (!isBlockingEnabled()) {
    return;
  }

  // Check if NSFW section already exists and replace it
  replaceNSFWSection(shadowRoot);

  // Set up observer for future changes
  const shadowObserver = new MutationObserver(() => {
    if (!isBlockingEnabled()) {
      return;
    }

    replaceNSFWSection(shadowRoot);
  });

  shadowObserver.observe(shadowRoot, {
    childList: true,
    subtree: true,
  });
}

/**
 * Observes Shadow DOM for NSFW search section
 * Waits for shadowRoot to be ready if not yet available
 */
function observeShadowDOM(): void {
  if (!isBlockingEnabled()) {
    return;
  }

  const searchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (!searchElement) {
    return;
  }

  if (searchElement.shadowRoot) {
    setupShadowObserver(searchElement.shadowRoot);
  } else {
    // Wait for shadowRoot to be created (typically happens shortly after element appears)
    const checkInterval = setInterval(() => {
      if (searchElement.shadowRoot) {
        clearInterval(checkInterval);
        setupShadowObserver(searchElement.shadowRoot);
      }
    }, 50);
  }
}

/**
 * Creates a compact placeholder for blocked sidebar items
 */
function createSidebarPlaceholder(subreddit: string): HTMLDivElement {
  const placeholder = document.createElement("div");
  placeholder.className = `${CONFIG.placeholderClass}-content`;
  placeholder.setAttribute("data-placeholder-subreddit", subreddit.toLowerCase());
  placeholder.style.cssText = `
    width: 100%;
    padding: 8px 16px;
    background: #f6f7f8;
    border-radius: 4px;
    margin: 2px 0;
    color: #7c7c7c;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center;
    pointer-events: none;
    box-sizing: border-box;
  `;
  placeholder.innerHTML = `
    <div style="font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;">
      <span aria-hidden="true">🔒</span>
      <span>Blocked subreddit</span>
    </div>
  `;
  return placeholder;
}

/**
 * Watches for reddit-search-large element to appear and sets up Shadow DOM observer
 * Handles both immediate and delayed appearance of the search element
 */
function setupShadowDOMWatcher(): void {
  if (!isBlockingEnabled()) {
    return;
  }

  // Check if search element already exists
  const existingSearchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (existingSearchElement) {
    injectHidingCSS();
    observeShadowDOM();
  }

  // Check if sidebar element already exists
  const existingSidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);
  if (existingSidebarElement) {
    sidebarFilter.observeSidebarDOM();
  }

  // If both exist, we're done
  if (existingSearchElement && existingSidebarElement) {
    return;
  }

  // Make sure document.body exists before observing
  if (!document.body) {
    // Wait for body to exist
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        setupShadowDOMWatcher();
      }
    });
    bodyObserver.observe(document.documentElement, {
      childList: true,
    });
    return;
  }

  // Wait for Shadow DOM elements to appear
  const mainObserver = new MutationObserver(() => {
    if (!isBlockingEnabled()) {
      return;
    }

    const searchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
    const sidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);

    if (searchElement && !existingSearchElement) {
      injectHidingCSS();
      observeShadowDOM();
    }

    if (sidebarElement && !existingSidebarElement) {
      sidebarFilter.observeSidebarDOM();
    }

    // Disconnect if both are found
    if (searchElement && sidebarElement) {
      mainObserver.disconnect();
    }
  });

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Initialize the content script
 * Sets up all observers and processes the initial page load
 */
function init(): void {
  // Set up Shadow DOM watcher (handles CSS injection + MutationObserver for search dropdown)
  setupShadowDOMWatcher();

  // Wait for DOM to be ready before processing page content
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      processPage();
      setupObserver();
    });
  } else {
    processPage();
    setupObserver();
  }

  // Process again on full page load to catch any dynamically loaded content
  window.addEventListener("load", () => {
    processPage();
  });

  // Watch for SPA navigation (Reddit is a single-page app)
  // When URL changes, the search element might be recreated
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // Reset sidebar state on navigation to force re-processing
      sidebarFilter.resetState();
      // Re-setup Shadow DOM watcher after navigation
      setupShadowDOMWatcher();
      processPage();
    }
  }).observe(document, {
    subtree: true,
    childList: true,
  });

  window.addEventListener("beforeunload", () => {
    if (persistBlockedSubredditsTimeout !== null) {
      window.clearTimeout(persistBlockedSubredditsTimeout);
      persistBlockedSubredditsTimeout = null;
      void setBlockedSubreddits(Array.from(blockedSubreddits)).catch((error) => {
        console.error("Guard Your Mind failed to persist blocked subreddits before unload", error);
      });
    }
  });
}

const handleSettingsUpdate = (settings: ExtensionSettings): void => {
  const wasBlocking = extensionSettings.blockingEnabled;
  const previousStyle = extensionSettings.blockingStyle;
  const previousBlock18 = extensionSettings.block18PlusContent;
  extensionSettings = settings;

  const block18Changed = previousBlock18 !== settings.block18PlusContent;
  const shouldReprocess =
    (!wasBlocking || previousStyle !== settings.blockingStyle || block18Changed) &&
    observersInitialized;

  if (settings.blockingEnabled) {
    ensureInitialized();
    if (shouldReprocess) {
      processPage();
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
    } else if (block18Changed) {
      sidebarFilter.resetState();
      sidebarFilter.triggerRefresh();
    }
  } else if (wasBlocking) {
    log("Guard Your Mind blocking disabled via settings");
  }

  if (previousStyle === "blur" && settings.blockingStyle !== "blur") {
    clearBlurredElements();
  }

  if (!settings.blockingEnabled && previousStyle === "blur") {
    clearBlurredElements();
  }
};

// Start the extension (only in content script context)
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
