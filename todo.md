# Guard Your Mind – Phase 1 TODO

## Immediate Next Steps

- [x] Scaffold Manifest V3 extension structure (`manifest.json`, service worker, content/background scripts, popup).
- [x] Initialize npm project and configure Vite + TypeScript bundling.
- [x] Configure linting (ESLint) and formatting (Prettier).
- [x] Hook ESLint/Prettier into Husky pre-commit via lint-staged.
- [ ] Implement Reddit domain matching and early content script injection.
- [ ] Prototype mature subreddit detection (page-level flag, CSS class/JSON data inspection).
- [ ] Implement DOM blanking for subreddit listing pages; verify consistent spacing.
- [ ] Add MutationObserver for dynamically loaded posts (infinite scroll).
- [ ] Handle mature posts detected in feeds/home/popular/search.
- [ ] Add user popup with enable/disable toggle and blocked counter.
- [ ] Implement basic local storage state management.
- [ ] Write automated tests for detection/blanking logic (e.g., using Jest + JSDOM).
- [ ] Prepare developer documentation (README quickstart, architecture notes).

## Nice-to-Have (Phase 1)

- [ ] Surface subtle “blocked” indicator inside blanked area (configurable).
- [ ] Add diagnostic logging gated behind developer flag.
- [ ] Provide temporary whitelist for debugging (manual list in storage).

## Deferred to Phase 2 (Twitch)

- [ ] Research Twitch DOM and API endpoints for mature flag detection.
- [ ] Extend content scripts/permissions to Twitch domains.
- [ ] Align UX for Twitch stream placeholders with Reddit experience.
