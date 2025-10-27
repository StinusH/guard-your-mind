import { CONFIG, SELECTORS } from "./config";
import {
  applyBlockingToElement,
  createRecentSearchPlaceholder,
  createSearchPlaceholder,
} from "./blocking";
import { isBlockingEnabled, shouldBlock18Plus } from "./state";
import type { SidebarFilterController } from "./sidebarFilter";

const injectHidingCSS = (): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  const searchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (searchElement && searchElement.shadowRoot) {
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
};

const isNSFWRecentSearch = (element: Element): boolean => {
  const trackingContext = element.getAttribute("data-faceplate-tracking-context");
  if (!trackingContext) {
    return false;
  }

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
};

const filterRecentSearches = (shadowRoot: ShadowRoot): void => {
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
};

const replaceNSFWSection = (shadowRoot: ShadowRoot): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  const nsfwSection = shadowRoot.querySelector(SELECTORS.shadowDOM.nsfwSection);
  if (nsfwSection && !nsfwSection.classList.contains(CONFIG.blankedClass)) {
    nsfwSection.classList.add(CONFIG.blankedClass);
    applyBlockingToElement(nsfwSection, () => createSearchPlaceholder());
  }

  filterRecentSearches(shadowRoot);
};

const setupShadowObserver = (shadowRoot: ShadowRoot): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  replaceNSFWSection(shadowRoot);

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
};

const observeShadowDOM = (): void => {
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
    const checkInterval = window.setInterval(() => {
      if (searchElement.shadowRoot) {
        window.clearInterval(checkInterval);
        setupShadowObserver(searchElement.shadowRoot);
      }
    }, 50);
  }
};

export const setupShadowDOMWatcher = (sidebarFilter: SidebarFilterController): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  const existingSearchElement = document.querySelector(SELECTORS.shadowDOM.searchHost);
  if (existingSearchElement) {
    injectHidingCSS();
    observeShadowDOM();
  }

  const existingSidebarElement = document.querySelector(SELECTORS.shadowDOM.sidebarHost);
  if (existingSidebarElement) {
    sidebarFilter.observeSidebarDOM();
  }

  if (existingSearchElement && existingSidebarElement) {
    return;
  }

  if (!document.body) {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        setupShadowDOMWatcher(sidebarFilter);
      }
    });
    bodyObserver.observe(document.documentElement, {
      childList: true,
    });
    return;
  }

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

    if (searchElement && sidebarElement) {
      mainObserver.disconnect();
    }
  });

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};
