/**
 * script.js — Oratilwe T. Portfolio
 *
 * Vanilla JS, no dependencies.
 * The HTML is loaded with <script src="script.js"> at the end of <body>,
 * so the DOM is already available when this runs. No DOMContentLoaded
 * wrapper is required, but every query is guarded against null so the
 * script stays silent when optional elements are absent.
 *
 * Sections in this file:
 *  1. Constants & helpers
 *  2. Footer year
 *  3. Active-nav tracking (IntersectionObserver)
 *  4. Mobile navigation menu
 *  5. Smooth-scroll anchor links
 *  6. Photography gallery lightbox
 *  7. VGS diagram node highlighting
 *  8. External / placeholder link warnings (dev-only)
 *  9. Init
 */

/* ==========================================================================
   1. CONSTANTS & HELPERS
   ========================================================================== */

/** Height of the fixed site header, used for scroll offset calculations. */
const HEADER_HEIGHT = (() => {
  const header = document.querySelector('.site-header');
  return header ? header.getBoundingClientRect().height : 64;
})();

/** True when the user has requested reduced motion. */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/**
 * Safely query a single element.
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element|null}
 */
function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Safely query all elements.
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element[]}
 */
function qsAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Trap focus inside a container element (for dialogs/menus).
 * Returns a cleanup function that removes the listener.
 * @param {Element} container
 * @returns {() => void}
 */
function trapFocus(container) {
  const focusable = () =>
    qsAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      container
    ).filter(el => !el.closest('[hidden]'));

  function handler(e) {
    if (e.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0];
    const last  = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/* ==========================================================================
   2. FOOTER YEAR
   ========================================================================== */

/**
 * Writes the current year into #footer-year.
 * The CSS sets the year dynamically so it never goes stale.
 */
function initFooterYear() {
  const el = qs('#footer-year');
  if (!el) return;
  el.textContent = new Date().getFullYear();
}

/* ==========================================================================
   3. ACTIVE-NAV TRACKING
   Observes each named section and marks the matching nav link as active.
   Uses IntersectionObserver — no scroll event listeners needed.
   ========================================================================== */

/**
 * Attaches IntersectionObserver to every section with an [id] and updates
 * the matching .site-nav__link to carry the class "is-active".
 */
function initActiveNav() {
  const navLinks = qsAll('.site-nav__link');
  if (!navLinks.length) return;

  // Build a map of  sectionId → navLink
  const linkMap = new Map();
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      linkMap.set(href.slice(1), link);
    }
  });

  // Sections we care about (those that have a matching nav link)
  const sections = qsAll('section[id], main section[id]').filter(s =>
    linkMap.has(s.id)
  );
  if (!sections.length) return;

  // Track which sections are currently intersecting
  const visible = new Set();

  /**
   * Marks the topmost visible section's nav link as active.
   */
  function updateActive() {
    // Walk sections in DOM order; first visible one wins
    for (const section of sections) {
      if (visible.has(section.id)) {
        navLinks.forEach(l => l.classList.remove('is-active'));
        const activeLink = linkMap.get(section.id);
        if (activeLink) activeLink.classList.add('is-active');
        return;
      }
    }
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visible.add(entry.target.id);
        } else {
          visible.delete(entry.target.id);
        }
      });
      updateActive();
    },
    {
      // Fire when at least 15 % of a section enters the viewport,
      // accounting for the fixed header.
      rootMargin: `-${HEADER_HEIGHT}px 0px -70% 0px`,
      threshold: 0,
    }
  );

  sections.forEach(s => observer.observe(s));
}

/* ==========================================================================
   4. MOBILE NAVIGATION MENU
   ========================================================================== */

/**
 * Wires up the hamburger toggle button, handles aria-expanded,
 * closes the menu on link click or Escape, and manages focus correctly.
 */
