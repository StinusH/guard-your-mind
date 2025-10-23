/**
 * Guard Your Mind - Content Script
 * Detects and blanks mature (18+) content on Reddit
 */

// Configuration
// TODO: Future enhancement - load these from user settings in chrome.storage
const CONFIG = {
  debugMode: false, // Set to true for debugging
  blankedClass: "gym-blanked",
  placeholderClass: "gym-placeholder",
  // Future: Add blockingStyle: 'placeholder' | 'remove' | 'quotes' | 'blur'
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
      tags: '[data-testid="post-nsfw-tag"], .nsfw-tag, ._3VgTjAJVNNV7jzlnwY-OFY',
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
    sidebarRecentItem: "li[role='presentation'] a[href^='/r/']",
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

/**
 * Detects if current page is a mature subreddit
 * Also tracks blocked subreddits for sidebar filtering
 */
function isMatureSubreddit(): boolean {
  // Check for over18 attribute on body
  const body = document.body;
  if (body?.dataset.over18 === "true" || body?.dataset.isOver18 === "true") {
    trackCurrentSubreddit();
    return true;
  }

  // Check shreddit-app element (new Reddit)
  const shredditApp = document.querySelector(SELECTORS.mature.subreddit.app);
  if (
    shredditApp?.getAttribute("over18") === "true" ||
    shredditApp?.getAttribute("routeisnsfw") === "true"
  ) {
    trackCurrentSubreddit();
    return true;
  }

  // Check for NSFW indicator in subreddit header
  if (document.querySelector(SELECTORS.mature.subreddit.badges)) {
    trackCurrentSubreddit();
    return true;
  }

  // Check page title
  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes("nsfw") || pageTitle.includes("18+")) {
    trackCurrentSubreddit();
    return true;
  }

  return false;
}

/**
 * Tracks the current subreddit as blocked if we're on a subreddit page
 */
function trackCurrentSubreddit(): void {
  const match = location.pathname.match(/^\/r\/([^/]+)/);
  if (match) {
    const subreddit = match[1].toLowerCase();
    blockedSubreddits.add(subreddit);
    log(`Tracked blocked subreddit: ${subreddit}`);
  }
}

/**
 * Detects if a specific post element is mature content
 */
function isMaturePost(element: Element): boolean {
  // Check for NSFW tag/flair
  if (element.querySelector(SELECTORS.mature.post.tags)) {
    return true;
  }

  // Check for blur overlay (Reddit's native NSFW blur)
  if (element.querySelector(SELECTORS.mature.post.blur)) {
    return true;
  }

  // Check data attributes on the post element itself
  if (
    element.getAttribute("data-nsfw") === "true" ||
    element.getAttribute("data-over18") === "true"
  ) {
    return true;
  }

  // Check for NSFW in post title or flair text
  const postText =
    element.querySelector(SELECTORS.mature.post.title)?.textContent ||
    element.querySelector("h3")?.textContent ||
    "";
  if (postText.toLowerCase().includes("nsfw")) {
    return true;
  }

  // Check aria-label or other accessibility attributes
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
  if (ariaLabel.includes("nsfw") || ariaLabel.includes("18+")) {
    return true;
  }

  return false;
}

/**
 * Detects if a search result or subreddit suggestion is mature
 * Used for filtering individual search results outside of Shadow DOM
 */
function isMatureSearchResult(element: Element): boolean {
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
  if (trackingContext && trackingContext.includes('"nsfw":true')) {
    return true;
  }

  // Check for NSFW badge/flair in search result
  const nsfwBadge = element.querySelector(SELECTORS.mature.search.badges);
  if (nsfwBadge) {
    const badgeText = nsfwBadge.textContent?.toLowerCase() || "";
    if (badgeText.includes("nsfw") || badgeText.includes("18+")) {
      return true;
    }
  }

  // Check data attributes
  if (
    element.getAttribute("data-nsfw") === "true" ||
    element.getAttribute("data-over18") === "true" ||
    element.getAttribute("nsfw") === "true"
  ) {
    return true;
  }

  return false;
}

/**
 * Creates a placeholder element to replace blanked content
 * Matches the original element's dimensions and applies consistent styling
 *
 * TODO: Future enhancement - support multiple blocking styles:
 * - 'placeholder' (current): Gray box with "Content Blocked" message
 * - 'remove': Completely remove the element
 * - 'quotes': Show inspirational quotes instead
 * - 'blur': Blur the content with overlay
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

/**
 * Blanks a single element by replacing it with a placeholder
 * Prevents double-processing by checking for the blanked class
 */
