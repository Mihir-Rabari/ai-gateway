## 2024-04-18 - Missing target="_blank" and rel="noopener noreferrer" on External Links
**Learning:** External links in the app (like `<a>` tags pointing to `WEB_URL`) need `target="_blank"` and `rel="noopener noreferrer"` for standard UX and security best practices, along with appropriate `focus-visible` accessibility styles.
**Action:** When adding external links, ensure `target="_blank"` and `rel="noopener noreferrer"` are present, and include `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` for keyboard navigation.