function initMobileNav() {
  const toggle    = qs('.site-nav__toggle');
  const menu      = qs('#primary-menu');
  const navLinks  = qsAll('.site-nav__link');

  if (!toggle || !menu) return;

  let cleanupFocusTrap = null;

  /** Open the navigation menu. */
  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    document.body.style.overflow = 'hidden'; // prevent background scroll

    // Move focus to the first nav link
    const firstLink = qs('.site-nav__link', menu);
    if (firstLink) firstLink.focus();

    cleanupFocusTrap = trapFocus(menu);
  }

  /** Close the navigation menu. */
  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';

    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }

    // Return focus to the toggle
    toggle.focus();
  }

  /** Toggle open/closed state. */
  function toggleMenu() {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  }

  // Button click
  toggle.addEventListener('click', toggleMenu);

  // Close when a nav link is activated
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) closeMenu();
    });
  });

  // Escape key closes the menu from anywhere on the page
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Also close if the user clicks/taps outside the nav (on the backdrop)
  document.addEventListener('click', e => {
    if (
      menu.classList.contains('is-open') &&
      !menu.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      closeMenu();
    }
  });
}

/* ==========================================================================
   5. SMOOTH-SCROLL ANCHOR LINKS
   Handles in-page hash navigation with an offset for the fixed header.
   Respects prefers-reduced-motion.
   ========================================================================== */

/**
 * Intercepts clicks on any anchor whose href starts with "#" and scrolls
 * to the target with the header offset applied.
 */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').slice(1);
    if (!targetId) return; // bare "#" link — let the browser handle it

    const target = document.getElementById(targetId);
    if (!target) return;

    // Let the browser handle if reduced motion is preferred
    if (prefersReducedMotion) return;

    e.preventDefault();

    const top =
      target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT;

    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL hash without jumping
    history.pushState(null, '', `#${targetId}`);

    // Move focus to the section for keyboard users
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener(
      'blur',
      () => target.removeAttribute('tabindex'),
      { once: true }
    );
  });
}

/* ==========================================================================
   6. PHOTOGRAPHY GALLERY — LIGHTBOX
   The gallery currently contains placeholder items. When real <img> elements
   are added inside .gallery__item, the lightbox activates automatically.

   NOTE: No image assets exist yet. The lightbox sets up event delegation
   and handles both the empty state and real images gracefully.
   ========================================================================== */

/**
 * Builds and injects the lightbox DOM into <body>.
 * @returns {{ lightbox: Element, img: Element, caption: Element,
 *             prevBtn: Element, nextBtn: Element, closeBtn: Element }}
 */
