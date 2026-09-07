import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { periksaData, rakit, robots, sitemap, KOLOM_WAJIB, TEMA_KOSONG } from '../src/build.js';
import { bersihkan, jenisGagal, DIBUANG } from '../src/sanitize.js';
import { urlAman } from '../src/charts.js';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const bacaData = (n) => JSON.parse(readFileSync(join(AKAR, 'data', n), 'utf8'));

const SAH = {
  id: 'k1', title: 'Alfa', category: 'saas', page: 'https://aiclub.id/showcase/k1',
  urlBersih: 'https://alfa.example', love: 1, hidup: true, tema: ['A'],
  createdAt: '2026-07-01T00:00:00.000Z',
};

// ---------------------------------------------------------------- periksaData

test('periksaData meloloskan data yang lengkap', () => {
  assert.deepEqual(periksaData([SAH]), []);
});

test('periksaData menolak yang bukan array', () => {
  assert.equal(periksaData(null).length, 1);
  assert.equal(periksaData({}).length, 1);
});

test('periksaData menandai setiap kolom wajib yang kosong', () => {
  for (const k of KOLOM_WAJIB) {
    const rusak = { ...SAH, [k]: '' };
    const m = periksaData([rusak]);
    assert.ok(m.some((x) => x.includes(`"${k}"`)), `kolom ${k} lolos padahal kosong`);
  }
});

test('periksaData menangkap id ganda', () => {
  const m = periksaData([SAH, { ...SAH }]);
  assert.ok(m.some((x) => x.includes('id ganda')));
});

test('periksaData menolak data yang masih membawa isi komentar', () => {
  const m = periksaData([{ ...SAH, commentList: [{ body: 'halo' }] }]);
  assert.ok(m.some((x) => x.includes('commentList')), 'commentList lolos ke build');
});

test('periksaData mengeluh kalau datanya kosong', () => {
  assert.ok(periksaData([]).some((x) => x.includes('kosong')));
});

// ---------------------------------------------------------------- rakit

test('rakit menghasilkan satu halaman per bahasa dengan jalur yang benar', () => {
  const { keluaran } = rakit({
    rows: [SAH],
    meta: { tanggal: '2026-09-05', sekarangISO: '2026-09-05T00:00:00.000Z', basis: 'https://x.test', karyaDiklaim: 1, loveDiklaim: 1, builder: 1 },
  });
  assert.deepEqual([...keluaran.keys()].sort(), ['en/index.html', 'index.html']);
});

test('rakit menyertakan tema kosong sehingga celahnya terlihat di halaman', () => {
  const { ringkasan } = rakit({
    rows: [SAH],
    meta: { tanggal: '2026-09-05', sekarangISO: '2026-09-05T00:00:00.000Z', basis: 'https://x.test', karyaDiklaim: 1, loveDiklaim: 1, builder: 1 },
  });
  for (const t of TEMA_KOSONG) {
    assert.ok(ringkasan.celah.some((c) => c.tema === t && c.n === 0), `${t} hilang dari peta celah`);
  }
});

// ---------------------------------------------------------------- robots & sitemap

test('robots melarang folder data diambil, tapi mengizinkan halaman diindeks', () => {
  const r = robots({ basis: 'https://x.test' });
  assert.ok(r.includes('Allow: /'));
  assert.ok(r.includes('Disallow: /data/'));
  assert.ok(r.includes('ai-train=no'), 'sinyal ai-train dari sumber tidak diteruskan');
  assert.ok(r.includes('Sitemap: https://x.test/sitemap.xml'));
});

test('sitemap memuat kedua bahasa dan XML-nya sah bentuknya', () => {
  const s = sitemap({ basis: 'https://x.test', tanggal: '2026-09-05' });
  assert.ok(s.startsWith('<?xml'));
  assert.equal((s.match(/<url>/g) || []).length, 2);
  assert.equal((s.match(/<url>/g) || []).length, (s.match(/<\/url>/g) || []).length);
  assert.ok(s.includes('https://x.test/') && s.includes('https://x.test/en/'));
});

// ---------------------------------------------------------------- sanitize

