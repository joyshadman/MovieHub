# MovieHub About Page — UI Specification

## Goal
Recreate the supplied MovieHub About page as a polished, cinematic, dark-themed React UI. Use the provided code as the visual and behavior reference. Preserve the layout, content hierarchy, spacing, colors, and interactions as closely as practical.

## Tech and implementation
- React + TypeScript.
- Tailwind CSS utility classes.
- Use the existing project setup and conventions; inspect the repository before changing files.
- Keep the implementation component-based and easy to maintain.
- Do not introduce unnecessary dependencies.
- Use semantic HTML, accessible labels, keyboard support, and sensible image alt text.
- Use the existing routing approach. The MovieHub logo links to `#top`.
- Use responsive layout classes for mobile, tablet, and desktop.

## Global styling
- Import Google Fonts:
  - `DM Sans` for body text.
  - `Bebas Neue` for display-title styling if needed.
- Main background: `#070707`.
- Main text: white.
- Accent red: `#e50914`.
- Typography should feel cinematic, minimal, premium, and editorial.
- Use subtle white borders (`white/10` to `white/15`), translucent black overlays, and backdrop blur.
- Smooth scrolling, except when the user prefers reduced motion.
- Buttons and links should have pointer cursors and no tap highlight.
- Add a subtle grain/noise overlay to the hero using a low-opacity SVG turbulence texture or an equivalent CSS effect.
- Add a restrained entrance reveal animation: opacity from 0 to 1 and vertical movement from 18px to 0 over 900ms with a smooth easing curve. Disable it for `prefers-reduced-motion: reduce`.

## Page structure

### 1. Fixed header / navigation
- Fixed to the top, full width, high stacking order.
- Height: approximately 72px.
- Background: translucent black (`bg-black/45`) with strong backdrop blur.
- Bottom border: subtle white at 10% opacity.
- Center content in a max-width container of approximately 1440px.
- Left: MovieHub logo:
  - Red rounded square, approximately 32×32px.
  - White play icon centered inside.
  - Soft red glow behind the square.
  - Wordmark `MOVIE` in white and `HUB` in red.
- Desktop navigation links: Home, Movies, Series, Community, About.
  - Small 12px medium-weight text.
  - Inactive links are muted white; brighten on hover.
  - About is active with white text and a thin red underline.
- Right-side desktop CTA: `EXPLORE MOVIEHUB`, outlined translucent button.
- Mobile: hide desktop links and CTA; show a 40×40px menu button with two horizontal lines.
- Mobile menu opens below the header with a dark background and top border. Include About, Our story, What we believe, Community. Clicking a link closes the menu.
- Menu button must expose `aria-expanded` and an accessible label.

### 2. Hero / About section
- Section ID: `about`; page top anchor ID: `top`.
- Full-width, cinematic hero with a minimum height around 92vh, content vertically aligned toward the bottom on small screens and centered vertically on large screens.
- Use this hero image:
  `https://images.unsplash.com/photo-1717915604557-94283edbcc1b?auto=format&fit=crop&w=2400&q=90`
- Image fills the background with `cover` and centered positioning.
- Add a strong layered gradient:
  - Left side very dark for legible text.
  - Center darkened moderately.
  - Right side more visible.
  - Bottom fades into `#070707`.
  - Slight dark overlay near the top.
- Add a low-opacity noise/grain overlay above the image.
- Place content in a max-width 1440px container with generous horizontal padding.
- Content max width approximately 760px.
- Small eyebrow row:
  - Thin red line.
  - Uppercase text `ABOUT MOVIEHUB`.
  - 10px bold lettering with approximately 0.3em tracking.
  - Muted white.
- Main headline:
  `Stories belong to everyone.`
  - Very large responsive typography, approximately `clamp(3.6rem, 8vw, 7.5rem)`.
  - Tight line height around 0.92 and letter spacing around -0.065em.
  - Semibold.
  - Render `to everyone.` in muted white at roughly 35% opacity.
- Body copy:
  `MovieHub is where film lovers discover what to watch next. From iconic classics to bold new voices, we bring every kind of story together in one beautifully curated home.`
  - 15–16px, line height around 28px.
  - Muted white, max width approximately 570px.
- CTA row:
  - Primary link `OUR STORY` with white background, black text, right arrow icon, 48px height.
  - Secondary button `WATCH SHOWREEL`, translucent background, white border, circular play icon.
  - Both have subtle hover states.
- Bottom-right hero statistics on extra-large screens:
  - `190+` / `COUNTRIES`
  - `40K+` / `TITLES`
  - Large values, small uppercase muted labels.
  - Separate from the main copy with a subtle left border.

### 3. Our story section
- Section ID: `story`.
- Centered max-width 1440px two-column layout on large screens; stacked on smaller screens.
- Generous vertical padding: approximately 96px mobile and 128px desktop.
- Left column:
  - Film/cinema image:
    `https://images.unsplash.com/photo-1688678004647-945d5aaf91c1?auto=format&fit=crop&w=1400&q=85`
  - Aspect ratio 4:5, full width, `object-cover`, rounded corners.
  - Slight grayscale effect.
  - Add a subtle red blurred glow behind the image.
  - Add a dark gradient at the bottom.
  - Overlay caption at bottom-left: `BUILT FOR THE LOVE OF FILM`.
  - Image should be decorative/contextual; provide meaningful alt text.
