# Guard Your Mind – Reddit 18+ Blocker

## Overview

- **Objective:** Deliver a Chromium browser extension that removes visibility of mature (18+) Reddit content by blanking it out while preserving layout integrity.
- **Primary audience:** Users who want to avoid explicit Reddit content without losing access to the rest of the platform.
- **Phase focus:** Reddit coverage (subreddits, feeds, individual posts). Twitch coverage will follow in Phase 2.

## Problem Statement

Reddit’s native mature-content filters do not fully remove explicit content; they rely on user restraint and still reveal thumbnails, titles, and post bodies. Users who want to avoid any incidental exposure need stronger controls that hide the content entirely while maintaining a smooth browsing experience.

## Goals & Success Metrics

- **G1:** Automatically detect and blank out all mature-designated subreddits before content is displayed.
  - _Metric:_ ≥ 95% of visits to flagged subreddits show no content within 1s of page load.
- **G2:** Suppress mature posts appearing in mixed feeds (r/popular, search results, subreddit listings).
  - _Metric:_ ≥ 95% of posts with an 18+ flag are blanked or removed from view.
- **G3:** Preserve normal browsing for non-mature content.
  - _Metric:_ < 1% false positives reported during testing.
- **G4:** Offer clear feedback and limited controls to the user.
  - _Metric:_ Provide an in-extension log of blocked items and allow toggling the feature per-session.

## Non-Goals (Phase 1)

- Blocking Twitch mature streamers (planned for Phase 2).
- Parsing user-generated filter lists beyond Reddit’s 18+ signals.
- Full parental-control feature set (passwords, scheduling, etc.).

## Key User Stories

1. As a user, when I navigate to an 18+ subreddit, I should see a blank area instead of any posts.
2. As a user, when a mature post appears in my home or popular feed, it should be hidden without layout jumps.
3. As a user, I want a lightweight indicator that a mature item was blocked so I understand what happened.
4. As a user, I want the extension to work without manual configuration once installed.

## Functional Requirements

- Detect Reddit pages and inject content scripts early in the load lifecycle.
- Identify mature subreddits via explicit badges/metadata in page markup or API responses.
- Observe dynamic content loads (infinite scroll) and continuously blank matching tiles/cards.
- Replace blocked content with fixed-height placeholders to keep scroll position stable.
- Provide an options page or popup with:
  - Enable/disable toggle.
  - Counter/log of blocked items for the current session.
- Store minimal state in local storage/sync storage.

## UX Guidelines

- Blank areas should match the container’s size with neutral styling (e.g., gray background) to avoid visual glitches.
- Optional text such as “Blocked by Guard Your Mind” should be subtle and configurable.
- Do not break native Reddit navigation, voting, or comments for unblocked content.

## Technical Constraints & Considerations

- Must run in Chromium-based browsers (Chrome, Edge, Brave) on desktop.
- Conform to Manifest V3 requirements (service worker, static host permissions).
- Content script should run on `https://*.reddit.com/*`.
- Use MutationObserver to monitor dynamically added posts.
- Avoid heavy DOM polling; prioritize performance to stay under Chrome extension CPU limits.
- Respect user privacy: no telemetry or remote logging during Phase 1.

## Dependencies & Integrations

- Chrome Extensions APIs (Manifest V3).
- Reddit DOM structure and metadata (no authenticated API requirements for Phase 1).

## Risks & Mitigations

- **Reddit UI changes:** DOM selectors may break. Mitigate via resilient selectors and modular matching logic.
- **Performance impacts:** Extensive DOM manipulation could slow browsing. Mitigate via debounced observers and minimal reflows.
- **False positives/negatives:** Mature detection can fail if Reddit changes flags. Introduce QA checks and maintain modular rule updates.

## Milestones

1. **M1 – Architecture & Scaffolding (Week 1):** Manifest, base content script, blanking prototype on subreddit pages.
2. **M2 – Feed Coverage (Week 2):** Extend detection to feeds/search, add MutationObserver handling.
3. **M3 – UX Polish (Week 3):** Implement placeholders, user feedback, popup/options UI.
4. **M4 – Testing & Packaging (Week 4):** Automated DOM tests, manual QA on core Reddit flows, prepare release build.

## Open Questions

- How should we handle logged-out vs logged-in Reddit variations (old vs new design)?
- Do we need localization support in Phase 1?
- Should the extension expose a whitelist for specific subreddits later?
- What analytics, if any, will be permitted in future phases?
