import { ALWAYS_BLOCKED_DOMAINS } from "../../shared/settings";

const normalizeHostname = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    let hostname: string;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      hostname = new URL(trimmed).hostname;
    } else if (trimmed.includes("/") || trimmed.includes("?")) {
      hostname = new URL(trimmed, window.location.origin).hostname;
    } else {
      hostname = trimmed;
    }

    const normalized = hostname.toLowerCase();
    if (normalized.startsWith("www.")) {
      return normalized.slice(4);
    }
    return normalized;
  } catch {
    return null;
  }
};

const matchesAlwaysBlockedDomain = (hostname: string | null): boolean => {
  if (!hostname) {
    return false;
  }

  const target = hostname.toLowerCase();
  for (const domain of ALWAYS_BLOCKED_DOMAINS) {
    if (target === domain || target.endsWith(`.${domain}`)) {
      return true;
    }
  }
  return false;
};

export const isAlwaysBlockedDomain = (element: Element): boolean => {
  const hostnames = new Set<string>();

  const addCandidate = (candidate: string | null | undefined): void => {
    const normalized = normalizeHostname(candidate);
    if (normalized) {
      hostnames.add(normalized);
    }
  };

  addCandidate(element.getAttribute("domain"));
  addCandidate(element.getAttribute("data-domain"));
  addCandidate(element.getAttribute("content-href"));
  addCandidate(element.getAttribute("href"));

  const shredditPost = element.closest("shreddit-post");
  if (shredditPost) {
    addCandidate(shredditPost.getAttribute("domain"));
    addCandidate(shredditPost.getAttribute("data-domain"));
    addCandidate(shredditPost.getAttribute("content-href"));
  }

  const anchorElements = element.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (let index = 0; index < anchorElements.length && index < 4; index += 1) {
    addCandidate(anchorElements[index].href);
  }

  for (const hostname of hostnames) {
    if (matchesAlwaysBlockedDomain(hostname)) {
      return true;
    }
  }

  return false;
};
