# Testing Guide

## Loading the Extension in Chrome/Brave/Edge

1. **Build the extension:**

   ```bash
   npm run build
   ```

2. **Load in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

3. **Verify installation:**
   - You should see "Guard Your Mind" in your extensions list
   - The extension icon should appear in your browser toolbar

## Testing Mature Content Detection

### Test 1: Mature Subreddit Pages

1. Navigate to a known NSFW subreddit (e.g., r/nsfw)
2. **Expected behavior:** The entire feed should be blanked with gray placeholders
3. **Success criteria:** No mature content visible, layout preserved

### Test 2: Mixed Feeds (r/popular, r/all)

1. Navigate to r/popular or r/all
2. **Expected behavior:** Individual NSFW posts should be replaced with placeholders
3. **Success criteria:** Safe content remains visible, mature posts blanked

### Test 3: Dynamic Content (Infinite Scroll)

1. Navigate to r/all or r/popular
2. Scroll down to load more posts
3. **Expected behavior:** Newly loaded NSFW posts should be automatically blanked
4. **Success criteria:** MutationObserver catches and blanks dynamic content

### Test 4: Old vs New Reddit

1. Test on both old.reddit.com and www.reddit.com
2. **Expected behavior:** Extension works on both versions
3. **Success criteria:** Detection works regardless of Reddit UI version

## Debugging

### Enable Debug Mode

1. Edit `src/content/index.ts`
2. Change `debugMode: false` to `debugMode: true`
3. Rebuild: `npm run build`
4. Reload extension in browser
5. Check browser console for `[Guard Your Mind]` logs

### Common Issues

**Nothing is being blanked:**

- Check browser console for errors
- Verify extension is enabled
- Check if Reddit changed their DOM structure
- Enable debug mode to see detection logs

**False positives (non-NSFW content blanked):**

- Review detection logic in `isMaturePost()` and `isMatureSubreddit()`
- Check console logs to see why content was flagged

**Layout issues:**

- Inspect placeholder dimensions
- Check if original element height is being captured correctly
- Verify CSS doesn't conflict with Reddit's styles

## Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] NSFW subreddit pages are fully blanked
- [ ] NSFW posts in r/all are blanked
- [ ] NSFW posts in r/popular are blanked
- [ ] Safe content remains visible
- [ ] Infinite scroll works (new posts are detected)
- [ ] No console errors
- [ ] Layout doesn't jump or break
- [ ] Works on old.reddit.com
- [ ] Works on www.reddit.com

## Development Mode

For faster iteration:

```bash
npm run dev
```

This enables hot reload - changes to the code will automatically rebuild the extension. You'll still need to click "Reload" on the extension card in `chrome://extensions/`.
