import test from 'node:test';
import assert from 'node:assert/strict';
import { halaman, GAYA, SKRIP } from '../src/render.js';
import { ringkas } from '../src/engine.js';
import { BAHASA } from '../src/i18n.js';

const META = {
  tanggal: '2026-09-05', sekarangISO: '2026-09-05T00:00:00.000Z',
  basis: 'https://contoh.github.io/nusa-ai-index',
  karyaDiklaim: 296, loveDiklaim: 382, builder: 147, hariBerjalan: { '2026-09': 5 },
};

const ROWS = [
  {
    id: 'k1', title: 'Alfa', tagline: 'Tagline alfa yang panjangnya lebih dari empat puluh karakter.',
    urlBersih: 'https://alfa.example', page: 'https://aiclub.id/showcase/k1', category: 'saas',
    love: 25, comments: 0, author: 'sulth', cityName: 'Klaten', provinceName: 'Jawa Tengah',
    createdAt: '2026-07-11T00:00:00.000Z', hidup: true, httpStatus: 200, httpNote: '',
    tema: ['CRM / WhatsApp automation'],
    github: { ada: true, slug: 'x/alfa', stars: 41, lisensi: 'MIT', pushedAt: '2026-08-20' },
  },
  {
    id: 'k2', title: 'Beta', tagline: 'pendek', urlBersih: 'https://beta.example',
    page: 'https://aiclub.id/showcase/k2', category: 'model', love: 0, comments: 0,
    author: 'x', cityName: 'Makassar', provinceName: 'Sulawesi Selatan',
    createdAt: '2026-08-02T00:00:00.000Z', hidup: false, httpStatus: 404, httpNote: 'http 404',
    tema: ['Data / riset / intelijen'], github: null,
  },
];

function render(bahasa = 'id', rows = ROWS) {
  const r = ringkas(rows, { sekarangISO: META.sekarangISO, temaKosong: ['Kepatuhan UU PDP'], hariBerjalan: META.hariBerjalan });
  return halaman({ bahasa, rows, ringkasan: r, meta: META });
}

// ---------------------------------------------------------------- struktur

test('halaman punya doctype, html berbahasa, dan penutup yang lengkap', () => {
  for (const b of BAHASA) {
    const h = render(b);
    assert.ok(h.startsWith('<!doctype html>'), `${b}: doctype hilang`);
    assert.ok(h.includes(`<html lang="${b}">`), `${b}: atribut lang salah`);
    assert.ok(h.trimEnd().endsWith('</html>'), `${b}: penutup hilang`);
    for (const tag of ['head', 'body', 'title', 'table', 'footer']) {
      assert.equal((h.match(new RegExp(`</${tag}>`, 'g')) || []).length,
        (h.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length, `${b}: tag ${tag} tidak seimbang`);
    }
  }
});

test('kedua bahasa menghasilkan halaman yang benar-benar berbeda', () => {
  assert.notEqual(render('id'), render('en'));
  assert.ok(render('en').includes('projects indexed'));
  assert.ok(render('id').includes('karya terindeks'));
});

test('halaman memasang hreflang untuk kedua bahasa dan x-default', () => {
  const h = render('id');
  assert.ok(h.includes('hreflang="id"'));
  assert.ok(h.includes('hreflang="en"'));
  assert.ok(h.includes('hreflang="x-default"'));
});

test('tautan ganti bahasa mengarah ke sisi yang berlawanan', () => {
  assert.ok(render('id').includes('href="../en/"'));
  assert.ok(render('en').includes('href="../"'));
});

// ---------------------------------------------------------------- isi

test('setiap karya muncul tepat satu baris di tabel', () => {
  const h = render('id');
  assert.equal((h.match(/<tr data-k=/g) || []).length, ROWS.length);
  for (const r of ROWS) assert.ok(h.includes(`>${r.title}<`), `${r.title} hilang`);
});

test('jumlah kolom tiap baris sama dengan jumlah kolom kepala tabel', () => {
  const h = render('id');
  const kepala = (h.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/) || [])[1] || '';
  const nKepala = (kepala.match(/<th/g) || []).length;
  for (const baris of h.matchAll(/<tr data-k=[\s\S]*?<\/tr>/g)) {
    assert.equal((baris[0].match(/<td/g) || []).length, nKepala, 'jumlah sel tidak cocok');
  }
});

test('tabel membawa semua atribut data yang dipakai penyaring dan pengurut', () => {
  const h = render('id');
  for (const a of ['data-k', 'data-kota', 'data-hidup', 'data-repo', 'data-love', 'data-star', 'data-rapor', 'data-cari']) {
    assert.ok(h.includes(a + '='), `${a} hilang dari baris`);
  }
});

test('karya bertautan mati mendapat penanda mati di daftar terpisah', () => {
  const h = render('id');
  assert.ok(h.includes('id="mati"'));
  assert.ok(h.includes('>Beta<'));
});

test('tak ada "undefined", "null", atau "NaN" yang bocor ke halaman', () => {
  for (const b of BAHASA) {
    const h = render(b);
    for (const buruk of ['>undefined<', '>null<', 'NaN', '>[object Object]<']) {
      assert.ok(!h.includes(buruk), `${b}: "${buruk}" muncul di halaman`);
    }
  }
});

