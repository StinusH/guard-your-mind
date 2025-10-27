const ORIGINAL_DISPLAY_DATA_KEY = "gymOriginalDisplay";

export type SidebarPlaceholderConfig = {
  blankedClass: string;
  placeholderClass: string;
};

export const hideSidebarLink = (link: HTMLAnchorElement): void => {
  if (!link.dataset[ORIGINAL_DISPLAY_DATA_KEY]) {
    link.dataset[ORIGINAL_DISPLAY_DATA_KEY] = link.style.display || "";
  }

  link.style.setProperty("display", "none", "important");
  link.setAttribute("aria-hidden", "true");
  link.setAttribute("tabindex", "-1");
};

export const showSidebarLink = (link: HTMLAnchorElement): void => {
  const originalDisplay = link.dataset[ORIGINAL_DISPLAY_DATA_KEY] ?? "";
  if (originalDisplay) {
    link.style.display = originalDisplay;
  } else {
    link.style.removeProperty("display");
  }
  link.removeAttribute("aria-hidden");
  link.removeAttribute("tabindex");
  delete link.dataset[ORIGINAL_DISPLAY_DATA_KEY];
};

export const applySidebarPlaceholderToItem = (
  listItem: HTMLElement,
  link: HTMLAnchorElement | null,
  subreddit: string,
  config: SidebarPlaceholderConfig,
  createSidebarPlaceholder: (subreddit: string) => HTMLElement,
): void => {
  const normalized = subreddit.toLowerCase();
  const existingSubreddit = listItem.getAttribute("data-blocked-subreddit");

  if (existingSubreddit === normalized && listItem.classList.contains(config.placeholderClass)) {
    if (link) {
      hideSidebarLink(link);
    }
    return;
  }

  listItem.classList.add(config.placeholderClass, config.blankedClass);
  listItem.setAttribute("data-blocked-subreddit", normalized);
  listItem.setAttribute("data-blocked-subreddit-display", subreddit);
  if (!listItem.getAttribute("role")) {
    listItem.setAttribute("role", "presentation");
  }
  listItem.style.opacity = "0.45";
  listItem.style.pointerEvents = "none";
  listItem.style.userSelect = "none";
  listItem.style.filter = "grayscale(1)";
  listItem.style.transition = "opacity 0.2s ease";

  const existingPlaceholder = listItem.querySelector<HTMLElement>(
    `.${config.placeholderClass}-content`,
  );
  if (!existingPlaceholder) {
    const placeholderContent = createSidebarPlaceholder(subreddit);
    listItem.innerHTML = "";
    listItem.appendChild(placeholderContent);
  } else {
    existingPlaceholder.setAttribute("data-placeholder-subreddit", normalized);
  }

  if (link) {
    hideSidebarLink(link);
  }
};

export const clearSidebarPlaceholderFromItem = (
  listItem: HTMLElement,
  link: HTMLAnchorElement | null,
  config: SidebarPlaceholderConfig,
): void => {
  if (!listItem.classList.contains(config.placeholderClass)) {
    return;
  }

  const placeholderContent = listItem.querySelector<HTMLElement>(
    `.${config.placeholderClass}-content`,
  );
  if (placeholderContent) {
    placeholderContent.remove();
  }

  listItem.classList.remove(config.placeholderClass, config.blankedClass);
  listItem.removeAttribute("data-blocked-subreddit");
  listItem.removeAttribute("data-blocked-subreddit-display");
  listItem.style.removeProperty("opacity");
  listItem.style.removeProperty("pointer-events");
  listItem.style.removeProperty("user-select");
  listItem.style.removeProperty("filter");
  listItem.style.removeProperty("transition");

  if (link) {
    showSidebarLink(link);
  }
};
