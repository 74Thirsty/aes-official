# Editing Reference for Portfolio Updates

This guide explains how to edit every piece of content on the core portfolio pages (landing page and non–Auto GAAP/EasyBay project sections). Each subsection walks you straight to the exact HTML or CSS selectors you need to modify.

---

## 1. Landing page (`index.html`)

All of the hero content, copy blocks, and CTAs live directly inside `index.html`. Open the file and use the line cues below to find the exact text.

### 1.1 Hero headline, summary, and bullets
* **Headline** — Lines 57-60 contain the `<h1>` with the highlighted span. Change the text between `<span class="hero-highlight">` and `</span>` to rewrite the highlighted phrase (e.g., “Christopher Hirschauer builds resilient software ecosystems”). Modify the rest of the sentence inside the same `<h1>` tag to update the trailing copy.【F:index.html†L55-L61】
* **Eyebrow label** — The small label above the headline (“Full-Stack Engineer & Systems Architect”) sits on line 56 in a `<span class="eyebrow">`. Edit this text to change the badge.【F:index.html†L55-L57】
* **Hero summary paragraph** — Line 61 holds the `<p class="hero-summary">`. Replace that paragraph to change the short blurb that follows the headline.【F:index.html†L61-L63】
* **Hero bullet list** — Lines 64-70 list the bullet points inside `<ul class="hero-list">`. Edit, add, or remove `<li>` items to reflect new achievements.【F:index.html†L63-L71】
* **Primary/secondary CTAs** — Buttons on lines 71-74 control the “View featured projects” and “Message Me” links. Update the anchor text or `href` targets there.【F:index.html†L71-L74】

### 1.2 Hero announcement ribbon & metrics
* **Ribbon text** — The scrolling announcement (“AES successfully broadcast…”) sits on line 49 within `<div class="hero-ribbon">`. Edit the inner text between the `<span class="pulse-dot">` and `<span class="ribbon-pill">` elements to change the announcement and badge.【F:index.html†L47-L53】
* **Metrics cards** — Lines 92-111 define the three stat cards. Update the `<small>`, `<strong>`, and `<p>` contents inside each `<article class="card stat-card">` to change the labels, numeric stats, and descriptions.【F:index.html†L87-L112】

### 1.3 Hero visual “square” (`.hero-device`)
The faux device on the right is the square panel you referenced.
1. **Change panel copy:** Lines 75-90 contain the markup for the header, body, and footer. Replace the text within `<strong>`, `<p>`, and `<span>` tags to customize the copy.【F:index.html†L74-L90】
2. **Swap the square for an image:**
   * Replace the entire `<div class="hero-device">…</div>` block with an image wrapper such as:
     ```html
     <figure class="hero-device image-mode">
       <img src="assets/your-image.png" alt="Describe the image" />
     </figure>
     ```
   * Add the `image-mode` styles in `styles/global.css` under the existing `.hero-device` rules (around line 463). For example:
     ```css
     .hero-device.image-mode {
       padding: 0;
       background: none;
       box-shadow: none;
     }

     .hero-device.image-mode img {
       display: block;
       width: 100%;
       height: auto;
       border-radius: var(--radius-xl);
     }
     ```
   * This keeps the glow effect while letting the square hold an actual image.【F:styles/global.css†L453-L520】

### 1.4 About section cards
* **Section heading & intro paragraph** — Lines 116-123 host the `<span class="eyebrow">`, `<h2>`, and `<p>` copy. Edit directly to update the section intro.【F:index.html†L116-L123】
* **Card content** — Each `.card.project-card` block spans roughly 8-10 lines (lines 124-173). Modify the `<span>` badges, `<h3>` titles, `<p>` descriptions, tag labels, and button links right inside each article.【F:index.html†L123-L175】

### 1.5 Skills / playbook shelves
* **Book-style cards** — Lines 176-239 define the faux book covers. Swap the `src` attribute on the `<img class="book-cover" …>` tag to change artwork and edit the `<h3>`, `<p>`, and button copy within `.book-body` to update descriptions.【F:index.html†L176-L239】
* **Cover shadows & colors** — Styling for `.book-card`, `.book-cover`, and `.book-body` lives around lines 1100-1148 in `styles/global.css`. Adjust background colors, gradients, or hover effects there.【F:styles/global.css†L1086-L1148】

