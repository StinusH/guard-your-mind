# Debugging Notes - Search Results Filtering

## Problem

The NSFW search results section is not being hidden/removed when users type in the search bar on Reddit.

## What Works

- ✅ Extension loads successfully
- ✅ Content script initializes (`[Guard Your Mind] Guard Your Mind content script initializing...`)
- ✅ MutationObserver is set up
- ✅ Subreddit page blocking works (Test 1 from TESTING.md passes)
- ✅ Feed post blocking works

## What Doesn't Work

- ❌ Search autocomplete dropdown NSFW section is not being hidden
- ❌ MutationObserver is not detecting when search results appear
- ❌ CSS injection doesn't seem to hide the element
- ❌ Polling doesn't find the element

## Technical Details

### Target Element Structure

```html
<faceplate-expandable-section-helper
  id="nsfw_typeahead_section"
  rpl=""
  class="last-dropdown-section"
  open=""
>
  <details open="" class="p-0 m-0 bg-transparent border-none rounded-none">
    <summary
      aria-controls="search-typeahead-expandable-section--nsfw_typeahead_section"
      aria-expanded="true"
      class="font-normal"
    >
      <search-typeahead-expandable-section id="nsfw_typeahead_section" open="">
        <!-- 18+ header with collapse button -->
      </search-typeahead-expandable-section>
    </summary>
    <faceplate-auto-height-animator>
      <!-- NSFW subreddit results -->
    </faceplate-auto-height-animator>
  </details>
</faceplate-expandable-section-helper>
```

### Selectors Tried

- `faceplate-expandable-section-helper#nsfw_typeahead_section` ❌
- `search-typeahead-expandable-section#nsfw_typeahead_section` ❌
- `[data-testid="search-sdui-typeahead-suggestion"]` ❌
- `[data-testid="search-warnings"]` ❌

## Observations

### Console Logs When User Interacts with Search

1. Page loads:
   - `[Guard Your Mind] Guard Your Mind content script initializing...`
   - `[Guard Your Mind] filterSearchResults called` (multiple times)
   - `[Guard Your Mind] MutationObserver initialized`

2. User clicks search bar: **No new logs appear**

3. User types "nsfw": **No new logs appear**

4. Search results with NSFW section visible: **No logs about detecting the section**

### Attempted Solutions

1. **MutationObserver approach**
   - Set up observer on `document.body` with `childList: true, subtree: true`
   - Added specific checks for search-related elements
   - Result: Observer doesn't detect when search results are added

2. **CSS injection approach**
   - Injected CSS rule to hide `faceplate-expandable-section-helper#nsfw_typeahead_section`
   - Result: Element still visible (CSS might not be applied or selector is wrong)

3. **Polling approach**
   - Query DOM every 500ms for the NSFW section
   - Result: Element not found (suggests selector is wrong or element is in Shadow DOM)

## Hypotheses

### Most Likely Issues

1. **Shadow DOM**: The search dropdown might be rendered inside a Shadow DOM, making it inaccessible to regular DOM queries
   - Custom elements like `faceplate-expandable-section-helper` often use Shadow DOM
   - Need to check if these elements have `shadowRoot`

2. **Timing Issue**: The content script runs at `document_start`, but the search dropdown might be rendered by React/framework later
   - The dropdown appears to be a portal or lazy-loaded component
   - Need to find the right event or timing to catch it

3. **Wrong Selector**: The element we're targeting might not be the actual container
   - The parent container might be different
   - Need to inspect the full DOM hierarchy when dropdown is open

### Less Likely Issues

4. **CSP (Content Security Policy)**: Reddit's CSP might be blocking our CSS injection
5. **Element is in iframe**: Search results might be in a separate iframe context

## Next Steps to Investigate

1. **Check for Shadow DOM**:

   ```javascript
   // In browser console while search is open:
   const helper = document.querySelector(
     "faceplate-expandable-section-helper#nsfw_typeahead_section",
   );
   console.log("Has shadow root:", helper?.shadowRoot);
   ```

2. **Find the actual parent container**:
   - Right-click the search dropdown background (not a result)
   - Inspect to see what element contains the entire dropdown
   - Look for data attributes or unique classes on parent containers

3. **Check if CSS is being applied**:

   ```javascript
   // In browser console:
   const styles = document.querySelectorAll("style#gym-hide-nsfw-search");
   console.log("Our CSS rules:", styles);
   ```

4. **Test querySelector when dropdown is open**:
   ```javascript
   // In browser console while search is open:
   console.log(
     document.querySelector("faceplate-expandable-section-helper#nsfw_typeahead_section"),
   );
   console.log(document.querySelector(".reddit-search-bar"));
   console.log(document.querySelectorAll("faceplate-expandable-section-helper"));
   ```

## Questions to Answer

- [ ] Does `faceplate-expandable-section-helper` have a shadow root?
- [ ] What is the immediate parent element of the search dropdown?
- [ ] Is the dropdown rendered inside a React portal?
- [ ] Can we access the element with `document.querySelector()` when it's visible?
- [ ] Is our CSS actually being injected into the page?
- [ ] Are there any console errors we're missing?
