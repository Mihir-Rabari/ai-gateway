## 2024-04-15 - [Add visible focus states to interactive components]
**Learning:** In highly customized dark mode themes (like the Developer Console), default browser focus outlines often become invisible or clash with the aesthetic.
**Action:** Consistently apply `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` to all custom interactive elements (`Button`, `TextInput`, `TextArea`, `Link`, `a` tags, and ad-hoc buttons) to ensure keyboard navigation remains accessible without disrupting the visual design for mouse users.