### 1.6 Featured projects strip
* Each featured project lives inside `<article class="card service-card">` between lines 240-320. Edit:
  * The `<h3>` for the project name.
  * `<p>` inside `.service-summary` for the overview.
  * The `<li>` items within `<ul class="feature-list">` for bullet points.
  * CTA buttons at the bottom (`.button.primary` and `.button.outline`).【F:index.html†L239-L320】
* **Icons or accents** — Update icon images via the `<img>` tags near the top of each card, keeping them in `assets/` for consistency.【F:index.html†L243-L247】

### 1.7 Books & publications (assistant layout)
* **Chat bubbles** — Lines 323-377 cycle through alternating `<div class="message">` blocks. Edit the inner `<p>` elements to change the dialogue. Each message has `.speaker` and `.content` spans for labeling.【F:index.html†L323-L377】
* **Sidebar cards** — Lines 378-401 define the editorial sidebar with book recommendations. Replace the `<h3>`, `<p>`, and link URLs to feature different publications.【F:index.html†L378-L401】
* Styling for the chat layout and sidebar sits in `styles/global.css` around lines 1249-1317; adjust spacing or bubble colors there if needed.【F:styles/global.css†L1249-L1317】

### 1.8 Contact section & footer
* **Contact form** — Lines 403-444 include every `<label>`, input, and textarea. Edit the `placeholder` values or the helper text inside the `<small>` tags to change instructions. Update the submit button text inside `<button class="button primary">` on line 442.【F:index.html†L403-L444】
* **Thank-you message** — The live region that displays after submission is the `<p id="contactStatus">` on line 445. Modify its text to change the success message shown by the script.【F:index.html†L444-L446】
* **Footer** — Lines 447-455 contain the footer tagline and quick links; change the `<p>` contents and the anchor labels/URLs there.【F:index.html†L447-L455】

---

## 2. Styling reference (`styles/global.css`)

Key selectors that control the look-and-feel of the landing page and project subpages:

* `:root` (lines 1-27) — Update color tokens like `--accent` or `--surface` to shift the global palette.【F:styles/global.css†L1-L27】
* `.hero-*` rules (lines 405-520) — Manage the hero layout, including the size of the right-hand square, glow effects, and responsive stacking. Adjust `grid-template-columns` or padding here to resize the hero device.【F:styles/global.css†L405-L520】
* `.card`, `.stat-card`, `.project-card`, `.service-card` (lines 868-1044) — Change shared card chrome, glass background, and hover glow. Tweaks here propagate to hero metrics, about cards, and featured projects.【F:styles/global.css†L868-L1044】
* `.assistant-layout` & `.message` (lines 1249-1317) — Control the chat-like books section formatting, including bubble colors and spacing.【F:styles/global.css†L1249-L1317】
* `.form-grid`, `label`, `.form-row` (lines 1331-1379) — Adjust input alignment, label typography, and button spacing for the contact form.【F:styles/global.css†L1331-L1379】

When you change CSS tokens or shared component rules, the updates affect every page that imports `styles/global.css`.

---

## 3. Shared JavaScript (`scripts/global.js`)

If you need to alter interactive behavior:

* **Navigation dropdown** — Lines 30-92 manage the Projects dropdown. Update the selector list or ARIA handling here if you add new dropdown menus.【F:scripts/global.js†L30-L92】
* **Hero/section glow** — Lines 1-28 and 94-105 drive the pointer-tracked glow for cards and the page background. Adjust the math or remove listeners to tone down the effect.【F:scripts/global.js†L1-L28】【F:scripts/global.js†L94-L105】
* **Contact form submission** — Lines 200-217 personalize and display the thank-you message. Edit the template literal to change the confirmation copy.【F:scripts/global.js†L200-L217】

---

## 4. Project subpages (excluding Auto GAAP & EasyBay)

