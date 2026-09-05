#!/usr/bin/env node

/**
 * Builds the local, standalone review gallery for revision-v* media.
 *
 * The scanner only reads MP4/WebM files. It writes HTML and JSON indexes;
 * it never moves, rewrites, or deletes media.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputsDir = path.join(projectRoot, 'outputs');
const htmlPath = path.join(outputsDir, 'evolucion.html');
const manifestPath = path.join(outputsDir, 'evolucion-manifest.json');
const mediaExtensions = new Set(['.mp4', '.webm']);
const categoryOrder = ['golpes', 'remates', 'paredes', 'celebraciones', 'bancos', 'camisetas', 'demo-táctica', 'femenino'];

const categoryLabels = {
  'golpes': 'Golpes',
  'remates': 'Remates',
  'paredes': 'Paredes',
  'celebraciones': 'Celebraciones',
  'bancos': 'Bancos',
  'camisetas': 'Camisetas',
  'demo-táctica': 'Demo táctica',
  'femenino': 'Femenino',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function categoryFor(stem) {
  const name = stem.toLocaleLowerCase('es');
  if (/femenin[oa]/u.test(name)) return 'femenino';
  if (/celebr|reaccion|victoria|festej/u.test(name)) return 'celebraciones';
  if (/banquillo|banco/u.test(name)) return 'bancos';
  if (/camiseta|remera/u.test(name)) return 'camisetas';
  if (/pared/u.test(name)) return 'paredes';
  if (/remate|smash/u.test(name)) return 'remates';
  if (/demo|tactic/u.test(name)) return 'demo-táctica';
  return 'golpes';
}

async function scanFiles(directory, relative = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
    const absolute = path.join(directory, entry.name);
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await scanFiles(absolute, nextRelative));
    else if (mediaExtensions.has(path.extname(entry.name).toLocaleLowerCase('en-US'))) files.push({ absolute, relative: nextRelative });
  }
  return files;
}

async function digestFile(absolute) {
  const data = await fs.readFile(absolute);
  return { sizeBytes: data.byteLength, sha256: createHash('sha256').update(data).digest('hex') };
}

function slash(value) { return value.split(path.sep).join('/'); }

async function buildRegistry() {
  const entries = await fs.readdir(outputsDir, { withFileTypes: true });
  const revisionDirs = entries
    .filter((entry) => entry.isDirectory() && /^revision-v\d+$/u.test(entry.name))
    .sort((a, b) => Number(a.name.slice(10)) - Number(b.name.slice(10)));
  const versions = [];
  const media = [];

  for (const revisionDir of revisionDirs) {
    const version = revisionDir.name;
    const files = await scanFiles(path.join(outputsDir, version));
    const grouped = new Map();
    for (const file of files) {
      const relFromVersion = slash(file.relative);
      const parsed = path.parse(relFromVersion);
      const key = relFromVersion.replace(/\.(mp4|webm)$/iu, '');
      const relativePath = slash(path.relative(projectRoot, file.absolute));
      const htmlRelativePath = slash(path.relative(outputsDir, file.absolute));
      const integrity = await digestFile(file.absolute);
      const record = { relativePath, htmlRelativePath, filename: parsed.base, extension: parsed.ext.slice(1).toLowerCase(), ...integrity };
      media.push({ version, ...record });
      if (!grouped.has(key)) grouped.set(key, { key, filename: path.basename(key), takePath: path.dirname(relFromVersion) === '.' ? '' : path.dirname(relFromVersion), files: {} });
      grouped.get(key).files[record.extension] = record;
    }
    const takes = [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key, 'es')).map((take) => {
      const title = take.filename;
      return {
        id: `${version}/${take.key}`,
        title,
        filename: take.filename,
        version,
        versionLabel: version.replace('revision-', '').toUpperCase(),
        outtake: take.takePath.split('/').includes('outtakes'),
        category: categoryFor(title),
        mp4: take.files.mp4 ?? null,
        webm: take.files.webm ?? null,
      };
    });
    versions.push({ id: version, label: version.replace('revision-', '').toUpperCase(), order: Number(version.slice(10)), takes });
  }
  return { generatedAt: new Date().toISOString(), mediaRoot: 'outputs', categoryOrder, versions, media };
}

function renderTake(take) {
  const playback = take.mp4
    ? `<video controls preload="metadata" src="${escapeHtml(take.mp4.htmlRelativePath)}"></video>`
    : '<div class="missing">Sin MP4 de revisión todavía</div>';
  const webm = take.webm
    ? `<a class="original" href="${escapeHtml(take.webm.htmlRelativePath)}" download>WebM original · descargar</a>`
    : '<span class="muted">Sin WebM registrado</span>';
  const mp4 = take.mp4
    ? `<a class="download" href="${escapeHtml(take.mp4.htmlRelativePath)}" download>Descargar MP4</a>`
    : '';
  return `<article class="card" data-version="${escapeHtml(take.version)}" data-category="${escapeHtml(take.category)}" data-outtake="${take.outtake ? 'true' : 'false'}">
    <div class="card-head"><span class="badge">${escapeHtml(take.versionLabel)}</span>${take.outtake ? '<span class="outtake">OUTTAKE</span>' : ''}<span class="category">${escapeHtml(categoryLabels[take.category])}</span></div>
    <h3>${escapeHtml(take.title)}</h3><p class="filename">${escapeHtml(take.filename)}</p>${playback}<div class="links">${mp4}${webm}</div>
  </article>`;
}

function renderHtml(registry) {
  const sections = registry.versions.map((version) => {
    const phase = version.order === Math.min(...registry.versions.map((item) => item.order)) ? 'antes' : 'después';
    return `<section class="version-section" data-section-version="${escapeHtml(version.id)}"><h2>${escapeHtml(version.label)} · ${phase}</h2><div class="grid">${version.takes.map(renderTake).join('\n')}</div></section>`;
  }).join('\n');
  const versionOptions = registry.versions.map((version) => `<option value="${escapeHtml(version.id)}">${escapeHtml(version.label)}</option>`).join('');
  const categoryOptions = categoryOrder.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(categoryLabels[category])}</option>`).join('');
  const embedded = JSON.stringify({ generatedAt: registry.generatedAt, versions: registry.versions.map(({ id, label, order, takes }) => ({ id, label, order, takes: takes.map(({ id, title, version, category, outtake }) => ({ id, title, version, category, outtake })) })) });
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Premier Padel · Evolución de revisiones</title>
<style>:root{color-scheme:dark;--bg:#07130f;--panel:#0e211a;--line:#204c39;--green:#00bc6f;--text:#e8fff2;--muted:#9fb7aa}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,sans-serif}main{max-width:1440px;margin:auto;padding:32px 22px 56px}h1{margin:0 0 6px;font-size:clamp(26px,4vw,44px)}h2{margin:32px 0 14px;color:var(--green);font-size:22px}.intro,.meta,.muted{color:var(--muted)}.controls{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0;padding:14px;background:var(--panel);border:1px solid var(--line);border-radius:10px}label{display:flex;align-items:center;gap:8px;color:var(--muted)}select{background:#081810;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:8px 10px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:hidden}.card-head{display:flex;align-items:center;gap:7px;min-height:24px}.badge,.outtake,.category{font-size:11px;letter-spacing:.08em;text-transform:uppercase}.badge{color:var(--bg);background:var(--green);border-radius:4px;padding:2px 6px;font-weight:700}.outtake{color:#ffd27d}.category{color:var(--muted);margin-left:auto}.card h3{margin:10px 0 0;font-size:19px}.filename{margin:3px 0 12px;color:var(--muted);font:12px ui-monospace,SFMono-Regular,monospace;overflow-wrap:anywhere}.card video{display:block;width:100%;aspect-ratio:16/9;background:#020806;border-radius:6px}.missing{display:grid;place-items:center;aspect-ratio:16/9;background:#07130f;border:1px dashed var(--line);border-radius:6px;color:var(--muted);text-align:center;padding:12px}.links{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;font-size:13px}.links a{color:var(--green);text-decoration:none}.links a:hover{text-decoration:underline}.count{color:var(--muted);margin:0}.empty{display:none;color:var(--muted);padding:28px 0}.manifest{color:var(--muted);font-size:12px;margin-top:30px}</style></head><body><main><h1>Premier Padel · Evolución</h1><p class="intro">Registro local de revisiones y tomas. V7 antes · V8 después. Los videos no se reproducen automáticamente.</p>
<div class="controls"><label>Versión <select id="version"><option value="all">Todas</option>${versionOptions}</select></label><label>Categoría <select id="category"><option value="all">Todas</option>${categoryOptions}</select></label><label><input id="outtakes" type="checkbox"> Sólo outtakes</label></div><p class="count" id="count"></p><div id="gallery">${sections}</div><p class="empty" id="empty">No hay tomas para estos filtros.</p><p class="manifest">Índice de integridad generado: <time>${escapeHtml(registry.generatedAt)}</time> · <a class="original" href="evolucion-manifest.json">manifest JSON con SHA-256</a></p></main><script>const registry=${embedded};const cards=[...document.querySelectorAll('.card')];const versionSections=[...document.querySelectorAll('.version-section')];const version=document.querySelector('#version'),category=document.querySelector('#category'),outtakes=document.querySelector('#outtakes'),count=document.querySelector('#count'),empty=document.querySelector('#empty');function filter(){let n=0;for(const card of cards){const show=(version.value==='all'||card.dataset.version===version.value)&&(category.value==='all'||card.dataset.category===category.value)&&(!outtakes.checked||card.dataset.outtake==='true');card.style.display=show?'':'none';if(show)n++}for(const section of versionSections){section.style.display=[...section.querySelectorAll('.card')].some((card)=>card.style.display!=='none')?'':'none'}count.textContent=n+' toma'+(n===1?'':'s')+' visible'+(n===1?'':'s');empty.style.display=n?'none':'block'}[version,category,outtakes].forEach((el)=>el.addEventListener('change',filter));filter();</script></body></html>`;
}

const registry = await buildRegistry();
await fs.writeFile(manifestPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
await fs.writeFile(htmlPath, renderHtml(registry), 'utf8');
const takeCount = registry.versions.reduce((sum, version) => sum + version.takes.length, 0);
console.log(`Generado ${slash(path.relative(projectRoot, htmlPath))} y ${slash(path.relative(projectRoot, manifestPath))}`);
console.log(`${registry.versions.length} versiones · ${takeCount} tomas · ${registry.media.filter((item) => item.extension === 'mp4').length} MP4 · ${registry.media.filter((item) => item.extension === 'webm').length} WebM`);
