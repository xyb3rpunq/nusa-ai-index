import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep as sepPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(AKAR, 'docs');

/** Semua berkas teks di docs/, sebagai pasangan [jalur relatif, isi]. */
function berkasTeks() {
  const keluar = [];
  const telusuri = (d) => {
    for (const nama of readdirSync(d)) {
      const p = join(d, nama);
      if (statSync(p).isDirectory()) { telusuri(p); continue; }
      if (!/\.(html|css|js|xml|txt|json)$/.test(nama)) continue;
      keluar.push([relative(DOCS, p).split(sepPath).join('/'), readFileSync(p, 'utf8')]);
    }
  };
  telusuri(DOCS);
  return keluar;
}

/**
 * Host luar yang boleh muncul di keluaran.
 *
 * Sengaja sangat pendek. Halaman-halaman ini mengklaim tidak melakukan permintaan
 * jaringan keluar, dan klaim itu hanya berarti kalau ada yang menjaganya: satu
 * <link> font pihak ketiga sudah cukup membuatnya tidak benar, karena setiap
 * kunjungan lalu mengirimkan alamat IP pengunjung ke server itu.
 */
const HOST_BOLEH = [
  'xyb3rpunq.github.io',   // alamat kanonik situs ini sendiri
  'github.com',            // tautan repo, bukan sumber daya yang dimuat
  'aiclub.id',             // tautan balik ke sumber data
  'www.anthropic.com', 'openai.com', 'ai.google.dev',
  'api-docs.deepseek.com', 'groq.com', 'openrouter.ai', 'lambda.ai',
  'www.sitemaps.org', 'www.w3.org',
];

test('keluaran tidak memuat satu pun sumber daya dari host pihak ketiga', () => {
  const pelanggar = [];
  for (const [jalur, isi] of berkasTeks()) {
    // Hanya atribut yang benar-benar MEMUAT sesuatu: src, href pada <link>,
    // url() di CSS, dan import di JS. href pada <a> adalah tautan, bukan pemuatan.
    const muat = [
      ...isi.matchAll(/<link\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["']/gi),
      ...isi.matchAll(/\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/gi),
      ...isi.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/gi),
      ...isi.matchAll(/\bfrom\s+["'](https?:\/\/[^"']+)["']/gi),
    ].map((m) => m[1]);
    for (const u of muat) {
      const host = (/^https?:\/\/([^/:?#]+)/i.exec(u) || [])[1];
      if (host && !HOST_BOLEH.includes(host)) pelanggar.push(`${jalur} memuat ${host}`);
    }
  }
  assert.deepEqual(pelanggar, [],
    'halaman ini mengklaim tidak melakukan permintaan jaringan keluar:\n  ' + pelanggar.join('\n  '));
});

test('font di-host sendiri, bukan diambil dari Google Fonts', () => {
  for (const [jalur, isi] of berkasTeks()) {
    for (const buruk of ['fonts.googleapis.com', 'fonts.gstatic.com']) {
      assert.ok(!isi.includes(buruk), `${jalur} masih memuat ${buruk}`);
    }
  }
});

test('setiap berkas font yang dirujuk benar-benar ada', () => {
  const hilang = [];
  for (const [jalur, isi] of berkasTeks()) {
    if (!/\.(css|html)$/.test(jalur)) continue;
    for (const m of isi.matchAll(/url\(\s*['"]?(font\/[^)'"]+)['"]?\s*\)/g)) {
      if (!existsSync(join(DOCS, m[1]))) hilang.push(`${jalur} merujuk ${m[1]}`);
    }
  }
  assert.deepEqual(hilang, []);
});

test('setiap halaman memasang Content-Security-Policy dan Referrer-Policy lewat meta', () => {
  // GitHub Pages tidak bisa menyetel header respons; dua header ini tetap
  // berlaku kalau dipasang lewat <meta>, dan itu satu-satunya jalur yang ada.
  for (const [jalur, isi] of berkasTeks()) {
    if (!jalur.endsWith('.html')) continue;
    assert.match(isi, /<meta http-equiv="Content-Security-Policy" content="[^"]+"/, `${jalur}: CSP hilang`);
    assert.match(isi, /<meta name="referrer" content="[^"]+"/, `${jalur}: Referrer-Policy hilang`);
  }
});

test('setiap halaman menyatakan apa yang dikumpulkan dan ke mana harus bertanya', () => {
  for (const [jalur, isi] of berkasTeks()) {
    if (!jalur.endsWith('.html')) continue;
    assert.ok(/id="privasi"/.test(isi), `${jalur}: bagian privasi hilang`);
    assert.ok(/mailto:/.test(isi), `${jalur}: tidak ada jalur kontak`);
  }
});