Each project lives in its own directory under `projects/`. They all follow the same structure: a hero section at the top, followed by card-based detail sections. Edit the HTML in the specific file to change the text.

### 4.1 AES overview (`projects/aes/index.html`)
* **Hero headline & intro** — Lines 24-55 mirror the landing page hero. Update the `<h1>`, summary paragraph, and bullet list to change AES positioning.【F:projects/aes/index.html†L24-L63】
* **Milestone metrics** — Edit the `<article class="card stat-card">` blocks around lines 64-92 to update AES performance stats.【F:projects/aes/index.html†L64-L93】
* **Deep-dive sections** — Subsequent sections (lines 95-210) contain the architecture, pipeline, and playbook descriptions. Modify the `<h2>`, `<p>`, and list items inside each `.section` block to refresh the narrative.【F:projects/aes/index.html†L95-L210】

### 4.2 GNOMAN (`projects/gnoman/index.html`)
* **Hero** — Lines 24-58 hold the GNOMAN hero headline and overview copy. Update text inside the `<h1>` and `<p>` tags to change the messaging.【F:projects/gnoman/index.html†L24-L59】
* **Feature breakdown** — Lines 60-148 cover the strategy, simulation, and analyst assistant cards. Edit the headings, body paragraphs, and bullet lists within each `.card` article.【F:projects/gnoman/index.html†L60-L148】

### 4.3 Smart Contract Wizard (`projects/smart-contract-wizard/index.html`)
* **Intro** — Lines 23-60 control the hero statement and setup instructions. Modify `<span class="eyebrow">`, `<h1>`, and `.hero-summary` to change the lead copy.【F:projects/smart-contract-wizard/index.html†L23-L61】
* **Workflow steps & templates** — Lines 62-170 include the cards and accordions describing templates, guardrails, and collaboration rhythms. Update inner `<h3>` headings, paragraphs, and `<li>` lists to revise each step.【F:projects/smart-contract-wizard/index.html†L62-L170】

All project pages import `../../styles/global.css`, so any CSS adjustments described in Section 2 will cascade to them automatically.

---

## 5. Asset management

* All logos, book covers, and decorative illustrations live under `assets/`. Replace files there or update the `src` attributes in the HTML to point to new filenames.【F:index.html†L24-L27】【F:index.html†L188-L239】
* When adding new images, keep transparent PNGs or optimized JPGs and ensure the `alt` attribute accurately describes the image for accessibility.
* Favicons and global metadata reside in each page’s `<head>` section (top 20 lines). Update the `<link rel="icon">` or meta tags if you need new branding.【F:index.html†L1-L18】

This walkthrough should give you direct handles on every piece of text or visual element you’ll want to edit on the main portfolio experience.


# Landing Page Editing Reference

This guide zeroes in on the portfolio landing page so you can quickly change copy, visuals, and interactions without guesswork. Every edit below references the exact file and selector to touch. Use your editor's “go to line” with the cited ranges for faster updates.

## Primary files

| Purpose | File | Key selectors / notes |
| --- | --- | --- |
| Page content | `index.html` | Hero, sections, cards, footer.【F:index.html†L1-L468】 |
| Shared styles | `styles/global.css` | Typography, hero visuals, cards, layout grid, forms.【F:styles/global.css†L1-L1443】 |
| Shared scripts | `scripts/global.js` | Nav dropdown, ambient glow, card hover, contact form toast.【F:scripts/global.js†L1-L217】 |

> **Heads-up:** Auto GAAP and EasyBay have their own pages, but they are out of scope here per your request. Everything below is strictly for the top-level portfolio (`index.html`).

## Hero section (`index.html` lines 21–118)

### 1. Headline and supporting copy
* **Headline text** – Update inside the `<h1>` at lines 61–63. The emphasized span uses `.hero-highlight` so you can keep only the portion you want highlighted inside `<span class="hero-highlight">…</span>`.【F:index.html†L59-L64】
  * To tweak the highlight styling (background wash, rounded capsule), adjust `.hero-highlight` and its `::after` pseudo-element in `styles/global.css` lines 656–675.【F:styles/global.css†L656-L675】
