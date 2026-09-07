import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOBOT, HOST_PENGGANTI, AMBANG_TEMA, KATEGORI,
  hitungPer, jumlahPer, pearson, pakaiHostPengganti, selisihHari,
  raporKarya, tingkatRapor, petaCelah, nilaiKepadatan,
  perBulan, hariDalamBulan, tautanMati, ambangJuara, loveVsBintang, ringkas,
} from '../src/engine.js';

const NOW = '2026-09-05T00:00:00.000Z';

/** Karya contoh yang lulus semua komponen rapor. */
function karyaPrima(ubah = {}) {
  return {
    id: 'a', title: 'Alfa', tagline: 'Tagline yang panjangnya melewati empat puluh karakter.',
    urlBersih: 'https://alfa.example', category: 'opensource', love: 3, hidup: true,
    createdAt: '2026-07-10T00:00:00.000Z', cityName: 'Bekasi', provinceName: 'Jawa Barat',
    tema: ['Developer tools / infra'], httpStatus: 200,
    github: { ada: true, slug: 'x/alfa', stars: 10, forks: 1, lisensi: 'MIT', pushedAt: '2026-08-01' },
    ...ubah,
  };
}

// ---------------------------------------------------------------- konstanta

test('bobot rapor berjumlah tepat 100', () => {
  assert.equal(Object.values(BOBOT).reduce((a, b) => a + b, 0), 100);
});

test('konstanta dibekukan supaya tidak bisa diubah pemanggil', () => {
  assert.ok(Object.isFrozen(BOBOT));
  assert.ok(Object.isFrozen(HOST_PENGGANTI));
  assert.ok(Object.isFrozen(AMBANG_TEMA));
  assert.ok(Object.isFrozen(KATEGORI));
});

test('ambang tema menurun dari jenuh ke tipis', () => {
  assert.ok(AMBANG_TEMA.jenuh > AMBANG_TEMA.ramai);
  assert.ok(AMBANG_TEMA.ramai > AMBANG_TEMA.tipis);
});

// ---------------------------------------------------------------- hitungPer

test('hitungPer menghitung frekuensi dan mengurutkan dari terbanyak', () => {
  const rows = [{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: 'c' }, { k: 'a' }, { k: 'b' }];
  assert.deepEqual(hitungPer(rows, (r) => r.k), [['a', 3], ['b', 2], ['c', 1]]);
});

test('hitungPer melewati nilai kosong, null, dan undefined', () => {
  const rows = [{ k: 'a' }, { k: '' }, { k: null }, { k: undefined }, {}, { k: 'a' }];
  assert.deepEqual(hitungPer(rows, (r) => r.k), [['a', 2]]);
});

test('hitungPer memutus seri dengan urutan abjad, bukan urutan masuk', () => {
  const rows = [{ k: 'zeta' }, { k: 'alfa' }];
  assert.deepEqual(hitungPer(rows, (r) => r.k), [['alfa', 1], ['zeta', 1]]);
});

test('hitungPer atas array kosong menghasilkan array kosong', () => {
  assert.deepEqual(hitungPer([], (r) => r.k), []);
});

// ---------------------------------------------------------------- jumlahPer

test('jumlahPer menjumlahkan metrik per kelompok', () => {
  const rows = [{ k: 'a', v: 3 }, { k: 'b', v: 5 }, { k: 'a', v: 4 }];
  assert.deepEqual(jumlahPer(rows, (r) => r.k, (r) => r.v), [['a', 7], ['b', 5]]);
});

test('jumlahPer memperlakukan nilai bukan angka sebagai nol', () => {
  const rows = [{ k: 'a', v: 2 }, { k: 'a', v: null }, { k: 'a', v: 'lima' }, { k: 'a' }];
  assert.deepEqual(jumlahPer(rows, (r) => r.k, (r) => r.v), [['a', 2]]);
});

// ---------------------------------------------------------------- pearson

test('pearson korelasi sempurna positif bernilai 1', () => {
  assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1);
});

test('pearson korelasi sempurna negatif bernilai -1', () => {
  assert.equal(pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1);
});

test('pearson deret konstan tidak terdefinisi, bukan nol', () => {
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
});

test('pearson butuh minimal dua titik', () => {
  assert.equal(pearson([1], [2]), null);
  assert.equal(pearson([], []), null);
});

test('pearson menolak deret yang panjangnya beda', () => {
  assert.throws(() => pearson([1, 2], [1]), TypeError);
});

