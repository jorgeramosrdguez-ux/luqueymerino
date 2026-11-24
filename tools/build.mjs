#!/usr/bin/env node
// Genera las páginas HTML del sitio a partir de src/ (sin dependencias).
//
//   node tools/build.mjs
//
// Cada página de src/pages/ empieza con un bloque <!--META {json} META-->
// (ruta, título, descripción, migas de pan…) seguido de su contenido. El
// script le añade la cabecera, el menú, el pie, los datos estructurados y
// escribe el HTML final en la raíz del proyecto, que es lo que publica
// Vercel tal cual (sin paso de compilación). También rehace sitemap.xml.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.luqueymerino.com";
const TODAY = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const WA_NUMBER = "34679381294";
const MAX_TITLE = 60;
const MAX_DESC = 155;

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const waUrl = (text) => "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);

/* ---------- Datos del negocio (JSON-LD) ---------- */
const BUSINESS = {
  "@context": "https://schema.org",
  "@type": "HomeGoodsStore",
  "@id": SITE + "/#tienda",
  "name": "Luque & Merino Decoración",
  "url": SITE + "/",
  "logo": SITE + "/img/logo.png",
  "image": SITE + "/img/icon-512.png",
  "description": "Tienda de ropa de hogar en Alcorcón: cortinas y estores a medida con medición e instalación a domicilio en toda la Comunidad de Madrid, ropa de cama, baño, mantelerías, textil de bebé y bordado personalizado.",
  "telephone": "+34916104731",
  "email": "luqueymerino@hotmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle Sapporo, 20",
    "addressLocality": "Alcorcón",
    "postalCode": "28923",
    "addressRegion": "Madrid",
    "addressCountry": "ES"
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "10:00", "closes": "14:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "17:00", "closes": "20:30" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "14:00" }
  ],
  "areaServed": [
    { "@type": "City", "name": "Alcorcón" },
    { "@type": "AdministrativeArea", "name": "Comunidad de Madrid" }
  ],
  "hasMap": "https://www.google.com/maps?cid=4009134602118971671",
  // Instagram: se añadirá aquí cuando la tienda nos dé su cuenta real
  "sameAs": ["https://www.facebook.com/luqueymerino/"]
};

/* ---------- Filtros de las páginas de categoría ----------
   Un producto aparece en la página si su categoría del panel contiene alguna
   palabra de "cats" o su nombre alguna de "words", y su categoría no contiene
   ninguna de "not". Se comparan sin tildes ni mayúsculas. */
const FILTERS = {
  "ropa-de-cama": { cats: ["ropa-de-cama", "ropa de cama"], words: ["sabana", "nordic", "edredon", "colcha", "manta", "plaid", "almohad", "bajera", "encimera", "juego de cama", "cojin", "boutis"], not: ["colchon", "bebe", "infantil", "cuna", "cortina"] },
  "toallas": { cats: ["toalla", "albornoz", "bano"], words: ["toalla", "albornoz", "alfombra de bano"], not: ["bebe", "infantil", "cuna"] },
  "mantelerias": { cats: ["mantel"], words: ["mantel", "servillet", "camino de mesa"], not: [] },
  "bebe": { cats: ["bebe", "infantil", "cuna"], words: ["bebe", "cuna", "arrullo", "canastilla", "babero", "infantil", "capita"], not: [] },
  "colchon": { cats: ["colchon", "protector"], words: ["protector", "cubrecolchon", "colchon"], not: [] },
  "cortinas": { cats: ["cortina", "estor"], words: ["cortina", "estor", "visillo", "panel japones", "paqueto", "paquetto"], not: [] }
};

/* ---------- Iconos reutilizables ---------- */
const ICONS = {
  wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.523 5.26l-.999 3.648 3.966-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'
};

/* ---------- Lectura de las páginas ---------- */
function parsePage(file) {
  const raw = read("src/pages/" + file);
  const m = raw.match(/^<!--META\s*([\s\S]*?)\s*META-->\s*/);
  if (!m) throw new Error(file + ": falta el bloque <!--META ... META-->");
  const meta = JSON.parse(m[1]);
  meta.file = file;
  meta.body = raw.slice(m[0].length);
  return meta;
}
const pages = readdirSync(join(ROOT, "src/pages")).filter((f) => f.endsWith(".html")).sort().map(parsePage);
const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));

