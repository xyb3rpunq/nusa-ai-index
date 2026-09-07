/**
 * Pemeriksaan atas apa yang BENAR-BENAR terbit di docs/.
 *
 * Sengaja satu berkas: `node --test` menjalankan berkas uji secara paralel, dan
 * uji determinisme di bawah menjalankan build yang menulis ulang seluruh docs/.
 * Kalau pemeriksaan isinya berada di berkas terpisah, ia bisa membaca berkas
 * yang baru dipotong dan belum ditulis ulang — kegagalan yang muncul-hilang
 * tergantung versi Node. Uji di dalam satu berkas berjalan berurutan.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep as sepPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(AKAR, 'docs');

/** Sidik seluruh isi docs/: jalur relatif + isinya, diurutkan supaya stabil. */
function sidikDocs() {
  const berkas = [];
  const telusuri = (d) => {
    for (const nama of readdirSync(d).sort()) {
      const p = join(d, nama);
      if (statSync(p).isDirectory()) telusuri(p);
      else berkas.push(p);
    }
  };
  telusuri(DOCS);
  const h = createHash('sha256');
  for (const p of berkas) {
    h.update(relative(DOCS, p).split(sepPath).join('/'));
    h.update(readFileSync(p));
  }
  return { sidik: h.digest('hex'), jumlah: berkas.length };
}

function bangun() {
  execFileSync(process.execPath, ['src/build.js'], { cwd: AKAR, stdio: 'pipe' });
}

test('build deterministik: dua kali jalan menghasilkan docs/ yang identik', () => {
  bangun();
  const pertama = sidikDocs();
  bangun();
  const kedua = sidikDocs();
  assert.equal(kedua.jumlah, pertama.jumlah, 'jumlah berkas berubah antar build');
  assert.equal(kedua.sidik, pertama.sidik,
    'isi docs/ berubah padahal tidak ada yang disunting — ada sumber ketidaktentuan '
    + '(jam mesin, waktu eksekusi, atau urutan yang tidak stabil) yang bocor ke keluaran');
});

test('build tidak membaca jam mesin', () => {
  const kode = readFileSync(join(AKAR, 'src', 'build.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const pola of [/new Date\(/, /Date\.now\(/, /performance\.now\(/]) {
    assert.ok(!pola.test(kode),
      `build.js membaca jam mesin (${pola}) — keluarannya jadi berubah tiap hari`);
  }
});

test('keluaran tidak memuat cap waktu selain tanggal terbit yang dicatat', () => {
  const sidikWaktu = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const telusuri = (d) => {
    for (const nama of readdirSync(d)) {
      const p = join(d, nama);
      if (statSync(p).isDirectory()) { telusuri(p); continue; }
      // Berkas di data/ adalah data terbitan: isinya boleh memuat tanggal yang
      // memang berasal dari sumbernya (misalnya tanggal karya dibuat). Keterulangannya
      // sudah dijamin uji sidik-ganda di atas; yang dijaga di sini adalah artefak
      // yang DIRENDER build, tempat jam mesin biasanya bocor.
      if (relative(DOCS, p).split(sepPath).join('/').startsWith('data/')) continue;
      if (!/\.(html|xml|txt|css|js)$/.test(nama)) continue;
      const isi = readFileSync(p, 'utf8');
      const m = isi.match(sidikWaktu);
      assert.equal(m, null,
        `${relative(DOCS, p)} memuat cap waktu "${m && m[0]}" — keluaran jadi tidak bisa diulang`);
    }
  };
  telusuri(DOCS);
});

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