test('pearson cocok dengan nilai acuan yang dihitung terpisah', () => {
  // Acuan dihitung ulang di Python: pembilang 8, penyebut 10, jadi r = 0.8 tepat.
  const r = pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
  assert.ok(Math.abs(r - 0.8) < 1e-12, `r=${r}`);
});

// ---------------------------------------------------------------- host

test('pakaiHostPengganti mengenali etalase pihak ketiga', () => {
  assert.equal(pakaiHostPengganti('https://lynk.id/toko/abc'), true);
  assert.equal(pakaiHostPengganti('https://youtube.com/shorts/x'), true);
  assert.equal(pakaiHostPengganti('https://GEMINI.GOOGLE.COM/share/x'), true);
});

test('pakaiHostPengganti membiarkan domain sendiri', () => {
  assert.equal(pakaiHostPengganti('https://produkku.id'), false);
  assert.equal(pakaiHostPengganti('https://github.com/a/b'), false);
});

test('pakaiHostPengganti aman terhadap masukan bukan teks', () => {
  for (const v of [null, undefined, 42, {}, []]) assert.equal(pakaiHostPengganti(v), false);
});

// ---------------------------------------------------------------- tanggal

test('selisihHari menghitung jarak hari', () => {
  assert.equal(selisihHari('2026-01-01', '2026-01-31'), 30);
  assert.equal(selisihHari('2026-01-31', '2026-01-01'), -30);
  assert.equal(selisihHari('2026-01-01', '2026-01-01'), 0);
});

test('selisihHari menolak tanggal tak sah', () => {
  assert.equal(selisihHari('bukan tanggal', '2026-01-01'), null);
  assert.equal(selisihHari('2026-01-01', ''), null);
  assert.equal(selisihHari(null, null), null);
});

test('hariDalamBulan tahu panjang tiap bulan termasuk kabisat', () => {
  assert.equal(hariDalamBulan('2026-01'), 31);
  assert.equal(hariDalamBulan('2026-02'), 28);
  assert.equal(hariDalamBulan('2024-02'), 29);
  assert.equal(hariDalamBulan('2026-09'), 30);
});

test('hariDalamBulan menolak bulan tak sah', () => {
  assert.equal(hariDalamBulan('2026-13'), 0);
  assert.equal(hariDalamBulan('2026-00'), 0);
  assert.equal(hariDalamBulan('ngawur'), 0);
});

// ---------------------------------------------------------------- rapor

test('raporKarya memberi 100 untuk karya yang lulus semuanya', () => {
  const r = raporKarya(karyaPrima(), NOW);
  assert.equal(r.skor, 100);
  assert.equal(r.tingkat, 'prima');
  assert.ok(Object.values(r.rincian).every(Boolean));
});

test('raporKarya memberi 0 untuk karya kosong', () => {
  const r = raporKarya({}, NOW);
  assert.equal(r.skor, BOBOT.produkSendiri); // url kosong tetap dianggap bukan etalase
  assert.equal(r.tingkat, 'kritis');
});

test('raporKarya: tautan mati memangkas tepat sebesar bobot hidup', () => {
  const a = raporKarya(karyaPrima(), NOW).skor;
  const b = raporKarya(karyaPrima({ hidup: false }), NOW).skor;
  assert.equal(a - b, BOBOT.hidup);
});

test('raporKarya: tanpa repo ikut menggugurkan lisensi dan kesegaran', () => {
  const r = raporKarya(karyaPrima({ github: null }), NOW);
  assert.equal(r.rincian.repo, false);
  assert.equal(r.rincian.lisensi, false);
  assert.equal(r.rincian.segar, false);
  assert.equal(r.skor, 100 - BOBOT.repo - BOBOT.lisensi - BOBOT.segar);
});

test('raporKarya menolak lisensi NOASSERTION sebagai lisensi', () => {
  const r = raporKarya(karyaPrima({ github: { ada: true, lisensi: 'NOASSERTION', pushedAt: '2026-08-01' } }), NOW);
  assert.equal(r.rincian.lisensi, false);
});

test('raporKarya menganggap repo basi kalau lewat 180 hari', () => {
  const segar = raporKarya(karyaPrima({ github: { ada: true, lisensi: 'MIT', pushedAt: '2026-05-01' } }), NOW);
  const basi = raporKarya(karyaPrima({ github: { ada: true, lisensi: 'MIT', pushedAt: '2025-01-01' } }), NOW);
  assert.equal(segar.rincian.segar, true);
  assert.equal(basi.rincian.segar, false);
});