function createLightbox() {
  const lightbox = document.createElement('div');
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Image viewer');
  lightbox.setAttribute('hidden', '');
  lightbox.className = 'lightbox';

  lightbox.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__panel">
      <button class="lightbox__close" aria-label="Close image viewer">&#10005;</button>
      <button class="lightbox__prev"  aria-label="Previous image">&#8592;</button>
      <figure class="lightbox__figure">
        <img class="lightbox__img" src="" alt="" />
        <figcaption class="lightbox__caption"></figcaption>
      </figure>
      <button class="lightbox__next" aria-label="Next image">&#8594;</button>
    </div>
  `;

  document.body.appendChild(lightbox);

  return {
    lightbox,
    img:       qs('.lightbox__img',      lightbox),
    caption:   qs('.lightbox__caption',  lightbox),
    prevBtn:   qs('.lightbox__prev',     lightbox),
    nextBtn:   qs('.lightbox__next',     lightbox),
    closeBtn:  qs('.lightbox__close',    lightbox),
    backdrop:  qs('.lightbox__backdrop', lightbox),
  };
}

/**
 * Initialises the photography gallery.
 * If no real images are present the empty-state message remains visible.
 */
function initGallery() {
  const gallery = qs('.gallery');
  if (!gallery) return;

  // Collect only gallery items that contain a real <img>
  const items = qsAll('.gallery__item', gallery).filter(item =>
    qs('img', item)
  );

  // Show empty state when no real photographs exist
  const emptyState = qs('#gallery-empty');
  if (emptyState) {
    emptyState.hidden = items.length > 0;
  }

  if (!items.length) return; // nothing to wire up

  const lb = createLightbox();
  let currentIndex = 0;
  let triggerElement = null; // element that opened the lightbox
  let cleanupFocusTrap = null;

  /**
   * Extract image data from a gallery item.
   * @param {Element} item
   * @returns {{ src: string, alt: string, caption: string }}
   */
  function getImageData(item) {
    const img     = qs('img', item);
    const caption = qs('.gallery__caption-title', item);
    return {
      src:     img ? img.src    : '',
      alt:     img ? img.alt    : '',
      caption: caption ? caption.textContent.trim() : '',
    };
  }

  /** Show the lightbox at a given index. */
  function show(index) {
    currentIndex = Math.max(0, Math.min(index, items.length - 1));
    const data = getImageData(items[currentIndex]);

    lb.img.src        = data.src;
    lb.img.alt        = data.alt;
    lb.caption.textContent = data.caption;

    // Hide prev/next when at the boundaries
    lb.prevBtn.hidden = currentIndex === 0;
    lb.nextBtn.hidden = currentIndex === items.length - 1;

    lb.lightbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    cleanupFocusTrap = trapFocus(lb.lightbox);
    lb.closeBtn.focus();
  }

  /** Close the lightbox and restore state. */
  function close() {
    lb.lightbox.setAttribute('hidden', '');
    document.body.style.overflow = '';

    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }

    // Return focus to the element that opened the lightbox
    if (triggerElement) {
      triggerElement.focus();
      triggerElement = null;
    }
  }

  // Open on gallery item click
  gallery.addEventListener('click', e => {
    const item = e.target.closest('.gallery__item');
    if (!item || !qs('img', item)) return;
    const index = items.indexOf(item);
    if (index === -1) return;
    triggerElement = e.target.closest('[href], button, [tabindex]') || item;
    show(index);
  });

  // Make gallery items keyboard-accessible
  items.forEach((item, i) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View image ${i + 1}`);
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerElement = item;
        show(i);
      }
    });
  });

  lb.closeBtn.addEventListener('click', close);
  lb.backdrop.addEventListener('click', close);
  lb.prevBtn.addEventListener('click', () => show(currentIndex - 1));
  lb.nextBtn.addEventListener('click', () => show(currentIndex + 1));

  // Keyboard navigation within the lightbox
  document.addEventListener('keydown', e => {
    if (lb.lightbox.hasAttribute('hidden')) return;
    switch (e.key) {
      case 'Escape':      close();                       break;
      case 'ArrowLeft':   show(currentIndex - 1);        break;
      case 'ArrowRight':  show(currentIndex + 1);        break;
    }
  });
}

/* ==========================================================================
   7. VGS DIAGRAM NODE HIGHLIGHTING
   Allows keyboard and mouse selection of a diagram node inside
   .overlay--diagram. Updates a small visual active state only —
   no fabricated data is shown.
   ========================================================================== */

/**
 * Makes each .diagram__node interactive:
 * clicking or pressing Enter/Space marks it as selected.
 */
function initDiagramInteraction() {
  const diagram = qs('.overlay--diagram');
  if (!diagram) return;

  const nodes = qsAll('.diagram__node', diagram);
  if (!nodes.length) return;

  nodes.forEach(node => {
    // Make each node focusable
    node.setAttribute('tabindex', '0');
    node.setAttribute('role',     'button');
    node.setAttribute('aria-pressed', 'false');

    function activate() {
      // Deselect all, then select this one
      nodes.forEach(n => {
        n.classList.remove('is-selected');
        n.setAttribute('aria-pressed', 'false');
      });
      node.classList.add('is-selected');
      node.setAttribute('aria-pressed', 'true');
    }

    node.addEventListener('click', activate);
    node.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}

/* ==========================================================================
   8. PLACEHOLDER LINK WARNINGS (development aid)
   Logs a console warning for every unconfigured placeholder URL so they
   are easy to spot during development. Does not modify the DOM.
   ========================================================================== */

/**
 * Identifies links still pointing at placeholder strings and warns.
 * Only runs in non-production environments (localhost / file://).
 */
function warnPlaceholderLinks() {
  const isDev =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  if (!isDev) return;

  const placeholders = [
    'YOUR_LINKEDIN_URL',
    'YOUR_GITHUB_URL',
    'YOUR_EMAIL_ADDRESS',
    'YOUR_VGS_GITHUB_URL',
    'YOUR_VGS_DEMO_URL',
    'YOUR_OTHER_PROFILE_URL',
  ];

  qsAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (placeholders.some(p => href.includes(p))) {
      console.warn(
        `[Portfolio] Unconfigured placeholder link found:\n` +
        `  Element: ${link.outerHTML.slice(0, 120)}\n` +
        `  ⚠ Replace "${href}" with your real URL before publishing.`
      );
    }
  });
}