function blankElement(element: Element): void {
  // Avoid blanking the same element multiple times
  if (element.classList.contains(CONFIG.blankedClass)) {
    return;
  }

  const placeholder = createPlaceholder(element);
  placeholder.classList.add(CONFIG.blankedClass);
  element.replaceWith(placeholder);
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
  SELECTORS.containers.searchResults.forEach((selector) => {
    const results = document.querySelectorAll(selector);

    results.forEach((result) => {
      if (isMatureSearchResult(result) && !result.classList.contains(CONFIG.blankedClass)) {
        // Mark as blanked to avoid processing multiple times
        result.classList.add(CONFIG.blankedClass);
        // Remove entirely from DOM
        result.remove();
      }
    });
  });
}

/**
 * Main processing function
 */
function processPage(): void {
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
    return trackingContext.includes('"nsfw":true');
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
  const recentSearchItems = shadowRoot.querySelectorAll(SELECTORS.shadowDOM.recentSearchItem);

  recentSearchItems.forEach((item) => {
    if (isNSFWRecentSearch(item) && !item.classList.contains(CONFIG.blankedClass)) {
      item.classList.add(CONFIG.blankedClass);
      const placeholder = createRecentSearchPlaceholder();
      item.replaceWith(placeholder);
    }
  });
}

/**
 * Replaces NSFW section with placeholder in Shadow DOM
 * Called by the Shadow DOM MutationObserver when changes are detected
 */
function replaceNSFWSection(shadowRoot: ShadowRoot): void {
  // Handle the 18+ expandable section
  const nsfwSection = shadowRoot.querySelector(SELECTORS.shadowDOM.nsfwSection);
  if (nsfwSection && !nsfwSection.classList.contains(CONFIG.blankedClass)) {
    nsfwSection.classList.add(CONFIG.blankedClass);
    const placeholder = createSearchPlaceholder();
    nsfwSection.replaceWith(placeholder);
  }

  // Also filter NSFW items from recent searches
  filterRecentSearches(shadowRoot);
}

/**
 * Sets up the Shadow DOM MutationObserver
 * Separated helper to avoid code duplication
 */
function setupShadowObserver(shadowRoot: ShadowRoot): void {
  // Check if NSFW section already exists and replace it
  replaceNSFWSection(shadowRoot);

  // Set up observer for future changes
  const shadowObserver = new MutationObserver(() => {
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
 * Filters NSFW subreddits from sidebar recent pages
 */
function filterSidebarRecentPages(shadowRoot: ShadowRoot): void {
  const recentLinks = shadowRoot.querySelectorAll(SELECTORS.shadowDOM.sidebarRecentItem);

  recentLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const match = href.match(/^\/r\/([^/]+)/);
    if (match) {
      const subreddit = match[1].toLowerCase();
      if (blockedSubreddits.has(subreddit)) {
        const listItem = link.closest("li");
        if (listItem && !listItem.classList.contains(CONFIG.blankedClass)) {
          listItem.classList.add(CONFIG.blankedClass);
          listItem.remove();
          log(`Removed ${subreddit} from sidebar recent pages`);
        }
      }
    }
  });
}

/**
 * Sets up observer for sidebar Shadow DOM
 */
function observeSidebarDOM(): void {
  const sidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);
  if (!sidebarElement || !sidebarElement.shadowRoot) {
    return;
  }

  // Filter existing items
  filterSidebarRecentPages(sidebarElement.shadowRoot);

  // Watch for changes
  const sidebarObserver = new MutationObserver(() => {
    if (sidebarElement.shadowRoot) {
      filterSidebarRecentPages(sidebarElement.shadowRoot);
    }
  });

  sidebarObserver.observe(sidebarElement.shadowRoot, {
    childList: true,
    subtree: true,
  });

  log("Sidebar Shadow DOM observer initialized");
}

/**
 * Watches for reddit-search-large element to appear and sets up Shadow DOM observer
 * Handles both immediate and delayed appearance of the search element
 */
function setupShadowDOMWatcher(): void {
  // Check if search element already exists
  const existingSearchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (existingSearchElement) {
    injectHidingCSS();
    observeShadowDOM();
  }

  // Check if sidebar element already exists
  const existingSidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);
  if (existingSidebarElement) {
    observeSidebarDOM();
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
    const searchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
    const sidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);

    if (searchElement && !existingSearchElement) {
      injectHidingCSS();
      observeShadowDOM();
    }

    if (sidebarElement && !existingSidebarElement) {
      observeSidebarDOM();
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
      log("URL changed, re-initializing Shadow DOM watcher");
      // Re-setup Shadow DOM watcher after navigation
      setupShadowDOMWatcher();
      processPage();
    }
  }).observe(document, {
    subtree: true,
    childList: true,
  });
}

// Start the extension (only in content script context)
if (typeof document !== "undefined") {
  init();
}
