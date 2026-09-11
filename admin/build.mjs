// 悠+設計 HYGGE DESIGN — 靜態網站產生器
// 讀取 admin/data/*.json，重新生成網站頁面。
// 用法：node admin/build.mjs
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = p => path.join(ROOT, 'admin', 'data', p);
// replace(...)：容忍 Windows 編輯器存檔時加在開頭的 BOM
const load = async p => JSON.parse((await readFile(DATA(p), 'utf8')).replace(/^﻿/, ''));

const site = await load('site.json');
const home = await load('home.json');
const about = await load('about.json');
const hygge = await load('hygge.json');
const projects = await load('projects.json');
const contact = await load('contact.json');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 置中短句用：把句子按標點切成語意段，每段包成 inline-block，
// 換行就只會發生在標點後面，不會把「我們」這種詞從中間切開
const clauses = s => String(s ?? '').split(/(?<=[，。；！？、])/).filter(Boolean)
  .map(seg => `<span class="clause">${esc(seg)}</span>`).join('');
const attr = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const pageTitle = name => name ? `${name} - ${site.brand}` : `${site.brand} - ${site.tagline}`;

function head({ title, desc, urlPath, ogImage }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc || site.description)}">
<meta name="keywords" content="${attr(site.keywords)}">
<link rel="canonical" href="${attr(site.url + urlPath)}">
<meta property="og:site_name" content="${attr(site.brand)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc || site.description)}">
<meta property="og:url" content="${attr(site.url + urlPath)}">
<meta property="og:image" content="${attr(site.url + (ogImage || home.hero.image || '/assets/img/style-cozy.jpg'))}">
<link rel="icon" href="/assets/favicon.ico" type="image/x-icon">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">`;
}

function header(active) {
  const nav = [
    ['/', '首頁'], ['/about.html', '關於'], ['/hygge.html', '設計理念'],
    ['/works.html', '作品'], ['/contact.html', '聯絡'],
  ].map(([href, label]) => `      <a href="${href}"${href === active ? ' class="active"' : ''}>${label}</a>`).join('\n');
  return `<header class="site-header">
  <div class="container">
    <a class="brand" href="/"><strong>${esc(site.brandShort)}</strong><span>Hygge Design</span></a>
    <nav class="site-nav">
${nav}
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container">
    <div class="cols">
      <div class="brandline"><img class="footer-logo" src="/assets/img/logo.png" alt=""><div>${esc(site.brandShort)}<span>Hygge Design</span></div></div>
      <div class="info">
        ${esc(site.address)}<br>
        TEL <a href="tel:${attr(site.tel.replace(/-/g, ''))}">${esc(site.tel)}</a>　·　FAX ${esc(site.fax)}<br>
        EMAIL <a href="mailto:${attr(site.email)}">${esc(site.email)}</a>
      </div>
    </div>
    <p class="copy">${esc(site.footerText)}</p>
  </div>
</footer>`;
}

const page = (headHtml, active, body, extraScript = '') => `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
${headHtml}
</head>
<body>

${header(active)}

${body}

${footer()}
${extraScript}
</body>
</html>
`;

const prose = sections => sections.map(sec =>
  (sec.heading ? `      <h3>${esc(sec.heading)}</h3>\n` : '') +
  sec.paragraphs.map(p => `      <p>${esc(p)}</p>`).join('\n')
).join('\n');

/* ---------- 首頁 ---------- */
{
  const h = home.hero;
  const styles = home.styles.map((s, i) => `      <figure class="style-card">
        <div class="ph"><img src="${attr(s.image)}" alt="${attr(s.title)}" loading="lazy"></div>
        <figcaption><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="name">${esc(s.title)}</span></figcaption>
      </figure>`).join('\n');
  const body = `<section class="hero-split">
  <div class="hero-copy">
    <div class="eyebrow">Hygge Design</div>
    <h1>${esc(h.titleLine1)}<br><em>${esc(h.titleLine2)}</em></h1>
    <p class="tag">${esc(site.tagline)}</p>
    <div class="btn-row"><a class="btn" href="/works.html">探索我們的作品</a></div>
  </div>
  <div class="hero-media">
${h.video ? `    <video autoplay muted loop playsinline preload="metadata"${h.image ? ` poster="${attr(h.image)}"` : ''}>
      <source src="${attr(h.video)}" type="video/mp4">
    </video>` : `    <img src="${attr(h.image)}" alt="">`}
  </div>
</section>

<section class="section">
  <div class="container split">
    <div class="split-head">
      <div class="eyebrow">${esc(home.about.heading)}</div>
      <h2 class="section-title">擁抱<br>Hygge 生活</h2>
    </div>
    <div>
      <div class="prose">
${home.about.paragraphs.map(p => `        <p>${esc(p)}</p>`).join('\n')}
      </div>
      <div class="btn-row"><a class="btn" href="/hygge.html">了解悠+的設計理念</a></div>
    </div>
  </div>
</section>

<section class="section alt">
  <div class="container">
    <div class="eyebrow">Nordic Styles</div>
    <h2 class="section-title">北歐風格三部曲</h2>
    <div class="style-grid">
${styles}
    </div>
  </div>
</section>

${(home.story && home.story.image) ? `<section class="teaser">
  <img src="${attr(home.story.image)}" alt="" loading="lazy">
  <div class="container">
    <div class="eyebrow">Our Story</div>
    <h2>${esc(home.story.heading)}</h2>
    <a class="btn" href="/about.html">${esc(home.story.btnLabel)}</a>
  </div>
</section>` : ''}`;

  await writeFile(path.join(ROOT, 'index.html'),
    page(head({ title: pageTitle(''), urlPath: '/' }), '/', body), 'utf8');
}