* **Summary paragraph** – Change the hero intro sentence inside `<p class="hero-summary">…</p>` at lines 63–64.【F:index.html†L63-L64】
* **Bullet points** – Each `<li>` in the `<ul class="hero-list">` (lines 65–70) is a standalone talking point. Add/remove `<li>` elements here; styling auto-applies the star icon via the `::before` rule in CSS lines 686–706.【F:index.html†L65-L70】【F:styles/global.css†L686-L706】
* **Primary/secondary CTAs** – Edit button labels or destinations inside the `.hero-actions` div (lines 71–74). Buttons are just `<a>` tags with `.button` modifiers; typography and states live in CSS lines 246–334.【F:index.html†L71-L74】【F:styles/global.css†L246-L334】

### 2. Announcement ribbon & badges
* The ticker ribbon text (“AES successfully broadcast…”) sits inside `.hero-ribbon` (lines 52–57). Replace the text between the `<div>` tags to change the announcement. The pill at the end uses `.ribbon-pill`; its styling is controlled at CSS lines 630–653.【F:index.html†L52-L57】【F:styles/global.css†L630-L653】

### 3. Turning the hero “square” into an image
The floating card on the right (`<div class="hero-device">` at lines 75–95) is the “square” you mentioned.

* **Swap text for an image:** Replace the inner markup between `<div class="hero-device"…>` and its closing `</div>` with an `<img>` element:
  ```html
  <div class="hero-device">
    <img src="assets/your-image.png" alt="Describe the visual" class="hero-device-media">
  </div>
  ```
* **Match sizing/padding:** After adding the image, extend `styles/global.css` just below the existing `.hero-device` rules (lines 744–815) with:
  ```css
  .hero-device-media {
    width: 100%;
    display: block;
    border-radius: inherit;
    object-fit: cover;
  }
  ```
  This keeps the glow, rounded corners, and animation from `.hero-device` while letting the image fill the frame.【F:styles/global.css†L744-L815】
* **Keep text instead?** Update the header label (`.hero-device-header`), title text (`<strong>`), paragraph, chips, and footer spans inline in `index.html`. Their fonts, spacing, and colors map to CSS rules at lines 787–855.【F:index.html†L75-L95】【F:styles/global.css†L787-L855】

### 4. Metrics cards
* Each stat is an `<article class="card stat-card">` inside `.hero-metrics` (lines 97–118). Change the `<small>`, `<strong>`, and `<p>` content directly. Card chrome and glow come from `.card`, `.stat-card`, and related selectors in CSS lines 901–1042.【F:index.html†L97-L118】【F:styles/global.css†L901-L1042】

### 5. Ambient glow + nav progress (optional tweaks)
* The scroll progress indicator markup is the `<div class="scroll-progress">` inside the nav (lines 36–40). The fill width is animated by `scripts/global.js` lines 107–119; edit `updateProgress()` if you want different clamping logic.【F:index.html†L36-L40】【F:scripts/global.js†L107-L119】
* Page-wide mouse-follow glow is triggered in `scripts/global.js` lines 94–105. Remove or adjust those listeners if you want a static background.【F:scripts/global.js†L94-L105】

## About section (`index.html` lines 121–181)

* **Section heading** – Modify the eyebrow, `<h2>`, and intro paragraph within `.section-heading` (lines 123–129). Typography matches `.section-heading` styles around CSS lines 951–998.【F:index.html†L123-L129】【F:styles/global.css†L951-L998】
* **Card badges & copy** – Each column is a `.card.project-card` (lines 130–177). Change badges in `.project-meta`, titles in `<h3>`, and supporting text inside `<p>`. Tag pills come from the `.tag-list` spans—add/remove `<span class="tag">` entries as needed. Spacing, gradients, and hover glow reference CSS lines 1001–1120.【F:index.html†L130-L177】【F:styles/global.css†L1001-L1120】
* **Buttons** – CTAs at the bottom of each card reuse the `.button` styles mentioned earlier, so you only need to edit labels/hrefs in the HTML.【F:index.html†L139-L176】

