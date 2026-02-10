# ScrollWatch: Technical Context & Instructions

## Project Overview
ScrollWatch is a browser extension (Manifest V3) built to curb doomscrolling by enforcing custom time limits on specific websites. It features a modern, reactive UI and cross-browser compatibility.

### Tech Stack
- **Framework:** React 19
- **Styling:** Tailwind CSS 4 (using `@tailwindcss/vite` plugin)
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Testing:** Vitest (Unit), Puppeteer (E2E)
- **Cross-Browser Support:** `webextension-polyfill` (supports Chrome and Firefox)

---

## Architecture & Entry Points
The project is configured in `vite.config.ts` with three distinct entry points:

1. **Popup (`index.html` -> `src/popup/main.tsx`)**
   - The user dashboard for adding/removing rules and viewing usage statistics.
   - Styled with Tailwind 4.

2. **Background Script (`src/background/index.ts`)**
   - A Service Worker that manages the logic for tracking "scrolling time".
   - **Optimization:** Uses `BatchStorageManager` to cache tracking data in memory and flush to `storage.local` every 10 seconds (or immediately on block) to avoid browser write quota limits.
   - **Debounce:** Ignores the first heartbeat of a new session (elapsed=0s) to prevent "redirect penalties" on SPAs like x.com.

3. **Content Script (`src/content/index.ts`)**
   - Injected into all pages.
   - Detects scroll activity and sends heartbeats to the background script every 1s (only if visible).
   - Listens for `BLOCK_PAGE` messages to inject a full-screen "Scrolling Locked" overlay.

---

## State Management & Storage
- **Storage:** Uses `browser.storage.local` via the polyfill.
- **Utility:** `src/utils/storage.ts` provides typed wrappers (`getStorage`, `setStorage`) for the rules.
- **Syncing:** The Background script listens for `storage.onChanged` to sync rule updates from the Options UI without overwriting in-memory tracking state.

**Schema:**
```typescript
interface Rule {
  id: string;
  domain: string;
  allowedDuration: number; // seconds
  resetInterval: number;   // seconds
  consumedTime: number;    // seconds
  lastReset: number;       // timestamp
  isBlocked: boolean;
}
```

---

## Development & Build Workflow

### Commands
- `npm install`: Install dependencies.
- `npm run build`: Generates the `dist/` folder.
- `npm run dev`: Vite dev mode (UI only).

### Testing
- **Unit Tests:** `npm install && npx vitest run`
    - Tests `BatchStorageManager` logic, storage flushing, and rule expiration.
- **E2E Tests:** `node scripts/e2e-test.js`
    - Uses Puppeteer to launch a real Chrome instance with the extension.
    - Verifies Block -> Unblock -> Re-block cycles on `localhost` and real sites.

### Git & GitHub
- **Branch:** `main` (default).
- **Author Identity:** `SpacexDragon` (`73838533+DarshGupta16@users.noreply.github.com`).
- **Remote:** [https://github.com/DarshGupta16/scrollwatch](https://github.com/DarshGupta16/scrollwatch)

---

## Deployment Instructions (Internal)
1. **Chrome:** Load the `dist` folder as an "Unpacked Extension".
2. **Firefox:** Load `manifest.json` from the `dist` folder as a "Temporary Add-on".
3. Full instructions and store-specific details are located in `DEPLOY.md`.

## Key Conventions
- **Cross-Browser:** Always use `import browser from 'webextension-polyfill'` for any `runtime`, `tabs`, or `storage` calls.
- **Modular Logic:** Keep the tracking logic in `background` and the UI logic in `popup`. The `content` script should remain as light as possible.
- **Tailwind 4:** Use the new `@theme` block in `src/index.css` for custom colors (primary, secondary, accent).