- Right column:
  - Red eyebrow `OUR STORY`.
  - Heading: `More than a catalog. A place to connect.`
  - Use two lines on desktop when practical, 36–48px, tight tracking.
  - Paragraph 1:
    `MovieHub began with a simple idea: finding a great film should feel as exciting as watching one. We combine thoughtful curation, intelligent discovery, and a global community to help every story find its audience.`
  - Paragraph 2:
    `No endless searching. No soulless lists. Just cinema, presented with the care it deserves.`
  - Body text 15px with relaxed 32px line height and muted white.
  - Quote with red left border:
    `“We believe the right story can change your night—and sometimes, your life.”`
  - Quote text around 20px, medium weight, comfortable line height.

### 4. Values section
- Section ID: `values`.
- Full-width section with subtle white top/bottom borders and a very light white-tinted background (`white/[.025]`).
- Max-width 1440px container; generous vertical padding.
- Header row:
  - Red eyebrow `WHAT DRIVES US`.
  - Heading `Made for movie people.` in 36–48px semibold.
  - Supporting text aligned to the right on desktop:
    `Every detail is designed to get you closer to the stories you love.`
- Three equal-width cards separated by 1px gaps, with a subtle border and rounded outer container.
- Cards use near-black background (`#0a0a0a`), 32–40px padding, and a subtle hover background.
- Each card contains a muted sequence number near the top, heading lower down, and muted body copy:
  1. `01` — `Discovery with taste`
     `Human curation meets smart recommendations, so every suggestion feels worth your time.`
  2. `02` — `Cinema without borders`
     `Stories from every country, culture, and perspective belong on the same screen.`
  3. `03` — `Community first`
     `Ratings, lists, and conversations turn watching into something we share together.`
- Card headings brighten to red on hover.
- Keep card heights visually consistent.

### 5. Community / final CTA section
- Section ID: `community`.
- Centered content in a max-width 1440px container.
- Generous vertical padding (approximately 96–128px).
- Red uppercase eyebrow: `THE NEXT SCENE`.
- Heading:
  `Your new favorite story is waiting.`
  - Large, 36px mobile and up to 60px desktop.
  - Maximum width around 768px.
  - Tight letter spacing and line height.
- Supporting copy:
  `Join millions of film lovers discovering, discussing, and celebrating cinema every day.`
  - Muted white, 14px, max width around 576px.
- Red CTA button: `START EXPLORING`, right arrow icon, black/dark-compatible white text as appropriate to the reference; hover toward `#ff1f2b`.
- CTA links to `#top`.

### 6. Footer
- Top border in subtle white/10.
- Max-width 1440px inner container.
- Flex column on small screens, horizontal alignment on larger screens.
- Repeat MovieHub logo.
- Copyright text: `© 2025 MovieHub. Made for movie lovers.`
- Small uppercase text, tracking around 0.16em, muted white.

## Interactions and behavior
- Mobile navigation opens/closes from its menu button and closes when a link is clicked.
- `Escape` closes both the mobile menu and showreel modal.
- `OUR STORY` and `EXPLORE MOVIEHUB` scroll to `#story`.
- `Home` and the logo navigate to `#top`.
- `Movies` navigates to `#story`; `Series` navigates to `#values`; `Community` navigates to `#community`; `About` navigates to `#about`.
- `WATCH SHOWREEL` opens a centered modal dialog.
- Modal:
  - Fixed full-screen dark translucent backdrop with backdrop blur.
  - Centered 16:9 panel, max width approximately 1024px, black background, subtle border, rounded corners and shadow.
  - Use the hero image as a dimmed background placeholder, with centered play icon and text `MOVIEHUB · STORIES FOR EVERYONE`.
  - Close button in the top-right corner.
  - Clicking the backdrop closes the modal.
  - Clicking inside the modal should not close it.
  - Set `role="dialog"`, `aria-modal="true"`, and an accessible label.
  - This is a visual showreel placeholder, not a real video player. Do not imply that a video is playing.
- Use inline SVG icons for the play and right-arrow icons if no icon library is already installed.

## Responsive behavior
- Mobile: stacked sections, reduced horizontal padding, hero content anchored toward the bottom, mobile menu enabled, stats hidden.
- Tablet: maintain comfortable spacing and stack the story columns until there is enough room.
- Desktop: story two-column layout, desktop navigation, three value cards in one row.
- Use responsive typography and spacing rather than fixed widths that cause overflow.
- Ensure the page works down to 320px wide.
- Respect reduced-motion preferences.

## Quality checklist
- Match the provided design and copy; do not redesign the page into a different style.
- Keep the red accent restrained and consistent.
- Maintain strong contrast and legible text over images.
- Avoid unnecessary animation, gradients, dependencies, or extra sections.
- Verify all section anchors and buttons.
- Verify the modal closes through Escape, close button, and backdrop click.
- Verify mobile navigation opens and closes correctly.
- Check browser console for errors and check for horizontal overflow.
- Follow existing project conventions and avoid changing unrelated files.