/* ---------- Comprobaciones SEO ---------- */
const problems = [];
const seen = new Set();
for (const p of pages) {
  if (seen.has(p.path)) problems.push(p.file + ": ruta repetida " + p.path);
  seen.add(p.path);
  if ([...p.title].length > MAX_TITLE) problems.push(`${p.file}: título de ${[...p.title].length} caracteres (máx. ${MAX_TITLE})`);
  if ([...p.description].length > MAX_DESC) problems.push(`${p.file}: descripción de ${[...p.description].length} caracteres (máx. ${MAX_DESC})`);
  if (!/<h1[\s>]/.test(p.body)) problems.push(p.file + ": no tiene <h1>");
  if ((p.body.match(/<h1[\s>]/g) || []).length > 1) problems.push(p.file + ": tiene más de un <h1>");
}
if (problems.length) {
  console.error("No se ha generado nada por estos problemas:\n - " + problems.join("\n - "));
  process.exit(1);
}

/* ---------- Piezas comunes ---------- */
const canonical = (p) => SITE + (p.path === "/" ? "/" : p.path);

function jsonLd(obj) {
  return '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + "\n</script>";
}

function breadcrumbsJson(p) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": p.crumbs.map(([name, path], i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": name,
      "item": SITE + (path || p.path).replace(/^\/$/, "/")
    }))
  };
}

