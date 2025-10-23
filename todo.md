# Guard Your Mind – Phase 1 TODO

## Completed (Phase 1 - Reddit)

- [x] Scaffold Manifest V3 extension structure (`manifest.json`, service worker, content/background scripts, popup).
- [x] Initialize npm project and configure Vite + TypeScript bundling.
- [x] Configure linting (ESLint) and formatting (Prettier).
- [x] Hook ESLint/Prettier into Husky pre-commit via lint-staged.
- [x] Implement Reddit domain matching and early content script injection.
- [x] Prototype mature subreddit detection (page-level flag, CSS class/JSON data inspection).
- [x] Implement DOM blanking for subreddit listing pages; verify consistent spacing.
- [x] Add MutationObserver for dynamically loaded posts (infinite scroll).
- [x] Handle mature posts detected in feeds/home/popular/search.
- [x] Handle Shadow DOM search dropdown (18+ section and recent NSFW searches).
- [x] Handle sidebar recent pages (filter NSFW subreddits from recent visits).
- [x] Add SPA navigation detection to persist filtering across page changes.
- [x] Track visited NSFW subreddits in-memory for cross-page filtering.

## In Progress

- [ ] Add user popup with enable/disable toggle and blocked counter.
- [ ] Implement basic local storage state management.

## User Settings & Customization (High Priority)

- [ ] Create settings page/popup UI with the following options:
  - **Blocking Styles**: Allow users to choose how content is blocked:
    - `placeholder` (current default): Gray box with "Content Blocked" message
    - `remove`: Completely remove the element from DOM
    - `quotes`: Replace with inspirational/motivational quotes
    - `blur`: Blur the content with semi-transparent overlay (still visible but obscured)
  - **Toggle by content type**: Enable/disable blocking for:
    - Mature subreddits (entire page)
    - Individual NSFW posts in feeds
    - Search results (dropdown and search pages)
  - **Visual customization**:
    - Placeholder color scheme
    - Custom message text
    - Show/hide lock icon
- [ ] Implement chrome.storage.sync for persisting user settings across devices.
- [ ] Refactor content script to read settings and apply chosen blocking style.
- [ ] Add settings import/export functionality.

## Technical Improvements

- [ ] Write automated tests for detection/blanking logic (e.g., using Jest + JSDOM).
- [ ] Prepare developer documentation (README quickstart, architecture notes).
- [ ] Add diagnostic logging gated behind developer flag (partially done, needs enhancement).
- [ ] Provide temporary whitelist for debugging (manual list in storage).
- [ ] Add telemetry/analytics (optional, privacy-respecting).

## Deferred to Phase 2 (Twitch)

- [ ] Research Twitch DOM and API endpoints for mature flag detection.
- [ ] Extend content scripts/permissions to Twitch domains.
- [ ] Align UX for Twitch stream placeholders with Reddit experience.
