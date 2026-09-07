import test from 'node:test';
import assert from 'node:assert/strict';
import { BAHASA, KAMUS, t, placeholder } from '../src/i18n.js';

test('setiap bahasa yang diumumkan punya kamus', () => {
  for (const b of BAHASA) assert.ok(KAMUS[b], `kamus ${b} hilang`);
  assert.deepEqual(Object.keys(KAMUS).sort(), [...BAHASA].sort());
});

test('kunci ID dan EN persis sama — tidak ada yang tertinggal di salah satu sisi', () => {
  const id = Object.keys(KAMUS.id).sort();
  const en = Object.keys(KAMUS.en).sort();
  const hanyaId = id.filter((k) => !en.includes(k));
  const hanyaEn = en.filter((k) => !id.includes(k));
  assert.deepEqual(hanyaId, [], `hanya ada di ID: ${hanyaId.join(', ')}`);
  assert.deepEqual(hanyaEn, [], `hanya ada di EN: ${hanyaEn.join(', ')}`);
});

test('tidak ada terjemahan yang kosong atau cuma spasi', () => {
  for (const b of BAHASA) {
    for (const [k, v] of Object.entries(KAMUS[b])) {
      assert.equal(typeof v, 'string', `${b}.${k} bukan string`);
      assert.ok(v.trim().length > 0, `${b}.${k} kosong`);
    }
  }
});

test('placeholder tiap kunci sama persis di kedua bahasa', () => {
  for (const k of Object.keys(KAMUS.id)) {
    assert.deepEqual(
      placeholder(KAMUS.id[k]), placeholder(KAMUS.en[k]),
      `placeholder beda pada kunci ${k}`,
    );
  }
});

test('tidak ada terjemahan EN yang masih tertinggal identik dengan ID', () => {
  // Sebagian kunci memang wajar sama (kode bahasa, nama merek, simbol).
  const bolehSama = new Set([
    'grafik.sumbuX', 'grafik.sumbuY', // nama merek, sengaja tidak diterjemahkan
    'kolom.bintang',                  // "★ github" — nama produk, sama di dua bahasa
  ]);
  const tersangka = [];
  for (const k of Object.keys(KAMUS.id)) {
    if (bolehSama.has(k)) continue;
    if (KAMUS.id[k] === KAMUS.en[k] && /[a-z]{4,}/i.test(KAMUS.id[k])) tersangka.push(k);
  }
  assert.deepEqual(tersangka, [], `belum diterjemahkan: ${tersangka.join(', ')}`);
});

test('kamus dibekukan supaya tidak bisa dimutasi saat build', () => {
  assert.ok(Object.isFrozen(KAMUS));
  for (const b of BAHASA) assert.ok(Object.isFrozen(KAMUS[b]), `${b} tidak beku`);
});

test('t mengisi placeholder', () => {
  assert.equal(t('id', 'hitung', { n: 5, total: 242 }), '5 dari 242 karya');
  assert.equal(t('en', 'hitung', { n: 5, total: 242 }), '5 of 242 projects');
});

test('t melempar untuk bahasa yang tidak dikenal', () => {
  assert.throws(() => t('jv', 'meta.judul'), RangeError);
});

test('t melempar untuk kunci yang hilang, bukan mengembalikan undefined', () => {
  assert.throws(() => t('id', 'kunci.yang.tidak.ada'), RangeError);
});

test('t melempar kalau placeholder tidak diisi — cegah "undefined" terbit', () => {
  assert.throws(() => t('id', 'hitung', { n: 5 }), RangeError);
});

test('t membiarkan teks tanpa placeholder apa adanya', () => {
  assert.equal(t('id', 'status.hidup'), 'hidup');
  assert.equal(t('en', 'status.hidup'), 'alive');
});

test('placeholder mengurutkan dan mengenali semua nama', () => {
  assert.deepEqual(placeholder('{b} lalu {a} lalu {b}'), ['a', 'b', 'b']);
  assert.deepEqual(placeholder('tanpa apa-apa'), []);
});

test('setiap tingkat rapor punya terjemahan di kedua bahasa', () => {
  for (const tk of ['prima', 'sehat', 'rapuh', 'kritis']) {
    for (const b of BAHASA) assert.ok(KAMUS[b][`tingkat.${tk}`], `tingkat.${tk} hilang di ${b}`);
  }
});

test('atribut lang halaman ikut bahasanya', () => {
  assert.equal(t('id', 'html.lang'), 'id');
  assert.equal(t('en', 'html.lang'), 'en');
});