function head(p) {
  const blocks = [];
  if ((p.schema || []).includes("localbusiness")) blocks.push(jsonLd(BUSINESS));
  if (p.service) blocks.push(jsonLd({
    "@context": "https://schema.org",
    "@type": "Service",
    "url": canonical(p),
    "areaServed": BUSINESS.areaServed,
    "provider": { "@type": "HomeGoodsStore", "@id": BUSINESS["@id"], "name": BUSINESS.name, "telephone": BUSINESS.telephone, "address": BUSINESS.address },
    ...p.service
  }));
  if (p.crumbs && p.crumbs.length > 1) blocks.push(jsonLd(breadcrumbsJson(p)));
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}" />
  <meta name="theme-color" content="#7d1f2e" />
  <link rel="canonical" href="${canonical(p)}" />

  <!-- Open Graph / redes sociales -->
  <meta property="og:type" content="${p.ogType || "website"}" />
  <meta property="og:site_name" content="Luque &amp; Merino Decoración" />
  <meta property="og:title" content="${esc(p.ogTitle || p.title)}" />
  <meta property="og:description" content="${esc(p.description)}" />
  <meta property="og:url" content="${canonical(p)}" />
  <!-- TODO: sustituir por una foto real de la tienda (1200×630, JPG) cuando la tengamos -->
  <meta property="og:image" content="${SITE}/img/icon-512.png" />
  <meta property="og:locale" content="es_ES" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Great+Vibes&family=Yellowtail&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png" />
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
${blocks.map((b) => "  " + b.replace(/\n/g, "\n  ")).join("\n")}
</head>`;
}

function header(p) {
  // Marca el enlace de la sección en la que estamos
  return read("src/partials/header.html").replace(/\{\{nav:(\w+)\}\}/g, (_, key) =>
    p.nav === key ? ' aria-current="page"' : "");
}

function breadcrumbs(p) {
  if (!p.crumbs || p.crumbs.length < 2) return "";
  const items = p.crumbs.map(([name, path], i) => {
    const last = i === p.crumbs.length - 1;
    return last
      ? `<li aria-current="page">${esc(name)}</li>`
      : `<li><a href="${path}">${esc(name)}</a></li>`;
  }).join("");
  return `<nav class="crumbs" aria-label="Estás en"><div class="container"><ol>${items}</ol></div></nav>`;
}

function cta(p, text) {
  const wa = waUrl(text || p.waText || "Hola Luque & Merino, quería hacer una consulta");
  return `<section class="cta cta--page">
      <div class="container cta__inner cta__inner--page">
        <div class="cta__text">
          <span class="eyebrow eyebrow--light">¿Te ayudamos?</span>
          <h2 class="section__title">${esc(p.ctaTitle || "Pregúntanos sin compromiso")}</h2>
          <p>${p.ctaText || "Escríbenos por WhatsApp, llámanos a la tienda o pásate por Calle Sapporo, 20, en Alcorcón. Te atendemos encantados."}</p>
          <div class="cta__quick">
            <a class="btn btn--wa btn--whatsapp" href="${wa}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp: 679 381 294</a>
            <a class="btn btn--call" href="tel:+34916104731">${ICONS.phone}Llamar: 91 610 47 31</a>
            <a class="btn btn--ghost btn--ghost-light" href="/contacto-y-como-llegar">${ICONS.pin}Cómo llegar a la tienda</a>
          </div>
        </div>
      </div>
    </section>`;
}

function related(list) {
  const cards = list.split(",").map((s) => s.trim()).filter(Boolean).map((path) => {
    const t = byPath[path];
    if (!t) throw new Error("Enlace relacionado a una página que no existe: " + path);
    const link = t.link || { text: t.h1 || t.title, desc: t.description };
    return `<a class="related__card" href="${path}"><strong>${esc(link.text)}</strong><span>${esc(link.desc)}</span></a>`;
  }).join("\n          ");
  return `<section class="related">
      <div class="container">
        <h2 class="related__title">También te puede interesar</h2>
        <div class="related__grid">
          ${cards}
        </div>
      </div>
    </section>`;
}

function products(key, p) {
  const f = FILTERS[key];
  if (!f) throw new Error("Filtro de productos desconocido: " + key);
  const empty = p.emptyText || "Ahora mismo no tenemos productos de esta sección publicados en la web. Pásate por la tienda o pregúntanos por <a href=\"" + waUrl(p.waText || "Hola, quería información") + "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> y te enseñamos lo que hay.";
  return `<section class="section section--tint page-products" id="productos">
      <div class="container">
        <header class="section__head">
          <span class="eyebrow">En la tienda</span>
          <h2 class="section__title">${esc(p.productsTitle || "Algunos de nuestros productos")}</h2>
          <p class="section__sub">Pulsa un producto para ver sus fotos, colores y medidas. Los productos se cargan del catálogo de la tienda.</p>
        </header>
        <div class="products" id="catalog" data-page-filter='${JSON.stringify(f)}' data-empty="${esc(empty)}">
          <p class="catalog-msg">Cargando productos…</p>
        </div>
        <p class="page-products__more"><a href="/#catalogo">Ver el catálogo completo de la tienda</a></p>
      </div>
    </section>`;
}

// Tarjeta lateral de ayuda rápida (se queda fija al bajar en ordenador)
function aside(p) {
  return `<aside class="aside-card" aria-label="Contacto rápido">
          <h2>¿Te ayudamos?</h2>
          <p>Te atendemos en la tienda, por teléfono o por WhatsApp.</p>
          <ul>
            <li>📍 Calle Sapporo, 20 · Alcorcón</li>
            <li>🕒 L–V 10–14 h y 17–20:30 h · S 10–14 h</li>
          </ul>
          <a class="btn btn--wa btn--whatsapp" href="${waUrl(p.waText || "Hola Luque & Merino, quería hacer una consulta")}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp: 679 381 294</a>
          <a class="btn btn--call" href="tel:+34916104731">${ICONS.phone}Llamar: 91 610 47 31</a>
          <a class="btn btn--ghost" href="/contacto-y-como-llegar">Cómo llegar</a>
        </aside>`;
}

function body(p) {
  return p.body
    .replace(/\{\{aside\}\}/g, () => aside(p))
    .replace(/\{\{icon:(\w+)\}\}/g, (_, k) => ICONS[k] || "")
    .replace(/\{\{waurl:([^}]+)\}\}/g, (_, t) => waUrl(t))
    .replace(/\{\{cta(?::([^}]+))?\}\}/g, (_, t) => cta(p, t))
    .replace(/\{\{related:([^}]+)\}\}/g, (_, l) => related(l))
    .replace(/\{\{products:([\w-]+)\}\}/g, (_, k) => products(k, p));
}

function render(p) {
  return `<!DOCTYPE html>
<!-- Archivo generado con tools/build.mjs a partir de src/pages/${p.file}. No editar aquí. -->
<html lang="es">
${head(p)}
<body>
${header(p)}
  ${breadcrumbs(p)}
  <main id="contenido"${p.mainClass ? ` class="${p.mainClass}"` : ""}>
${body(p)}
  </main>
${read("src/partials/footer.html")}
${read("src/partials/tail.html")}
</body>
</html>
`;
}

/* ---------- Escritura ---------- */
for (const p of pages) {
  const out = join(ROOT, p.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, render(p));
}

const urls = pages.filter((p) => p.sitemap !== false).map((p) => `  <url>
    <loc>${canonical(p)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${p.changefreq || "monthly"}</changefreq>
    <priority>${p.priority || "0.6"}</priority>
  </url>`).join("\n");
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

console.log(`Generadas ${pages.length} páginas y sitemap.xml (${pages.filter((p) => p.sitemap !== false).length} URLs, lastmod ${TODAY}).`);
for (const p of pages) console.log(`  ${p.path.padEnd(42)} → ${p.out}  (título ${[...p.title].length}, desc. ${[...p.description].length})`);
