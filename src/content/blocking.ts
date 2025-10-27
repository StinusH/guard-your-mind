import type { BlockingStyle } from "../shared/settings";
import { CONFIG, SELECTORS } from "./config";
import { isMaturePost, isMatureSearchResult, isMatureSubreddit } from "./detection";
import {
  createPlaceholder,
  createQuotePlaceholder,
  blurElement,
  clearBlurredElements,
} from "./placeholders";
import { registerBlockedElement, restoreBlockedElements } from "./blockedElements";
import { getBlockingStyle, isBlockingEnabled } from "./state";

export type PlaceholderFactory = (original: Element, style: BlockingStyle) => Element;

export const applyBlockingToElement = (element: Element, factory?: PlaceholderFactory): void => {
  const style = getBlockingStyle();

  switch (style) {
    case "remove": {
      registerBlockedElement(element, style, null);
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
      registerBlockedElement(element, style, placeholder);
      element.replaceWith(placeholder);
      break;
    }
    case "placeholder":
    default: {
      const placeholder = factory ? factory(element, style) : createPlaceholder(element);
      placeholder.classList.add(CONFIG.blankedClass);
      registerBlockedElement(element, style, placeholder);
      element.replaceWith(placeholder);
      break;
    }
  }
};

export const blankElement = (element: Element): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  if (element.classList.contains(CONFIG.blankedClass)) {
    return;
  }

  applyBlockingToElement(element);
};

export const blankSubreddit = (): void => {
  const selectorsToBlank = [
    ...SELECTORS.containers.shell,
    ...SELECTORS.containers.feed,
    ...SELECTORS.containers.subredditHeader,
  ];

  selectorsToBlank.forEach((selector) => {
    const container = document.querySelector(selector);
    if (container) {
      blankElement(container);
    }
  });
};

export const blankMaturePosts = (): void => {
  SELECTORS.containers.posts.forEach((selector) => {
    const posts = document.querySelectorAll(selector);
    posts.forEach((post) => {
      if (isMaturePost(post) && !post.classList.contains(CONFIG.blankedClass)) {
        blankElement(post);
      }
    });
  });
};

export const filterSearchResults = (): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  SELECTORS.containers.searchResults.forEach((selector) => {
    const results = document.querySelectorAll(selector);

    results.forEach((result) => {
      if (isMatureSearchResult(result) && !result.classList.contains(CONFIG.blankedClass)) {
        result.classList.add(CONFIG.blankedClass);
        applyBlockingToElement(result);
      }
    });
  });
};

export const processPage = (): void => {
  if (!isBlockingEnabled()) {
    return;
  }

  filterSearchResults();

  if (isMatureSubreddit()) {
    blankSubreddit();
  } else {
    blankMaturePosts();
  }
};

export const clearBlurredContent = (): void => {
  clearBlurredElements();
};

export { restoreBlockedElements };

export const createSearchPlaceholder = (): HTMLDivElement => {
  const placeholder = document.createElement("div");
  placeholder.className = CONFIG.placeholderClass;
  placeholder.style.cssText = `
    padding: 12px 16px;
    margin: 4px 0;
    background: #f6f7f8;
    border: 1px solid #edeff1;
    border-radius: 6px;
    color: #7c7c7c;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  placeholder.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 2px;">Guard Your Mind</div>
    <div>Blocked NSFW search suggestion</div>
  `;
  return placeholder;
};

export const createRecentSearchPlaceholder = (): HTMLElement => {
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
};

export const createSidebarPlaceholder = (subreddit: string): HTMLDivElement => {
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
};