test('halaman tetap terbit walau datanya kosong', () => {
  const h = render('id', []);
  assert.ok(h.startsWith('<!doctype html>'));
  assert.ok(!h.includes('NaN'));
  assert.ok(h.includes('tidak ada data'));
});

// ---------------------------------------------------------------- keamanan

test('judul dan tagline yang mengandung markup di-escape, bukan dieksekusi', () => {
  const jahat = [{
    ...ROWS[0], id: 'x', title: '<img src=x onerror=alert(1)>',
    tagline: '"><script>alert(2)</script>', cityName: '<b>Kota</b>',
    urlBersih: 'https://a"onmouseover="alert(3)',
  }];
  const h = render('id', jahat);
  // Yang berbahaya bukan teksnya, tapi tag dan atribut yang benar-benar terbentuk.
  assert.ok(!h.includes('<img '), 'tag img sisipan terbentuk');
  assert.ok(!h.includes('<b>Kota</b>'), 'markup kota tidak di-escape');
  assert.ok(!h.includes('<script>alert(2)'), 'skrip sisipan lolos');
  assert.ok(!h.includes('onmouseover="'), 'kutip di URL berhasil keluar dari atribut');
  assert.ok(h.includes('onmouseover=&quot;'), 'kutip di URL seharusnya ter-escape');
  assert.ok(h.includes('&lt;img src=x'), 'markup seharusnya muncul sebagai teks biasa');
});

test('URL dengan skema berbahaya diganti, bukan sekadar di-escape', () => {
  const jahat = [
    { ...ROWS[0], id: 'a', urlBersih: 'javascript:alert(1)' },
    { ...ROWS[0], id: 'b', urlBersih: 'JaVaScRiPt:alert(2)' },
    { ...ROWS[0], id: 'c', urlBersih: 'data:text/html;base64,PHNjcmlwdD4=' },
    { ...ROWS[0], id: 'd', urlBersih: ' vbscript:msgbox(1)' },
  ];
  const h = render('id', jahat);
  for (const buruk of ['javascript:', 'JaVaScRiPt:', 'data:text/html', 'vbscript:']) {
    assert.ok(!h.toLowerCase().includes(buruk.toLowerCase()), `${buruk} lolos ke href`);
  }
  assert.ok(h.includes('href="#"'), 'URL berbahaya seharusnya jadi href="#"');
});

test('hanya ada satu blok script, yaitu skrip penyaring bawaan', () => {
  const h = render('id');
  assert.equal((h.match(/<script/g) || []).length, 1);
});

test('semua tautan keluar memakai rel noopener', () => {
  const h = render('id');
  const keluar = [...h.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
  assert.ok(keluar.length > 0);
  for (const a of keluar) assert.ok(a.includes('rel="noopener noreferrer"'), `rel hilang: ${a}`);
});

// ---------------------------------------------------------------- tema

test('setiap variabel CSS yang dipakai sudah didefinisikan di :root dasar', () => {
  const root = GAYA.match(/:root\{([\s\S]*?)\}/)[1];
  const didefinisikan = new Set([...root.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const dipakai = new Set([...GAYA.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  const hilang = [...dipakai].filter((v) => !didefinisikan.has(v));
  assert.deepEqual(hilang, [], `variabel tanpa definisi dasar: ${hilang.join(', ')}`);
});

test('setiap variabel yang didefinisikan ulang di mode gelap juga ada di :root', () => {
  const root = GAYA.match(/:root\{([\s\S]*?)\}/)[1];
  const dasar = new Set([...root.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const gelap = GAYA.match(/:root\[data-theme="dark"\]\{([\s\S]*?)\}/)[1];
  for (const m of gelap.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    assert.ok(dasar.has(m[1]), `${m[1]} hanya ada di mode gelap`);
  }
});

test('mode gelap otomatis dikunci supaya pilihan terang tetap menang', () => {
  assert.ok(GAYA.includes(':root:not([data-theme="light"])'));
});

test('body memasang latar dari token, bukan mewarisi latar tuan rumah', () => {
  assert.match(GAYA, /body\{[^}]*background:var\(--ground\)/);
});

test('gaya menghormati prefers-reduced-motion', () => {
  assert.ok(GAYA.includes('prefers-reduced-motion'));
});

// ---------------------------------------------------------------- skrip

test('skrip penyaring tidak memakai sintaks yang gagal di peramban lama', () => {
  assert.ok(!/=>/.test(SKRIP), 'panah masih dipakai');
  assert.ok(!/\bconst\b|\blet\b/.test(SKRIP), 'const/let masih dipakai');
});

test('skrip penyaring bisa diurai sebagai JavaScript yang sah', () => {
  assert.doesNotThrow(() => new Function(SKRIP));
});

test('kepala kolom yang bisa diurut bisa dicapai lewat papan ketik', () => {
  assert.ok(SKRIP.includes('tabIndex'));
  assert.ok(SKRIP.includes("keydown"));
});