## Skills & stack cards (`index.html` lines 183–253)

* **Book-cover images** – Update the `<img>` `src` paths under `.book-cover` (lines 189, 205, 221). The container adds rounded corners and drop shadows defined at CSS lines 1086–1114. Keep `alt` text descriptive for accessibility.【F:index.html†L189-L232】【F:styles/global.css†L1086-L1114】
* **Headlines & badges** – Edit `<h3>` titles and `<span class="badge">` labels inside `.book-top` (lines 192–194, etc.). Badges pull colors from `.badge`, `.badge.success`, `.badge.accent` in CSS lines 1122–1166.【F:index.html†L192-L238】【F:styles/global.css†L1122-L1166】
* **CTA rows** – Buttons inside `.card-actions` link to projects, contact, or external sites. Update the `href` attributes to point wherever you need.【F:index.html†L196-L233】

## Featured projects grid (`index.html` lines 255–341)

* Each project is a `.card.service-card`. Titles live in the `<h3>` inside `.service-header`; the badge on the right uses `.service-rate`. Bullet features are the `<li>` items under `.feature-list`. Edit these inline to spotlight whichever engagements you want (excluding deeper Auto GAAP/EasyBay docs per scope).【F:index.html†L258-L334】【F:styles/global.css†L1186-L1247】
* To remove a project entirely, delete the corresponding `<article>` block; the CSS grid auto-reflows.

## Books & publications (`index.html` lines 344–408)

* **Static chat log** – Update the featured titles by editing each `<div class="message bot">` anchor (lines 353–378). To add more, duplicate a block inside `.assistant-log`. Chat bubble styling is defined at CSS lines 1249–1317.【F:index.html†L352-L378】【F:styles/global.css†L1249-L1317】
* **Sidebar essay** – Change the copy within `.card.assistant-playbook` (lines 379–403). Bullet points reuse `.feature-list` styles, so each `<li>` is free text.【F:index.html†L379-L403】
* **Footnote badge** – Edit the badge text inside `.assistant-footnote` to highlight new releases or promos. Styles are at CSS lines 1294–1317.【F:index.html†L399-L404】【F:styles/global.css†L1294-L1317】

## Contact section (`index.html` lines 410–457)

* **Form inputs** – Update placeholder guidance or field labels directly in the `<label>` blocks. Required attributes (`required`) enforce validation. Styling comes from `.contact-form`, `.form-status`, and form element rules in CSS lines 1331–1392.【F:index.html†L417-L437】【F:styles/global.css†L1331-L1392】
* **Success message copy** – Adjust the thank-you text returned on submission inside `scripts/global.js` lines 200–214 (`contactStatus.textContent = …`). This string accepts template literals; keep `${friendlyName}` if you want the auto-personalization.【F:scripts/global.js†L200-L214】
* **Contact sidebar** – Modify availability badges, collaboration copy, and link list under `.card.contact-meta` (lines 438–452). Badge colors originate from the `.badge` classes noted earlier.【F:index.html†L438-L452】

## Footer (`index.html` lines 460–468)

* Change the copyright line or quick-link labels/targets within the `<footer>`. Styles for `.site-footer` and `.footer-links` sit in CSS lines 1415–1443.【F:index.html†L460-L468】【F:styles/global.css†L1415-L1443】

## Shared interaction touchpoints

* **Card hover glow** – Controlled by `applyMouseGlow()` in `scripts/global.js` lines 1–28 in tandem with `.card::before` styles at CSS lines 901–933. Edit or remove if you want static cards.【F:scripts/global.js†L1-L28】【F:styles/global.css†L901-L933】
* **Navigation dropdown** – Toggle labels and links in the `.nav-dropdown` markup (lines 31–45). Keyboard/ARIA behavior is handled automatically by the script block at lines 30–92.【F:index.html†L31-L45】【F:scripts/global.js†L30-L92】

Armed with these pointers, you can jump straight to the relevant markup or styles whenever you need to change copy (like the “Christopher Hirschauer builds…” headline) or swap visuals (like the hero square) on the main portfolio page.

# Editing Reference (Portfolio Core Pages)