/* ---------- 關於（源起） ---------- */
{
  const imgs = about.images.filter(i => i.src);
  const imgHtml = imgs.length >= 2
    ? `    <div class="img-pair">\n${imgs.map(i => `      <img src="${attr(i.src)}" alt="${attr(i.alt)}" loading="lazy">`).join('\n')}\n    </div>`
    : imgs.length === 1 ? `    <div class="img-wide"><img src="${attr(imgs[0].src)}" alt="${attr(imgs[0].alt)}" loading="lazy"></div>` : '';

  const body = `<section class="section">
  <div class="container narrow">
    <div class="center">
      <div class="eyebrow">About</div>
      <h2 class="section-title">${esc(about.title)}</h2>
    </div>
    <div class="prose">
${prose(about.sections)}
    </div>
${imgHtml}
    <div class="center btn-row">
      <a class="btn" href="/hygge.html">進一步了解悠+的設計理念</a>
      <a class="btn" href="${attr(about.dayi.url)}" target="_blank" rel="noopener">${esc(about.dayi.text)}</a>
    </div>
  </div>
</section>

<section class="section alt">
  <div class="container narrow">
    <div class="center">
      <div class="eyebrow">${esc(about.awardsHeading)}</div>
      <h2 class="section-title">國際獎項肯定</h2>
    </div>
    <ul class="awards">
${about.awards.map(a => `      <li>${esc(a).replace(/（[^）]*）/g, m => `<span class="nowrap">${m}</span>`)}</li>`).join('\n')}
    </ul>
${about.awardsImage ? `    <div class="awards-logos"><img src="${attr(about.awardsImage)}" alt="國際設計獎項標誌" loading="lazy"></div>\n` : ''}
  </div>
</section>`;

  await writeFile(path.join(ROOT, 'about.html'),
    page(head({ title: pageTitle('關於．About'), urlPath: '/about.html' }), '/about.html', body), 'utf8');
}

/* ---------- 設計理念 ---------- */
{
  const body = `<section class="section">
  <div class="container narrow">
    <div class="center">
      <div class="eyebrow">Philosophy</div>
      <h2 class="section-title">${esc(hygge.title)}</h2>
    </div>
${hygge.image && hygge.image.src ? `    <div class="img-wide"><img src="${attr(hygge.image.src)}" alt="${attr(hygge.image.alt)}"></div>\n` : ''}    <div class="prose">
${prose(hygge.sections)}
    </div>
    <div class="center btn-row"><a class="btn" href="/about.html">了解悠+設計的源起</a></div>
  </div>
</section>`;

  await writeFile(path.join(ROOT, 'hygge.html'),
    page(head({ title: pageTitle('設計理念'), urlPath: '/hygge.html' }), '/hygge.html', body), 'utf8');
}

/* ---------- 作品列表與內頁 ---------- */
const lightboxHtml = `
<div class="lightbox" id="lightbox">
  <button class="lb-close" aria-label="關閉">×</button>
  <button class="lb-prev" aria-label="上一張">‹</button>
  <button class="lb-next" aria-label="下一張">›</button>
  <img alt="">
</div>
<script>
(function () {
  var box = document.getElementById('lightbox');
  var img = box.querySelector('img');
  var links = Array.prototype.slice.call(document.querySelectorAll('.gallery a'));
  var idx = 0;
  function show(i) {
    idx = (i + links.length) % links.length;
    img.src = links[idx].getAttribute('href');
    box.classList.add('open');
  }
  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(i); });
  });
  box.querySelector('.lb-close').addEventListener('click', function () { box.classList.remove('open'); });
  box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
  box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target === img) box.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') box.classList.remove('open');
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();
</script>`;

