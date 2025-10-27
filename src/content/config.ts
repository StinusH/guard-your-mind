export const CONFIG = {
  debugMode: true,
  blankedClass: "gym-blanked",
  placeholderClass: "gym-placeholder",
};

export const SELECTORS = {
  mature: {
    subreddit: {
      badges: '[data-testid="nsfw-badge"], .nsfw-badge, ._1poyrkZ7g36PawDueRza-J',
      app: "shreddit-app",
    },
    post: {
      tags: '[data-testid="post-nsfw-tag"], .nsfw-tag, ._3VgTjAJVNNV7jzlnwY-OFY, faceplate-tag[icon*="nsfw"], faceplate-badge[icon*="nsfw"], faceplate-pill[icon*="nsfw"], faceplate-tag[icon*="18"], faceplate-badge[icon*="18"], faceplate-pill[icon*="18"]',
      blur: '[data-blur-nsfw], .blur, ._1TrMDpkvzUBleMF5LjV_gS, [style*="blur"]',
      title: '[data-testid="post-title"]',
    },
    search: {
      icon: '[data-testid="nsfw-subreddit-icon"]',
      warnings: '[data-testid="search-warnings"]',
      badges: '[data-testid="nsfw-badge"], .nsfw-badge, faceplate-pill, faceplate-badge',
    },
  },
  containers: {
    shell: ["#subgrid-container", ".subgrid-container", '[data-testid="subgrid-container"]'],
    feed: [
      "shreddit-feed",
      '[data-testid="subreddit-feed"]',
      "#siteTable",
      ".Post",
      "shreddit-post",
    ],
    subredditHeader: [
      ".masthead",
      "shreddit-subreddit-header",
      "reddit-subreddit-header",
      '[data-testid="subreddit-banner"]',
      '[data-testid="subreddit-description"]',
      ".community-banner",
      ".community-description",
      ".subreddit-description",
    ],
    posts: [
      "shreddit-post",
      '[data-testid="post-container"]',
      ".Post",
      ".thing[data-subreddit]",
      "article[data-testid]",
    ],
    searchResults: [
      '[data-testid="search-sdui-typeahead-suggestion"]',
      "shreddit-search-result",
      '[data-testid="search-result"]',
      '[data-testid="community-result"]',
      "faceplate-typeahead-result",
      '[data-testid="typeahead-result"]',
      ".search-result",
      ".search-subreddit-link-wrapper",
    ],
  },
  shadowDOM: {
    searchHost: "reddit-search-large",
    sidebarHost: "reddit-recent-pages",
    nsfwSection: "faceplate-expandable-section-helper#nsfw_typeahead_section",
    recentSearchItem: "faceplate-tracker[data-faceplate-tracking-context]",
    sidebarRecentItem: "li[role='presentation']",
    sidebarRecentLink: "a[href*='/r/']",
    communityController: "#communities_section left-nav-communities-controller",
    communityItem: "left-nav-community-item",
    communityItemLink: "a[href*='/r/']",
    communityItemList: "li",
    cssId: "gym-hide-nsfw-search",
  },
};

export const QUOTES = [
  "Small habits today shape who you become tomorrow.",
  "You get stronger every time you choose what uplifts you.",
  "Guard your focus and your focus will guard your goals.",
  "Discipline is doing what matters even when it’s hard.",
  "Feed the mind with purpose, not distraction.",
];
