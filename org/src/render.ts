import type { Catalog } from "./catalog.ts";
import { DEFAULT_LOCALE, LOCALES, SITE_ORIGIN, getLocale, localePath } from "./locales.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function hreflangLinks(tag: string, pagePath = "/"): string {
  const links = LOCALES.map((locale) => {
    const href = `${SITE_ORIGIN}${localePath(locale.tag, pagePath)}`;
    return `  <link rel="alternate" hreflang="${escapeHtml(locale.tag)}" href="${escapeHtml(href)}">`;
  });
  const defaultHref = `${SITE_ORIGIN}${localePath(DEFAULT_LOCALE, pagePath)}`;
  links.push(`  <link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultHref)}">`);
  const canonical = `${SITE_ORIGIN}${localePath(tag, pagePath)}`;
  links.unshift(`  <link rel="canonical" href="${escapeHtml(canonical)}">`);
  return links.join("\n");
}

export function languageSwitcher(tag: string, catalog: Catalog, pagePath = "/"): string {
  const current = getLocale(tag);
  const items = LOCALES.map((locale) => {
    const href = localePath(locale.tag, pagePath);
    const currentAttr = locale.tag === tag ? ' aria-current="page" data-current="true"' : "";
    return `        <li><a hreflang="${escapeHtml(locale.tag)}" lang="${escapeHtml(locale.tag)}" href="${escapeHtml(href)}"${currentAttr}>${escapeHtml(locale.label)}</a></li>`;
  }).join("\n");
  return `<nav class="switcher" translate="no" lang="en" dir="ltr" aria-label="${escapeHtml(catalog.language)}">
      <details>
        <summary data-language-selector-opener aria-label="${escapeHtml(`${catalog.language}: ${current.label}`)}"><span data-language-selector-current>${escapeHtml(current.label)}</span></summary>
        <div class="switcher-panel">
          <p class="switcher-search-hint">${escapeHtml(catalog.searchLanguages)}</p>
          <ul>
${items}
          </ul>
        </div>
      </details>
    </nav>`;
}

const PAGE_CSS = `html{color-scheme:light dark}
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:#fff;color:#1a1a1a}
@media (prefers-color-scheme:dark){body{background:#1a1a1a;color:#f2f2f2}}
main,header{max-width:48rem;margin-inline:auto;padding:1.25rem}
header{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;border-bottom:1px solid #ccc}
h1{font-size:1.75rem;line-height:1.3}
.lead{font-size:1.1rem}
.claims{padding-inline-start:1.2rem}
.note{border-inline-start:4px solid #3460fb;padding-inline-start:1rem;color:#333}
@media (prefers-color-scheme:dark){.note{color:#ddd}}
.switcher details{position:relative}
.switcher summary{cursor:pointer;min-height:44px;display:flex;align-items:center}
.switcher-panel{position:absolute;inset-inline-end:0;z-index:2;background:#fff;color:#1a1a1a;border:1px solid #999;border-radius:.5rem;padding:.75rem;max-height:70dvh;overflow:auto;min-width:16rem}
@media (prefers-color-scheme:dark){.switcher-panel{background:#111;color:#f2f2f2}}
.switcher ul{list-style:none;margin:0;padding:0}
.switcher a{display:flex;align-items:center;min-height:44px;padding-inline:.25rem}
.switcher a[aria-current="page"]{font-weight:700}
code{font-family:ui-monospace,monospace}`;

export function renderPage(tag: string, catalog: Catalog, pagePath = "/"): string {
  const locale = getLocale(tag);
  const dirAttr = locale.dir === "rtl" ? ' dir="rtl"' : "";
  return `<!DOCTYPE html>
<html lang="${escapeHtml(tag)}"${dirAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(catalog.title)}</title>
  <meta name="description" content="${escapeHtml(catalog.description)}">
${hreflangLinks(tag, pagePath)}
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header>
    <a href="${escapeHtml(localePath(tag, "/"))}">Kotoba</a>
    ${languageSwitcher(tag, catalog, pagePath)}
  </header>
  <main>
    <p class="kicker">${escapeHtml(catalog.hero)}</p>
    <h1>${escapeHtml(catalog.title)}</h1>
    <p class="lead">${escapeHtml(catalog.description)}</p>
    <ul class="claims">
      <li>${escapeHtml(catalog.noAmbient)}</li>
      <li>${escapeHtml(catalog.grantNarrowly)}</li>
    </ul>
    <p><a href="https://github.com/kotoba-lang/kotoba-lang">${escapeHtml(catalog.browseRepo)}</a> (${escapeHtml(catalog.github)})</p>
    <p class="note">${escapeHtml(catalog.authorityNote)}</p>
  </main>
</body>
</html>
`;
}

export function emitTags(html: string): string[] {
  return [...html.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]);
}