test('raporKarya menolak push bertanggal masa depan sebagai segar', () => {
  const r = raporKarya(karyaPrima({ github: { ada: true, lisensi: 'MIT', pushedAt: '2027-01-01' } }), NOW);
  assert.equal(r.rincian.segar, false);
});

test('raporKarya menuntut tagline minimal 40 karakter', () => {
  assert.equal(raporKarya(karyaPrima({ tagline: 'pendek' }), NOW).rincian.dijelaskan, false);
  assert.equal(raporKarya(karyaPrima({ tagline: 'x'.repeat(40) }), NOW).rincian.dijelaskan, true);
  assert.equal(raporKarya(karyaPrima({ tagline: '  ' + 'x'.repeat(39) + '  ' }), NOW).rincian.dijelaskan, false);
});

test('raporKarya menandai tautan etalase sebagai bukan produk sendiri', () => {
  const r = raporKarya(karyaPrima({ urlBersih: 'https://lynk.id/x' }), NOW);
  assert.equal(r.rincian.produkSendiri, false);
});

test('raporKarya jatuh ke url mentah kalau urlBersih tidak ada', () => {
  const r = raporKarya(karyaPrima({ urlBersih: undefined, url: 'https://lynk.id/x' }), NOW);
  assert.equal(r.rincian.produkSendiri, false);
});

test('raporKarya tidak pernah keluar dari rentang 0..100', () => {
  const kasus = [{}, karyaPrima(), karyaPrima({ hidup: false, love: 0, github: null, tagline: '' })];
  for (const k of kasus) {
    const s = raporKarya(k, NOW).skor;
    assert.ok(s >= 0 && s <= 100, `skor di luar rentang: ${s}`);
  }
});

test('tingkatRapor memetakan setiap batas dengan benar', () => {
  assert.equal(tingkatRapor(100), 'prima');
  assert.equal(tingkatRapor(85), 'prima');
  assert.equal(tingkatRapor(84), 'sehat');
  assert.equal(tingkatRapor(65), 'sehat');
  assert.equal(tingkatRapor(64), 'rapuh');
  assert.equal(tingkatRapor(40), 'rapuh');
  assert.equal(tingkatRapor(39), 'kritis');
  assert.equal(tingkatRapor(0), 'kritis');
});

// ---------------------------------------------------------------- celah

test('nilaiKepadatan memakai ambang yang diumumkan', () => {
  assert.equal(nilaiKepadatan(AMBANG_TEMA.jenuh), 'jenuh');
  assert.equal(nilaiKepadatan(AMBANG_TEMA.jenuh - 1), 'ramai');
  assert.equal(nilaiKepadatan(AMBANG_TEMA.ramai - 1), 'tipis');
  assert.equal(nilaiKepadatan(0), 'kosong');
});

test('petaCelah menghitung tema majemuk dan membuang bak "Lainnya"', () => {
  const rows = [
    { tema: ['A', 'B'] }, { tema: ['A'] }, { tema: ['Lainnya'] }, { tema: [] }, {},
  ];
  assert.deepEqual(petaCelah(rows), [
    { tema: 'A', n: 2, nilai: 'tipis' },
    { tema: 'B', n: 1, nilai: 'tipis' },
  ]);
});

test('petaCelah menempelkan tema kosong di ujung dengan nilai kosong', () => {
  const hasil = petaCelah([{ tema: ['A'] }], ['Benchmark', 'Kepatuhan']);
  assert.equal(hasil.length, 3);
  assert.deepEqual(hasil.slice(1), [
    { tema: 'Benchmark', n: 0, nilai: 'kosong' },
    { tema: 'Kepatuhan', n: 0, nilai: 'kosong' },
  ]);
});

// ---------------------------------------------------------------- bulan

test('perBulan mengelompokkan dan mengurutkan secara kronologis', () => {
  const rows = [
    { createdAt: '2026-08-02T00:00:00Z' },
    { createdAt: '2026-07-30T00:00:00Z' },
    { createdAt: '2026-07-01T00:00:00Z' },
  ];
  const h = perBulan(rows);
  assert.deepEqual(h.map((x) => x.bulan), ['2026-07', '2026-08']);
  assert.deepEqual(h.map((x) => x.n), [2, 1]);
});

test('perBulan memakai hariBerjalan untuk bulan yang belum selesai', () => {
  const rows = [{ createdAt: '2026-09-01T00:00:00Z' }, { createdAt: '2026-09-02T00:00:00Z' }];
  const [sep] = perBulan(rows, { '2026-09': 5 });
  assert.equal(sep.hari, 5);
  assert.equal(sep.laju, 0.4);
});