test('bersihkan membuang setiap kolom yang tidak boleh terbit', () => {
  const kotor = { ...SAH, commentList: [{ body: 'rahasia', memberId: 'm1' }], imageKey: 's/x.png', featured: 0 };
  const [b] = bersihkan([kotor]);
  for (const k of DIBUANG) assert.ok(!(k in b), `${k} masih terbawa`);
});

test('bersihkan tidak mengubah objek aslinya', () => {
  const kotor = { ...SAH, commentList: [{ body: 'rahasia' }] };
  bersihkan([kotor]);
  assert.ok(Array.isArray(kotor.commentList), 'masukan ikut termutasi');
});

test('bersihkan mengisi urlBersih kalau belum ada', () => {
  const [b] = bersihkan([{ ...SAH, urlBersih: undefined, url: 'https://a.test' }]);
  assert.equal(b.urlBersih, 'https://a.test');
});

test('jenisGagal meringkas pesan galat mentah jadi kategori yang aman', () => {
  assert.equal(jenisGagal(404, 'http 404'), 'http 404');
  assert.equal(jenisGagal(null, 'TimeoutError: The read operation timed out'), 'timeout');
  assert.equal(jenisGagal(null, 'URLError: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED]'), 'sertifikat tidak sah');
  assert.equal(jenisGagal(null, 'URLError: [Errno 11001] getaddrinfo failed'), 'DNS gagal');
  assert.equal(jenisGagal(null, ''), '');
});

test('jenisGagal tidak pernah membocorkan pesan mentah apa adanya', () => {
  const mentah = 'URLError: <urlopen error [Errno 11001] getaddrinfo failed untuk host-internal.local>';
  assert.ok(!jenisGagal(null, mentah).includes('host-internal.local'));
});

// ---------------------------------------------------------------- urlAman

test('urlAman meloloskan http, https, mailto, dan tautan relatif', () => {
  assert.equal(urlAman('https://a.test/x'), 'https://a.test/x');
  assert.equal(urlAman('http://a.test'), 'http://a.test');
  assert.equal(urlAman('mailto:a@b.test'), 'mailto:a@b.test');
  assert.equal(urlAman('/en/'), '/en/');
  assert.equal(urlAman('#indeks'), '#indeks');
});

test('urlAman menolak semua skema lain', () => {
  for (const u of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x',
                   'vbscript:x', 'file:///c:/', 'ftp://a.test', ' javascript:x']) {
    assert.equal(urlAman(u), '#', `${u} lolos`);
  }
});

test('urlAman aman terhadap masukan kosong dan bukan teks', () => {
  for (const u of ['', '   ', null, undefined, 0, {}]) assert.equal(urlAman(u), '#');
});

// ---------------------------------------------------------------- data nyata

test('data/karya.json yang dikirim ke repo lolos periksa', () => {
  assert.deepEqual(periksaData(bacaData('karya.json')), []);
});

test('data/karya.json tidak lagi membawa isi komentar siapa pun', () => {
  const rows = bacaData('karya.json');
  for (const r of rows) {
    assert.equal(r.commentList, undefined, `${r.id} masih membawa commentList`);
  }
});

test('meta.json memuat semua kunci yang dipakai halaman', () => {
  const m = bacaData('meta.json');
  for (const k of ['tanggal', 'sekarangISO', 'basis', 'karyaDiklaim', 'loveDiklaim']) {
    assert.ok(m[k] !== undefined && m[k] !== '', `meta.${k} hilang`);
  }
  assert.match(m.tanggal, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(m.sekarangISO)));
  assert.ok(m.basis.startsWith('https://'));
});

test('cakupan yang diklaim meta tidak lebih kecil dari data yang benar-benar ada', () => {
  const m = bacaData('meta.json');
  const rows = bacaData('karya.json');
  assert.ok(m.karyaDiklaim >= rows.length, 'karyaDiklaim lebih kecil dari jumlah baris');
  assert.ok(m.loveDiklaim >= rows.reduce((a, r) => a + (r.love || 0), 0), 'loveDiklaim lebih kecil dari total love');
});

test('setiap URL karya di data nyata lolos saringan skema', () => {
  for (const r of bacaData('karya.json')) {
    const u = r.urlBersih || r.url || '';
    if (u === '') continue;
    assert.notEqual(urlAman(u), '#', `${r.id} punya URL berskema tak aman: ${u}`);
  }
});
