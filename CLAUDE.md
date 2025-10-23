# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Guard Your Mind** is a Chromium Manifest V3 extension that blanks out mature (18+) Reddit content while preserving layout integrity. The extension detects and hides mature subreddits and posts in feeds without breaking navigation or causing layout jumps.

**Current Phase:** Phase 1 (Reddit coverage). Phase 2 will add Twitch support.

## Development Commands

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Lint TypeScript files
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:fix
```

## Architecture Overview

### Extension Structure

The extension follows Manifest V3 architecture with three main components:

1. **Background Service Worker** (`src/background/index.ts`)
   - Runs persistently as a service worker
   - Handles extension lifecycle events
   - Currently minimal; used for initialization logic

2. **Content Script** (`src/content/index.ts`)
   - Injected into all `https://*.reddit.com/*` pages at `document_start`
   - Responsible for detecting and blanking mature content
   - Must handle both initial page load and dynamic content (infinite scroll via MutationObserver)

3. **Popup UI** (`src/popup/`)
   - Browser action popup with enable/disable toggle
   - Displays blocked content counter for current session
   - Uses vanilla HTML/CSS/TypeScript (no heavy framework)

### Build System

- **Vite** with `@crxjs/vite-plugin` for Manifest V3 bundling
- Manifest defined in `manifest.config.ts` (not raw JSON)
- TypeScript compilation with source maps in development
- Hot reload support via Vite dev mode

### Code Quality Tools

- **Husky** pre-commit hooks run `lint-staged`
- **lint-staged** runs ESLint (max 0 warnings) on `src/**/*.{ts,tsx}` and Prettier checks on all relevant files
- All code must pass linting and formatting before commit

## Key Implementation Requirements

### Content Detection Strategy

The extension must:

- Detect mature content via Reddit's 18+ flags/metadata in DOM or API responses
- Handle both subreddit-level blocking (entire page) and post-level blocking (individual posts in feeds)
- Use MutationObserver to catch dynamically loaded content (infinite scroll)
- Avoid heavy DOM polling; prioritize performance

### Blanking Behavior

- Replace blocked content with **fixed-height placeholders** to prevent layout shifts
- Use neutral styling (gray background) matching container dimensions
- Optional configurable "Blocked by Guard Your Mind" text (subtle)
- Must not break Reddit's native voting, comments, or navigation for unblocked content

### Storage & State

- Use `chrome.storage` APIs (permission already declared in manifest)
- Store minimal state: enable/disable toggle, session block counter
- No telemetry or remote logging in Phase 1

### Performance Constraints

- Avoid extensive DOM manipulation that could slow browsing
- Use debounced observers and minimize reflows
- Must stay under Chrome extension CPU limits

## Technical Constraints

- **Browser support:** Chromium-based only (Chrome, Edge, Brave) on desktop
- **Manifest V3 compliance:** Use service workers, static host permissions
- **Reddit-specific:** Content script runs on `https://*.reddit.com/*`
- **Privacy:** No telemetry, respect user privacy

## Testing Approach

- Target: Jest + JSDOM (or Vitest) for DOM interaction tests
- Focus on detection logic and blanking behavior
- Manual QA required for Reddit UI variations (old vs new design, logged-out vs logged-in)
- Aim for <1% false positive rate

## Key Files

- `manifest.config.ts` - Extension manifest definition
- `vite.config.ts` - Build configuration
- `src/background/index.ts` - Background service worker
- `src/content/index.ts` - Main content script for Reddit
- `src/popup/` - Extension popup UI
- `prd.md` - Product requirements and success metrics
- `stack.md` - Technical stack details
- `todo.md` - Current implementation status

## Important Notes

- Reddit DOM selectors may break with UI changes; use resilient selectors and modular matching logic
- Handle both old and new Reddit designs where possible
- Phase 2 will extend to Twitch; keep architecture modular for future domain support