{
  // 網址代號只留小寫英數與連字號——它會變成檔名，不能包含路徑字元
  const items = projects.items
    .map(p => ({ ...p, slug: String(p.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '') }))
    .filter(p => p.slug && p.title);
  const cards = items.map((p, i) => `      <a class="project-card" href="/works/${attr(p.slug)}.html">
        <div class="ph"><img src="${attr(p.cover || (p.images && p.images[0]) || '')}" alt="${attr(p.title)}" loading="lazy"></div>
        <div class="cap"><span class="no">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}</div>
      </a>`).join('\n');

  const body = `<section class="section">
  <div class="container">
    <div class="center">
      <div class="eyebrow">Works</div>
      <h2 class="section-title">作品</h2>
${projects.intro ? `      <p style="color:var(--soft); letter-spacing:.12em;">${clauses(projects.intro)}</p>\n` : ''}    </div>
    <div class="project-grid">
${cards}
    </div>
  </div>
</section>`;

  await writeFile(path.join(ROOT, 'works.html'),
    page(head({ title: pageTitle('作品'), urlPath: '/works.html', ogImage: items[0] && items[0].cover }), '/works.html', body), 'utf8');

  // 內頁：先清掉舊檔，案例在後台被刪除或改名時才不會留下殘頁
  const worksDir = path.join(ROOT, 'works');
  await mkdir(worksDir, { recursive: true });
  for (const f of await readdir(worksDir)) if (f.endsWith('.html')) await unlink(path.join(worksDir, f));

  for (const p of items) {
    const gallery = (p.images || []).map(src =>
      `      <a href="${attr(src)}"><img src="${attr(src)}" alt="${attr(p.title)}" loading="lazy"></a>`).join('\n');
    const body = `<section class="section">
  <div class="container">
    <div class="center">
      <div class="eyebrow">Works</div>
      <h2 class="section-title">${esc(p.title)}</h2>
${p.subtitle ? `      <p style="color:var(--soft);">${esc(p.subtitle)}</p>\n` : ''}    </div>
${p.desc ? `    <div class="prose narrow" style="margin:0 auto;"><p>${esc(p.desc)}</p></div>\n` : ''}    <div class="gallery">
${gallery}
    </div>
    <a class="back-link" href="/works.html">← 回作品列表</a>
  </div>
</section>`;
    await writeFile(path.join(worksDir, p.slug + '.html'),
      page(head({ title: pageTitle(p.title), urlPath: `/works/${p.slug}.html`, ogImage: p.cover }), '/works.html', body, lightboxHtml), 'utf8');
  }
}

/* ---------- 聯絡 ---------- */
{
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.mapQuery)}`;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(contact.mapQuery)}&hl=zh-TW&z=16&output=embed`;
  const mapHtml = contact.mapImage
    ? `      <div>
        <a class="map-illustration" href="${attr(mapsUrl)}" target="_blank" rel="noopener"><img src="${attr(contact.mapImage)}" alt="${attr(contact.mapLabel)} 位置地圖"></a>
        <div class="btn-row center"><a class="btn" href="${attr(mapsUrl)}" target="_blank" rel="noopener">開啟 Google Maps</a></div>
      </div>`
    : `      <div class="map-frame">
        <iframe src="${attr(mapSrc)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${attr(contact.mapLabel)} 地圖"></iframe>
      </div>`;
  const body = `<section class="section">
  <div class="container">
    <div class="center">
      <div class="eyebrow">${esc(contact.heading)}</div>
      <h2 class="section-title">${esc(contact.subheading)}</h2>
${contact.paragraph ? `      <p style="color:var(--soft);">${clauses(contact.paragraph)}</p>\n` : ''}    </div>
    <div class="contact-grid">
      <ul class="contact-list">
        <li><span class="k">Address</span><span>${esc(site.address)}</span></li>
        <li><span class="k">Tel</span><a href="tel:${attr(site.tel.replace(/-/g, ''))}">${esc(site.tel)}</a></li>
        <li><span class="k">Fax</span><span>${esc(site.fax)}</span></li>
        <li><span class="k">Email</span><a href="mailto:${attr(site.email)}">${esc(site.email)}</a></li>
      </ul>
${mapHtml}
    </div>
  </div>
</section>`;

  await writeFile(path.join(ROOT, 'contact.html'),
    page(head({ title: pageTitle('聯絡'), urlPath: '/contact.html' }), '/contact.html', body), 'utf8');
}

/* ---------- 404、robots、sitemap、CNAME ---------- */
{
  const body = `<section class="section">
  <div class="container narrow center">
    <div class="eyebrow">404</div>
    <h2 class="section-title">找不到這個頁面</h2>
    <p style="color:var(--soft);">您要找的頁面可能已移動或不存在。</p>
    <div class="btn-row center"><a class="btn" href="/">回到首頁</a></div>
  </div>
</section>`;
  await writeFile(path.join(ROOT, '404.html'),
    page(head({ title: pageTitle('找不到頁面'), urlPath: '/404.html' }), '', body), 'utf8');

  const urls = ['/', '/about.html', '/hygge.html', '/works.html', '/contact.html',
    ...projects.items
      .map(p => String(p.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(Boolean).map(s => `/works/${s}.html`)];
  const today = new Date().toISOString().slice(0, 10);
  await writeFile(path.join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${site.url}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`, 'utf8');

  await writeFile(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /weebly-backup/\nSitemap: ${site.url}/sitemap.xml\n`, 'utf8');

  await writeFile(path.join(ROOT, 'CNAME'), 'www.hyggedesign.tw\n', 'utf8');
}

console.log('網站已重新產生完成。');
