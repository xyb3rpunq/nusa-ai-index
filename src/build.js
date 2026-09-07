/**
 * Perakit situs. Satu-satunya berkas di src/ yang menyentuh disk.
 *
 *   node src/build.js            -> tulis docs/ dari data/
 *   node src/build.js --periksa  -> rakit ke memori saja, laporkan, jangan tulis
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ringkas } from './engine.js';
import { halaman } from './render.js';
import { BAHASA } from './i18n.js';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(AKAR, 'data');
const DOCS = join(AKAR, 'docs');

/** Tema yang nol karya — dicantumkan supaya celahnya terlihat, bukan hilang. */
export const TEMA_KOSONG = Object.freeze([
  'Dataset / benchmark / eval',
  'Keamanan & red-team AI',
  'Kepatuhan UU PDP',
  'Ekonomi token / biaya AI',
  'Produk dwibahasa ID/EN',
]);

const bacaJson = (nama) => JSON.parse(readFileSync(join(DATA, nama), 'utf8'));

/** Sedikitnya kolom yang wajib ada supaya halaman tidak terbit setengah jadi. */
export const KOLOM_WAJIB = Object.freeze(['id', 'title', 'category', 'page']);

export function periksaData(rows) {
  const masalah = [];
  if (!Array.isArray(rows)) return ['data/karya.json bukan array'];
  if (rows.length === 0) masalah.push('data/karya.json kosong');
  const id = new Set();
  rows.forEach((r, i) => {
    for (const k of KOLOM_WAJIB) {
      if (r[k] === undefined || r[k] === null || r[k] === '') masalah.push(`baris ${i}: kolom "${k}" kosong`);
    }
    if (id.has(r.id)) masalah.push(`id ganda: ${r.id}`);
    id.add(r.id);
    if (r.commentList) masalah.push(`baris ${i} (${r.id}): masih membawa commentList — jalankan npm run sanitize`);
  });
  return masalah;
}

export function rakit({ rows, meta }) {
  const r = ringkas(rows, {
    sekarangISO: meta.sekarangISO,
    temaKosong: TEMA_KOSONG,
    hariBerjalan: meta.hariBerjalan || {},
  });
  const keluaran = new Map();
  for (const b of BAHASA) {
    const jalur = b === 'id' ? 'index.html' : `${b}/index.html`;
    keluaran.set(jalur, halaman({ bahasa: b, rows, ringkasan: r, meta }));
  }
  return { ringkasan: r, keluaran };
}

function csv(rows) {
  const kolom = ['id', 'title', 'tagline', 'urlBersih', 'category', 'love', 'comments',
    'author', 'cityName', 'provinceName', 'createdAt', 'hidup', 'httpStatus', 'page'];
  const sel = (v) => {
    const s = String(v ?? '').replace(/[\r\n]+/g, ' ');
    return /[",;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const baris = [kolom.concat(['stars', 'tema']).join(',')];
  for (const r of rows) {
    baris.push(kolom.map((k) => sel(r[k])).concat([
      sel(r.github?.ada ? r.github.stars : ''),
      sel((r.tema || []).join('; ')),
    ]).join(','));
  }
  return baris.join('\n') + '\n';
}

function tulis(jalur, isi) {
  const penuh = join(DOCS, jalur);
  mkdirSync(dirname(penuh), { recursive: true });
  writeFileSync(penuh, isi, 'utf8');
  return { jalur, kb: Buffer.byteLength(isi, 'utf8') / 1024 };
}

function main() {
  const periksaSaja = process.argv.includes('--periksa');
  const rows = bacaJson('karya.json');
  const meta = bacaJson('meta.json');
  const builders = existsSync(join(DATA, 'builders.json')) ? bacaJson('builders.json') : [];
  meta.builder = builders.length || meta.builder || 0;

  const masalah = periksaData(rows);
  if (masalah.length) {
    console.error('data tidak lolos periksa:');
    for (const m of masalah.slice(0, 20)) console.error('  - ' + m);
    process.exitCode = 1;
    return;
  }

  const { ringkasan, keluaran } = rakit({ rows, meta });

  if (periksaSaja) {
    console.log(`periksa lolos — ${rows.length} karya, ${keluaran.size} halaman, `
      + `rerata rapor ${ringkasan.raporRerata.toFixed(1)}`);
    return;
  }

  // Berkas font di-host sendiri; CSS-nya disisipkan inline, tapi berkas woff2-nya
  // tetap harus ikut terbit atau halamannya jatuh ke font sistem tanpa tanda apa pun.
  mkdirSync(join(DOCS, 'font'), { recursive: true });
  for (const f of readdirSync(join(AKAR, 'src', 'font'))) {
    copyFileSync(join(AKAR, 'src', 'font', f), join(DOCS, 'font', f));
  }

  const ditulis = [];
  for (const [jalur, isi] of keluaran) ditulis.push(tulis(jalur, isi));
  ditulis.push(tulis('data/karya.json', JSON.stringify(rows, null, 1)));
  ditulis.push(tulis('data/ringkasan.json', JSON.stringify(ringkasan, null, 1)));
  ditulis.push(tulis('data/karya.csv', csv(rows)));
  ditulis.push(tulis('.nojekyll', ''));
  ditulis.push(tulis('robots.txt', robots(meta)));
  ditulis.push(tulis('sitemap.xml', sitemap(meta)));

  for (const d of ditulis) console.log(`  ${d.jalur.padEnd(24)} ${d.kb.toFixed(1)} KB`);
  console.log(`selesai: ${rows.length} karya, rerata rapor ${ringkasan.raporRerata.toFixed(1)}/100`);
}

export function robots(meta) {
  return [
    '# Indeks ini boleh diindeks mesin pencari.',
    '# Berkas data tidak boleh diambil sebagai bahan latih model —',
    '# sumbernya (aiclub.id) memasang Content-Signal ai-train=no.',
    'User-agent: *',
    'Content-Signal: search=yes, ai-train=no, use=reference',
    'Allow: /',
    'Disallow: /data/',
    '',
    `Sitemap: ${meta.basis}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemap(meta) {
  const url = (loc) => `<url><loc>${loc}</loc><lastmod>${meta.tanggal}</lastmod></url>`;
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + url(`${meta.basis}/`) + '\n' + url(`${meta.basis}/en/`) + '\n'
    + '</urlset>\n';
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build.js')) main();