test('perBulan melewati tanggal yang hilang atau rusak', () => {
  const rows = [{ createdAt: '' }, { createdAt: null }, {}, { createdAt: '2026-07-01T00:00:00Z' }];
  assert.equal(perBulan(rows).length, 1);
});

// ---------------------------------------------------------------- mati

test('tautanMati memisahkan kegagalan kode dan kegagalan jaringan', () => {
  const rows = [
    { id: '1', title: 'Zeta', hidup: false, httpStatus: 404, httpNote: 'http 404', urlBersih: 'u1' },
    { id: '2', title: 'Alfa', hidup: false, httpStatus: null, httpNote: 'URLError', urlBersih: 'u2' },
    { id: '3', title: 'Beta', hidup: true, httpStatus: 200 },
  ];
  const m = tautanMati(rows);
  assert.equal(m.length, 2);
  assert.deepEqual(m.map((x) => x.title), ['Alfa', 'Zeta']); // urut abjad
  assert.equal(m.find((x) => x.title === 'Zeta').jenis, 'kode');
  assert.equal(m.find((x) => x.title === 'Alfa').jenis, 'jaringan');
});

// ---------------------------------------------------------------- juara

test('ambangJuara adalah puncak saat ini plus satu', () => {
  assert.deepEqual(ambangJuara([{ love: 25 }, { love: 3 }, { love: 0 }]), { puncak: 25, butuh: 26 });
});

test('ambangJuara pada data kosong tetap masuk akal', () => {
  assert.deepEqual(ambangJuara([]), { puncak: 0, butuh: 1 });
});

// ---------------------------------------------------------------- bintang

test('loveVsBintang hanya melihat karya yang benar-benar punya repo', () => {
  const rows = [
    karyaPrima({ id: '1', title: 'A', love: 0, github: { ada: true, slug: 'x/a', stars: 41 } }),
    karyaPrima({ id: '2', title: 'B', love: 18, github: { ada: true, slug: 'x/b', stars: 3 } }),
    karyaPrima({ id: '3', title: 'C', love: 9, github: { ada: false, slug: 'x/c' } }),
    karyaPrima({ id: '4', title: 'D', love: 9, github: null }),
  ];
  const h = loveVsBintang(rows);
  assert.equal(h.titik.length, 2);
  assert.deepEqual(h.titik.map((t) => t.title), ['A', 'B']); // urut bintang menurun
  assert.equal(h.korelasi, -1); // dua titik berlawanan arah
});

test('loveVsBintang tanpa repo sama sekali menghasilkan korelasi null', () => {
  assert.equal(loveVsBintang([karyaPrima({ github: null })]).korelasi, null);
});

// ---------------------------------------------------------------- ringkas

test('ringkas menjumlahkan hidup dan mati tepat sebanyak totalnya', () => {
  const rows = [karyaPrima(), karyaPrima({ id: 'b', hidup: false }), karyaPrima({ id: 'c', hidup: false })];
  const r = ringkas(rows, { sekarangISO: NOW });
  assert.equal(r.total, 3);
  assert.equal(r.hidup + r.mati, r.total);
  assert.equal(r.mati, 2);
});

test('ringkas menghitung klaim open source tanpa repo', () => {
  const rows = [
    karyaPrima({ id: 'a', category: 'opensource', github: null }),
    karyaPrima({ id: 'b', category: 'opensource' }),
    karyaPrima({ id: 'c', category: 'web', github: null }),
  ];
  assert.equal(ringkas(rows, { sekarangISO: NOW }).klaimOssTanpaRepo, 1);
});

test('ringkas rerata rapor berada di rentang 0..100', () => {
  const r = ringkas([karyaPrima(), {}], { sekarangISO: NOW });
  assert.ok(r.raporRerata >= 0 && r.raporRerata <= 100);
});

test('ringkas pada dataset kosong tidak melempar dan tidak menghasilkan NaN', () => {
  const r = ringkas([], { sekarangISO: NOW });
  assert.equal(r.total, 0);
  assert.equal(r.raporRerata, 0);
  assert.equal(r.bintang.korelasi, null);
  assert.deepEqual(r.perKategori, []);
  for (const v of [r.totalLove, r.totalBintang, r.hidup, r.mati]) assert.ok(Number.isFinite(v));
});

test('ringkas tidak mengubah array masukan', () => {
  const rows = [karyaPrima(), karyaPrima({ id: 'b' })];
  const salinan = JSON.parse(JSON.stringify(rows));
  ringkas(rows, { sekarangISO: NOW });
  assert.deepEqual(rows, salinan);
});