/* ==========================================================================
   9. LIGHTBOX STYLES (injected once via JS to keep index.html clean)
   Kept minimal — the main design language lives in style.css.
   ========================================================================== */

/**
 * Injects the lightbox CSS rules into <head> so the lightbox component
 * is self-contained without touching index.html or style.css.
 */
function injectLightboxStyles() {
  const id = 'lightbox-styles';
  if (document.getElementById(id)) return; // already injected

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* ---------- Lightbox overlay ---------- */
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox[hidden] { display: none; }

    .lightbox__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(23, 24, 22, 0.92);
      cursor: pointer;
    }

    .lightbox__panel {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 1rem;
      max-width: 92vw;
      max-height: 90vh;
      padding: 0.5rem;
    }

    .lightbox__figure {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .lightbox__img {
      max-width:  min(80vw, 1000px);
      max-height: 80vh;
      object-fit: contain;
      border: 1px solid rgba(233, 227, 215, 0.12);
    }

    .lightbox__caption {
      font-family: "Courier New", Courier, monospace;
      font-size: 0.75rem;
      color: #A09B90;
      letter-spacing: 0.06em;
      text-align: center;
    }

    .lightbox__close,
    .lightbox__prev,
    .lightbox__next {
      background: rgba(23, 24, 22, 0.80);
      border: 1px solid rgba(233, 227, 215, 0.15);
      color: #E9E3D7;
      font-size: 1.25rem;
      width: 44px;
      height: 44px;
      border-radius: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 200ms ease, color 200ms ease;
      flex-shrink: 0;
    }

    .lightbox__close:hover,
    .lightbox__close:focus-visible,
    .lightbox__prev:hover,
    .lightbox__prev:focus-visible,
    .lightbox__next:hover,
    .lightbox__next:focus-visible {
      background: rgba(196, 91, 53, 0.20);
      color: #F2EDE5;
    }

    .lightbox__close:focus-visible,
    .lightbox__prev:focus-visible,
    .lightbox__next:focus-visible {
      outline: 2px solid #C45B35;
      outline-offset: 2px;
    }

    .lightbox__close {
      position: absolute;
      top: -3rem;
      right: 0;
    }

    .lightbox__prev[hidden],
    .lightbox__next[hidden] { visibility: hidden; }

    /* Diagram node selected state */
    .diagram__node.is-selected {
      border-color: #C45B35;
      color: #F2EDE5;
      background: rgba(196, 91, 53, 0.18);
    }

    .diagram__node:focus-visible {
      outline: 2px solid #C45B35;
      outline-offset: 2px;
    }

    /* Gallery item hover cursor when it wraps a real image */
    .gallery__item[role="button"] {
      cursor: pointer;
    }
    .gallery__item[role="button"]:focus-visible {
      outline: 2px solid #C45B35;
      outline-offset: 3px;
    }
  `;

  document.head.appendChild(style);
}

/* ==========================================================================
   10. HANDLE INITIAL HASH ON PAGE LOAD
   If the page is loaded with a hash (e.g. /#work), scroll to that section
   with the header offset applied after a short paint delay.
   ========================================================================== */

/**
 * Reads window.location.hash on load and scrolls to the target section,
 * compensating for the fixed header height.
 */
function handleInitialHash() {
  const hash = window.location.hash;
  if (!hash) return;

  const targetId = hash.slice(1);
  const target   = document.getElementById(targetId);
  if (!target) return;

  // Delay until layout is stable
  requestAnimationFrame(() => {
    setTimeout(() => {
      const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        HEADER_HEIGHT;

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }, 100);
  });
}

/* ==========================================================================
   11. INIT — wire everything up
   ========================================================================== */

/**
 * Entry point. Called immediately because the script tag is at the
 * end of <body> (no defer needed, DOM is ready).
 */
function init() {
  injectLightboxStyles();   // must run before gallery init
  initFooterYear();
  initActiveNav();
  initMobileNav();
  initSmoothScroll();
  initGallery();
  initDiagramInteraction();
  handleInitialHash();
  warnPlaceholderLinks();   // dev-only helper
}

init();
