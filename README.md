# Site Prototyper (Graybox IA)

A lightweight static web app to turn a YAML or structured Markdown IA into a clickable graybox prototype. It renders:

- Utility navigation
- Main navigation with dropdown subnav
- Page content areas (title, description, sections)
- CTA buttons linking internally (or external links)
- Footer links

No opinionated visual design — just clean, neutral gray UI.

## Use it

1. Open `index.html` in your browser (no build step required).
2. Click "Load IA" (or the floating "IA" button) to upload a YAML file, or paste YAML/Markdown.
3. Start clicking around the generated prototype.

- Download a starter: `sample-site.yaml`.
- Append `?sample=1` to the URL to auto-load the sample.

## YAML schema

```yaml
site:
  title: Example Corp
  description: Optional
utilityNav:
  - label: Contact
    pageId: contact # or href: https://...
mainNav:
  - label: About
    pageId: about
    children:
      - label: Leadership
        pageId: leadership
pages:
  about:
    title: About
    description: Optional page goal or description
    notes:
      goals:
        - Explain who we are and why we exist
      audience: Prospects and partners
      successCriteria:
        - Clicks to Leadership
    sections:
      - heading: Hero
        description: Optional
        ctas:
          - label: Contact us
            pageId: contact # or href: https://...
footer:
  links:
    - label: Privacy
      href: https://example.com/privacy
```

- Use `pageId` for internal links; `href` for external.
- `mainNav[].children[]` creates dropdown subnavigation.

## Structured Markdown (optional)

The app can parse a simple Markdown outline if YAML isn’t handy:

```
# Site Title

## Utility
- Contact -> contact

## Navigation
- About (about)
  - Leadership (leadership)

## Pages
### About (about)
Goal: Who we are and why we exist.
Sections:
- Mission: Brief statement of purpose.
CTAs:
* Contact us -> contact

## Footer
- Privacy -> https://example.com/privacy
```

YAML is recommended for reliability and clarity.

## Notes

- Everything runs in-browser; no uploads leave your machine.
- Uses `js-yaml` for YAML parsing.
- Keep names human-readable; `pageId` should be URLish (e.g., `our-work`).

## Development

This project is static. Edit `index.html`, `styles.css`, and `app.js` to customize behaviors or neutral styling.
