/* Site Prototyper - Graybox IA Navigator */

// Data model types (documentation)
// IA Schema (YAML/JSON or parsed from Markdown):
// {
//   site: { title?: string, description?: string },
//   utilityNav?: [ { label: string, href?: string, pageId?: string } ],
//   mainNav: [
//     { label: string, pageId?: string, href?: string, children?: [ { label, pageId?, href? } ] }
//   ],
//   pages: {
//     [pageId: string]: {
//       title: string,
//       description?: string,
//       sections?: [ { heading?: string, description?: string } ],
//       ctas?: [ { label: string, pageId?: string, href?: string } ]
//     }
//   },
//   footer?: { links?: [ { label: string, href?: string, pageId?: string } ] }
// }

(function () {
  const EMBEDDED_SAMPLE_YAML = `site:
  title: Example Corp
  description: Graybox prototype of the proposed IA.

utilityNav:
  - label: Contact
    pageId: contact
  - label: Careers
    href: https://example.com/careers

mainNav:
  - label: Home
    pageId: home
  - label: About
    pageId: about
    children:
      - label: Leadership
        pageId: leadership
      - label: History
        pageId: history
  - label: Services
    pageId: services
    children:
      - label: Consulting
        pageId: consulting
      - label: Implementation
        pageId: implementation
  - label: Insights
    pageId: insights
  - label: Contact
    pageId: contact

pages:
  home:
    title: Home
    description: Landing that quickly explains value props and orients visitors to key paths.
    sections:
      - heading: Hero
        description: High-level positioning, top CTA to Contact and to Services.
      - heading: Proof Points
        description: Logos, stats, testimonial snippets.
    ctas:
      - label: Explore Services
        pageId: services
      - label: Get in touch
        pageId: contact

  about:
    title: About
    description: Who we are and why we exist.
    sections:
      - heading: Mission
        description: Brief statement of purpose.
      - heading: Team Overview
        description: Link off to Leadership.
    ctas:
      - label: Meet leadership
        pageId: leadership

  leadership:
    title: Leadership
    description: Bios of executive team and practice leads.
    sections:
      - heading: Executives
      - heading: Practice Leads
    ctas:
      - label: Our history
        pageId: history

  history:
    title: History
    description: Milestones that establish credibility and trajectory.

  services:
    title: Services
    description: Catalog of offerings with links to detail pages.
    sections:
      - heading: Consulting
        description: Strategy, research, and roadmapping.
      - heading: Implementation
        description: Design systems, builds, integrations.
    ctas:
      - label: Talk to sales
        pageId: contact

  consulting:
    title: Consulting
    description: Strategy-first engagements that de-risk investment.

  implementation:
    title: Implementation
    description: Delivery-focused engagements with measurable outcomes.

  insights:
    title: Insights
    description: Blog/articles, case studies, and resources.

  contact:
    title: Contact
    description: Lead capture and alternate contact methods.
    sections:
      - heading: Form
      - heading: Locations

footer:
  links:
    - label: Privacy
      href: https://example.com/privacy
    - label: Contact
      pageId: contact
`;
  const state = {
    ia: null,
    currentPageId: null,
  };

  const els = {
    utilityNav: document.getElementById('utilityNav'),
    mainNavList: document.getElementById('mainNavList'),
    mobileToggle: document.getElementById('mobileNavToggle'),
    pageOutlet: document.getElementById('pageOutlet'),
    footerContent: document.getElementById('footerContent'),
    openLoader: document.getElementById('openLoader'),
    floatingLoadBtn: document.getElementById('floatingLoadBtn'),
    loaderDialog: document.getElementById('loaderDialog'),
    fileInput: document.getElementById('fileInput'),
    fileDrop: document.getElementById('fileDrop'),
    pasteInput: document.getElementById('pasteInput'),
    confirmLoad: document.getElementById('confirmLoad'),
    cancelLoad: document.getElementById('cancelLoad'),
    loaderError: document.getElementById('loaderError'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
  };

  // Router: use hash navigation for simplicity
  window.addEventListener('hashchange', () => {
    const pageId = location.hash.replace(/^#\/?/, '') || null;
    if (pageId) navigateToPage(pageId);
  });

  function setHash(pageId) {
    if (location.hash.replace(/^#\/?/, '') !== pageId) {
      location.hash = `#${pageId}`;
    }
  }

  // Loader dialog controls
  function openLoaderDialog() {
    els.loaderError.textContent = '';
    if (typeof els.loaderDialog.showModal === 'function') {
      els.loaderDialog.showModal();
    } else {
      // Fallback for older browsers
      els.loaderDialog.setAttribute('open', '');
    }
  }
  function closeLoaderDialog() {
    els.loaderError.textContent = '';
    if (typeof els.loaderDialog.close === 'function') {
      try { els.loaderDialog.close(); } catch (_) { els.loaderDialog.removeAttribute('open'); }
    } else {
      els.loaderDialog.removeAttribute('open');
    }
  }

  function bindLoaderTabs() {
    const tabs = Array.from(els.loaderDialog.querySelectorAll('.tab'));
    const panels = Array.from(els.loaderDialog.querySelectorAll('.tab-panel'));
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = els.loaderDialog.querySelector(`.tab-panel[data-tab-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function detectFormat(text) {
    const trimmed = text.trim();
    if (!trimmed) return 'empty';
    if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed)) return 'json';
    if (/^---[\s\S]*?:[\s\S]*?/.test(trimmed) || /:\s*\n/.test(trimmed)) return 'yaml';
    return 'markdown';
  }

  function parseIA(text) {
    const format = detectFormat(text);
    try {
      if (format === 'json') return JSON.parse(text);
      if (format === 'yaml') return jsyaml.load(text);
      // Markdown: minimal parser for a simple IA markdown structure
      return parseMarkdownIA(text);
    } catch (err) {
      throw new Error(`Failed to parse ${format}: ${err.message}`);
    }
  }

  function parseMarkdownIA(md) {
    // Expected loose structure:
    // # Site Title
    // ## Utility
    // - Label: link or pageId
    // ## Navigation
    // - Page Label (pageId)
    //   - Child Label (childId)
    // ## Pages
    // ### Page Title (pageId)
    // Goal: ...
    // Sections:
    // - Heading: Description
    // CTAs:
    // - Label -> pageId or http
    const lines = md.split(/\r?\n/);
    const ia = { site: {}, mainNav: [], pages: {}, footer: { links: [] }, utilityNav: [] };
    let section = null;
    let currentPageId = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('# ')) {
        ia.site.title = line.replace(/^#\s+/, '').trim();
        continue;
      }
      if (/^##\s+utility/i.test(line)) { section = 'utility'; continue; }
      if (/^##\s+navigation/i.test(line)) { section = 'nav'; continue; }
      if (/^##\s+pages?/i.test(line)) { section = 'pages'; continue; }
      if (/^##\s+footer/i.test(line)) { section = 'footer'; continue; }

      if (section === 'utility' && line.startsWith('- ')) {
        const m = /^-\s+(.+?)(?:\s*->\s*(.+))?$/.exec(line);
        if (m) ia.utilityNav.push(labelAndTarget(m[1], m[2]));
      } else if (section === 'nav' && line.startsWith('- ')) {
        // Indented children with two spaces
        const indent = raw.match(/^(\s*)-/)?.[1]?.length || 0;
        const m = /^-\s+(.+?)(?:\s*\(([^)]+)\))?$/.exec(line);
        if (!m) continue;
        const node = { label: m[1].trim() };
        if (m[2]) node.pageId = slugify(m[2].trim());
        if (indent === 0) {
          ia.mainNav.push(node);
        } else {
          const parent = ia.mainNav[ia.mainNav.length - 1];
          if (!parent) continue;
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else if (section === 'pages' && line.startsWith('### ')) {
        const m = /^###\s+(.+?)(?:\s*\(([^)]+)\))?$/.exec(line);
        if (!m) continue;
        const title = m[1].trim();
        const pageId = slugify(m[2] ? m[2].trim() : title);
        ia.pages[pageId] = { title };
        currentPageId = pageId;
      } else if (section === 'pages' && /^goal\s*:/i.test(line)) {
        if (!currentPageId) continue;
        ia.pages[currentPageId].description = line.replace(/^goal\s*:\s*/i, '').trim();
      } else if (section === 'pages' && /^sections\s*:/i.test(line)) {
        if (!currentPageId) continue;
        ia.pages[currentPageId].sections = [];
      } else if (section === 'pages' && line.startsWith('- ') && currentPageId) {
        const m = /^-\s*(.+?)(?::\s*(.+))?$/.exec(line);
        if (m) {
          ia.pages[currentPageId].sections = ia.pages[currentPageId].sections || [];
          ia.pages[currentPageId].sections.push({ heading: m[1].trim(), description: (m[2] || '').trim() });
        }
      } else if (section === 'pages' && /^ctas?\s*:/i.test(line)) {
        if (!currentPageId) continue;
        ia.pages[currentPageId].ctas = [];
      } else if (section === 'pages' && /^\*\s+/.test(line) && currentPageId) {
        const m = /^\*\s+(.+?)\s*->\s*(.+)$/.exec(line);
        if (m) {
          ia.pages[currentPageId].ctas = ia.pages[currentPageId].ctas || [];
          const { label, pageId, href } = labelAndTarget(m[1], m[2]);
          ia.pages[currentPageId].ctas.push({ label, pageId, href });
        }
      } else if (section === 'footer' && line.startsWith('- ')) {
        const m = /^-\s+(.+?)\s*->\s*(.+)$/.exec(line);
        if (m) ia.footer.links.push(labelAndTarget(m[1], m[2]));
      }
    }
    return ia;
  }

  function labelAndTarget(label, target) {
    const entry = { label: String(label).trim() };
    const t = String(target || '').trim();
    if (!t) return entry;
    if (/^https?:\/\//i.test(t) || t.startsWith('/')) entry.href = t;
    else entry.pageId = slugify(t);
    return entry;
  }

  function slugify(str) {
    return String(str)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function normalizeIA(raw) {
    const ia = { site: {}, mainNav: [], pages: {}, utilityNav: [], footer: { links: [] } };
    if (raw.site) ia.site = raw.site;
    if (Array.isArray(raw.utilityNav)) ia.utilityNav = raw.utilityNav;
    if (Array.isArray(raw.mainNav)) ia.mainNav = raw.mainNav;
    if (raw.pages && typeof raw.pages === 'object') ia.pages = raw.pages;
    if (raw.footer && typeof raw.footer === 'object') ia.footer = { links: raw.footer.links || [] };

    // Ensure nav items have pageId or href; derive pageId from label if missing and page exists
    for (const item of ia.mainNav) {
      if (!item.pageId && !item.href && item.label) item.pageId = slugify(item.label);
      if (Array.isArray(item.children)) {
        for (const child of item.children) {
          if (!child.pageId && !child.href && child.label) child.pageId = slugify(child.label);
        }
      }
    }
    // Ensure pages have title
    for (const [pid, page] of Object.entries(ia.pages)) {
      if (!page.title) page.title = pid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return ia;
  }

  function renderIA(ia) {
    document.title = ia.site?.title ? `${ia.site.title} — Prototype` : 'Site Prototyper';
    renderUtilityNav(ia.utilityNav);
    renderMainNav(ia.mainNav);
    renderFooter(ia.footer);
    // initial route
    const initial = location.hash.replace(/^#\/?/, '') || findFirstNavigable(ia);
    navigateToPage(initial);
  }

  function findFirstNavigable(ia) {
    for (const item of ia.mainNav) {
      if (item.pageId) return item.pageId;
      if (Array.isArray(item.children)) {
        for (const child of item.children) if (child.pageId) return child.pageId;
      }
    }
    const keys = Object.keys(ia.pages);
    return keys[0] || null;
  }

  function renderUtilityNav(items) {
    els.utilityNav.innerHTML = '';
    for (const link of items || []) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      if (link.pageId) {
        a.href = `#${link.pageId}`;
      } else if (link.href) {
        a.href = link.href; a.target = '_blank'; relSafe(a);
      } else {
        a.href = '#';
      }
      a.textContent = link.label || link.pageId || link.href;
      li.appendChild(a);
      els.utilityNav.appendChild(li);
    }
  }

  function renderMainNav(items) {
    els.mainNavList.innerHTML = '';
    let dropdownCounter = 0;
    for (const item of items || []) {
      const li = document.createElement('li');
      li.className = 'nav-item';

      const a = document.createElement('a');
      a.className = 'nav-link';
      a.textContent = item.label || item.pageId || 'Page';
      if (item.pageId) {
        a.href = `#${item.pageId}`;
      } else if (item.href) {
        a.href = item.href; a.target = '_blank'; relSafe(a);
      } else {
        a.href = '#';
      }

      li.appendChild(a);

      if (Array.isArray(item.children) && item.children.length) {
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        const dropdownId = `dropdown-${++dropdownCounter}-${Math.random().toString(36).slice(2, 7)}`;
        dropdown.id = dropdownId;
        a.setAttribute('aria-haspopup', 'true');
        a.setAttribute('aria-expanded', 'false');
        a.setAttribute('aria-controls', dropdownId);
        
        for (const child of item.children) {
          const ca = document.createElement('a');
          if (child.pageId) ca.href = `#${child.pageId}`; else if (child.href) { ca.href = child.href; ca.target = '_blank'; relSafe(ca); } else ca.href = '#';
          ca.textContent = child.label || child.pageId || 'Page';
          // Close on click to avoid lingering menu
          ca.addEventListener('click', () => {
            closeDropdown();
          });
          dropdown.appendChild(ca);
        }
        li.appendChild(dropdown);
        
        function openDropdown() {
          dropdown.classList.add('open');
          a.setAttribute('aria-expanded', 'true');
        }
        function closeDropdown() {
          dropdown.classList.remove('open');
          a.setAttribute('aria-expanded', 'false');
        }
        function isOpen() { return dropdown.classList.contains('open'); }

        // Mouse hover
        li.addEventListener('mouseenter', openDropdown);
        li.addEventListener('mouseleave', closeDropdown);

        // Keyboard focus management: keep open while focus is within li
        li.addEventListener('focusin', openDropdown);
        li.addEventListener('focusout', (e) => {
          const next = e.relatedTarget;
          if (next && li.contains(next)) return;
          // Fallback: delay to allow focus to settle
          setTimeout(() => {
            if (!li.contains(document.activeElement)) closeDropdown();
          }, 0);
        });

        // Touch/click: first click opens, second click navigates if parent has a pageId
        a.addEventListener('click', (e) => {
          if (!isOpen()) {
            e.preventDefault();
            openDropdown();
          }
        });
      }

      els.mainNavList.appendChild(li);
    }
  }

  function renderFooter(footer) {
    const links = footer?.links || [];
    els.footerContent.innerHTML = '';
    for (const link of links) {
      const a = document.createElement('a');
      if (link.pageId) a.href = `#${link.pageId}`;
      else if (link.href) { a.href = link.href; a.target = '_blank'; relSafe(a); }
      else a.href = '#';
      a.textContent = link.label || link.pageId || link.href;
      els.footerContent.appendChild(a);
    }
  }

  function navigateToPage(pageId) {
    if (!state.ia) return;
    const page = state.ia.pages?.[pageId];
    if (!page) {
      els.pageOutlet.innerHTML = `<section class="page-section"><h1>Page not found</h1><p>No page configured for id: <code>${escapeHtml(pageId)}</code></p></section>`;
      return;
    }
    state.currentPageId = pageId;
    highlightCurrentNav(pageId);
    els.pageOutlet.innerHTML = '';
    const container = document.createElement('section');
    container.className = 'page-section';
    const h1 = document.createElement('h1');
    h1.textContent = page.title || pageId;
    const meta = document.createElement('div');
    meta.className = 'page-meta';
    meta.textContent = `/${pageId}`;
    const p = document.createElement('p');
    p.textContent = page.description || '—';

    container.appendChild(h1);
    container.appendChild(meta);
    container.appendChild(p);

    if (Array.isArray(page.sections) && page.sections.length) {
      for (const section of page.sections) {
        const box = document.createElement('div');
        box.className = 'page-section';
        if (section.heading) {
          const h = document.createElement('h3');
          h.textContent = section.heading;
          box.appendChild(h);
        }
        if (section.description) {
          const d = document.createElement('p');
          d.textContent = section.description;
          box.appendChild(d);
        }
        container.appendChild(box);
      }
    }

    if (Array.isArray(page.ctas) && page.ctas.length) {
      const list = document.createElement('div');
      list.className = 'cta-list';
      for (const cta of page.ctas) {
        const a = document.createElement('a');
        a.className = 'cta' + (cta.pageId ? ' internal' : '');
        if (cta.pageId) a.href = `#${cta.pageId}`;
        else if (cta.href) { a.href = cta.href; a.target = '_blank'; relSafe(a); }
        else a.href = '#';
        a.textContent = cta.label || cta.pageId || cta.href;
        list.appendChild(a);
      }
      container.appendChild(list);
    }

    els.pageOutlet.appendChild(container);
    setHash(pageId);
  }

  function highlightCurrentNav(pageId) {
    const links = els.mainNavList.querySelectorAll('a.nav-link');
    links.forEach(a => a.removeAttribute('aria-current'));
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === `#${pageId}`) a.setAttribute('aria-current', 'page');
    });
  }

  function relSafe(anchor) { anchor.rel = 'noopener noreferrer'; }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function handleConfirmLoad() {
    const activeTab = els.loaderDialog.querySelector('.tab.active')?.dataset.tab;
    els.loaderError.textContent = '';
    if (activeTab === 'upload') {
      const file = els.fileInput.files?.[0];
      if (!file) { els.loaderError.textContent = 'Choose a file to upload.'; return; }
      readFileAsText(file).then(text => loadIAFromText(text)).catch(err => showLoaderError(err));
    } else {
      const text = els.pasteInput.value;
      if (!text.trim()) { els.loaderError.textContent = 'Paste YAML or Markdown to continue.'; return; }
      loadIAFromText(text);
    }
  }

  function showLoaderError(err) {
    els.loaderError.textContent = err?.message || String(err);
  }

  function loadIAFromText(text) {
    try {
      const raw = parseIA(text);
      const ia = normalizeIA(raw);
      state.ia = ia;
      closeLoaderDialog();
      renderIA(ia);
    } catch (err) {
      showLoaderError(err);
    }
  }

  function hookupFileDrop() {
    const el = els.fileDrop;
    ;['dragenter','dragover'].forEach(evt => el.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); el.style.background = '#f0f9ff'; }));
    ;['dragleave','drop'].forEach(evt => el.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); el.style.background = '#fafafa'; }));
    el.addEventListener('drop', async e => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      els.fileInput.files = e.dataTransfer.files;
    });
  }

  function hookupMobileNav() {
    els.mobileToggle.addEventListener('click', () => {
      const expanded = els.mobileToggle.getAttribute('aria-expanded') === 'true';
      els.mobileToggle.setAttribute('aria-expanded', String(!expanded));
      els.mainNavList.classList.toggle('open');
    });
  }

  function loadSample() {
    fetch('./sample-site.yaml').then(r => r.text()).then(t => {
      els.pasteInput.value = t;
      const pasteTab = els.loaderDialog.querySelector('.tab[data-tab="paste"]');
      pasteTab?.click();
    }).catch(() => {
      els.pasteInput.value = EMBEDDED_SAMPLE_YAML;
      const pasteTab = els.loaderDialog.querySelector('.tab[data-tab="paste"]');
      pasteTab?.click();
    });
  }

  // Wire up UI
  function init() {
    els.openLoader?.addEventListener('click', openLoaderDialog);
    els.floatingLoadBtn?.addEventListener('click', openLoaderDialog);
    els.confirmLoad?.addEventListener('click', handleConfirmLoad);
    els.cancelLoad?.addEventListener('click', closeLoaderDialog);
    els.loadSampleBtn?.addEventListener('click', loadSample);
    bindLoaderTabs();
    hookupFileDrop();
    hookupMobileNav();

    // If there is an IA provided via URL param ?sample=1, auto-load it
    const url = new URL(location.href);
    if (url.searchParams.get('sample')) {
      fetch('./sample-site.yaml').then(r => r.text()).then(loadIAFromText).catch(() => {
        loadIAFromText(EMBEDDED_SAMPLE_YAML);
      });
    }
  }

  init();
})();


