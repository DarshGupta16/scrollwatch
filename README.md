# ScrollWatch

ScrollWatch is a minimalist, powerful browser extension designed to help you reclaim your time and focus by preventing doomscrolling. Set custom rules for your most distracting websites and let ScrollWatch handle the discipline.

## 🚀 Features

- **Custom Domain Rules:** Add any website to your watchlist.
- **Granular Control:** Set precise "Allowed Duration" and "Reset Interval" in hours, minutes, and seconds.
- **Visual Discipline:** Once your limit is reached, the page is gracefully locked with a beautiful, non-intrusive overlay.
- **Cross-Browser:** Built with Manifest V3 and `webextension-polyfill` to support both Chrome and Firefox.
- **Modern UI:** Designed with a clean, responsive interface using React and Tailwind CSS 4.

## 🛠️ Tech Stack

- **Frontend:** React + Tailwind CSS 4
- **Build Tool:** Vite
- **Language:** TypeScript
- **Compatibility:** webextension-polyfill (Chrome/Firefox)

## 📦 Installation (Local Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/DarshGupta16/scrollwatch.git
   cd scrollwatch
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Load the extension:
   - **Chrome:** Go to `chrome://extensions/`, enable "Developer mode", and "Load unpacked" the `dist` folder.
   - **Firefox:** Go to `about:debugging#/runtime/this-firefox` and "Load Temporary Add-on", selecting `manifest.json` in the `dist` folder.

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** (or any later version at your option).

- Full license text: See the [`LICENSE`](./LICENSE.md) file in this repository.
- Copyright © 2026–2027 Darsh Gupta.

**Note on license update (as of February 2026):**
The repository was previously effectively under the ISC license (indicated in `package.json`). As the sole contributor, I've now relicensed the entire project (including all prior code) under AGPLv3 going forward.
- Older versions/commits remain usable under ISC terms for anyone who accessed them before this change.
- New versions and future work are under AGPLv3 to ensure modifications stay open and credit is preserved.
