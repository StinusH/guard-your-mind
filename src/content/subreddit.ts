export const extractSubredditFromHref = (href: string): string | null => {
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
};
