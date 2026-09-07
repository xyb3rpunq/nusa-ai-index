/**
 * Mesin hitung nusa-ai-index.
 *
 * Semua fungsi di berkas ini murni: tidak menyentuh berkas, jaringan, tanggal
 * sistem, atau variabel global. Masukannya array karya, keluarannya angka.
 * Itu syaratnya supaya bisa diuji tanpa mock apa pun.
 */

// ---------------------------------------------------------------- konstanta

/** Bobot rapor kesehatan karya. Total tepat 100. */
export const BOBOT = Object.freeze({
  hidup: 40,          // tautannya masih bisa dibuka
  repo: 25,           // ada repo publik yang benar-benar ada
  lisensi: 10,        // repo punya lisensi yang dikenali
  segar: 10,          // repo di-push dalam 180 hari terakhir
  dicintai: 5,        // pernah dapat minimal satu love
  dijelaskan: 5,      // tagline cukup untuk tahu ini apa
  produkSendiri: 5,   // bukan sekadar tautan ke Lynk/YouTube/Instagram/share-link
});

/** Host yang dipakai sebagai pengganti produk, bukan produk itu sendiri. */
export const HOST_PENGGANTI = Object.freeze([
  'lynk.id', 'youtube.com', 'youtu.be', 'instagram.com', 'linkedin.com',
  'gemini.google.com', 'sites.google.com', 'script.google.com',
  'appsheet.com', 'facebook.com', 'tiktok.com',
]);

/** Ambang penilaian kepadatan tema. */
export const AMBANG_TEMA = Object.freeze({ jenuh: 19, ramai: 12, tipis: 1 });

export const KATEGORI = Object.freeze({
  opensource: 'Open Source', saas: 'SaaS', produk: 'Produk', web: 'Web',
  tools: 'Tools', model: 'Model', lainnya: 'Lainnya',
});

// ---------------------------------------------------------------- bantu

const angka = (v) => (Number.isFinite(v) ? v : 0);
const teks = (v) => (typeof v === 'string' ? v : '');

/** Hitung frekuensi nilai sebuah kunci, urut dari terbanyak. */
export function hitungPer(rows, ambil) {
  const peta = new Map();
  for (const r of rows) {
    const k = ambil(r);
    if (k === null || k === undefined || k === '') continue;
    peta.set(k, (peta.get(k) || 0) + 1);
  }
  return [...peta.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

/** Jumlahkan sebuah metrik per kelompok. */
export function jumlahPer(rows, ambil, nilai) {
  const peta = new Map();
  for (const r of rows) {
    const k = ambil(r);
    if (k === null || k === undefined || k === '') continue;
    peta.set(k, (peta.get(k) || 0) + angka(nilai(r)));
  }
  return [...peta.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

/**
 * Korelasi Pearson. Balikkan null kalau tidak terdefinisi — deret kurang dari
 * dua titik, atau salah satu deret konstan sehingga simpangannya nol.
 */
export function pearson(xs, ys) {
  if (xs.length !== ys.length) throw new TypeError('panjang deret harus sama');
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let atas = 0, kiri = 0, kanan = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    atas += dx * dy; kiri += dx * dx; kanan += dy * dy;
  }
  const bawah = Math.sqrt(kiri * kanan);
  return bawah === 0 ? null : atas / bawah;
}

/** Apakah tautannya cuma etalase pihak ketiga, bukan produknya sendiri. */
export function pakaiHostPengganti(url) {
  const u = teks(url).toLowerCase();
  return HOST_PENGGANTI.some((h) => u.includes(h));
}

/** Selisih hari antara dua tanggal ISO. Balikkan null kalau salah satu tak sah. */
export function selisihHari(dariISO, sampaiISO) {
  const a = Date.parse(dariISO), b = Date.parse(sampaiISO);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / 86400000);
}

// ---------------------------------------------------------------- rapor

/**
 * Rapor kesehatan satu karya, 0–100, plus rincian tiap komponen supaya
 * pemiliknya tahu persis apa yang kurang.
 *
 * `sekarangISO` wajib diberikan — mesin ini tidak boleh membaca jam sistem,
 * supaya hasilnya sama tiap kali diuji.
 */
export function raporKarya(k, sekarangISO) {
  const gh = k?.github ?? null;
  const adaRepo = Boolean(gh && gh.ada);
  const umurPush = adaRepo ? selisihHari(gh.pushedAt, sekarangISO) : null;
  const lisensi = adaRepo ? teks(gh.lisensi) : '';

  const rincian = {
    hidup: Boolean(k?.hidup),
    repo: adaRepo,
    lisensi: adaRepo && lisensi !== '' && lisensi !== 'NOASSERTION',
    segar: umurPush !== null && umurPush >= 0 && umurPush <= 180,
    dicintai: angka(k?.love) > 0,
    dijelaskan: teks(k?.tagline).trim().length >= 40,
    produkSendiri: !pakaiHostPengganti(k?.urlBersih || k?.url),
  };

  let skor = 0;
  for (const [nama, lulus] of Object.entries(rincian)) if (lulus) skor += BOBOT[nama];
  return { skor, rincian, tingkat: tingkatRapor(skor) };
}

export function tingkatRapor(skor) {
  if (skor >= 85) return 'prima';
  if (skor >= 65) return 'sehat';
  if (skor >= 40) return 'rapuh';
  return 'kritis';
}

// ---------------------------------------------------------------- agregat

/** Peta kepadatan tema: berapa karya per tema, dan bagaimana menilainya. */
export function petaCelah(rows, temaKosong = []) {
  const peta = new Map();
  for (const r of rows) for (const t of r.tema || []) peta.set(t, (peta.get(t) || 0) + 1);
  const isi = [...peta.entries()]
    .filter(([t]) => t !== 'Lainnya')
    .map(([tema, n]) => ({ tema, n, nilai: nilaiKepadatan(n) }))
    .sort((a, b) => b.n - a.n || a.tema.localeCompare(b.tema));
  const kosong = temaKosong.map((tema) => ({ tema, n: 0, nilai: 'kosong' }));
  return [...isi, ...kosong];
}

export function nilaiKepadatan(n) {
  if (n >= AMBANG_TEMA.jenuh) return 'jenuh';
  if (n >= AMBANG_TEMA.ramai) return 'ramai';
  if (n >= AMBANG_TEMA.tipis) return 'tipis';
  return 'kosong';
}

/** Karya per bulan beserta laju per hari. `hariBerjalan` menutup bulan berjalan. */
export function perBulan(rows, hariBerjalan = {}) {
  const peta = new Map();
  for (const r of rows) {
    const b = teks(r.createdAt).slice(0, 7);
    if (b.length !== 7) continue;
    peta.set(b, (peta.get(b) || 0) + 1);
  }
  return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bulan, n]) => {
    const hari = hariBerjalan[bulan] ?? hariDalamBulan(bulan);
    return { bulan, n, hari, laju: hari > 0 ? n / hari : 0 };
  });
}

export function hariDalamBulan(bulanISO) {
  const [y, m] = bulanISO.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return 0;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Semua karya yang tautannya tidak bisa dibuka saat crawl. */
export function tautanMati(rows) {
  return rows.filter((r) => !r.hidup)
    .map((r) => ({
      id: r.id, title: r.title, url: r.urlBersih || r.url,
      status: r.httpStatus ?? null, catatan: r.httpNote || '',
      jenis: r.httpStatus ? 'kode' : 'jaringan',
    }))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

/** Berapa love lagi yang dibutuhkan untuk merebut puncak papan peringkat. */
export function ambangJuara(rows) {
  const puncak = rows.reduce((m, r) => Math.max(m, angka(r.love)), 0);
  return { puncak, butuh: puncak + 1 };
}

/**
 * Bandingkan love aiclub dengan bintang GitHub untuk karya yang punya repo.
 * Inilah temuan inti proyek ini, jadi ia punya fungsi sendiri.
 */
export function loveVsBintang(rows) {
  const titik = rows
    .filter((r) => r.github?.ada)
    .map((r) => ({ title: r.title, slug: r.github.slug, star: angka(r.github.stars), love: angka(r.love) }))
    .sort((a, b) => b.star - a.star || a.title.localeCompare(b.title));
  const r = pearson(titik.map((t) => t.star), titik.map((t) => t.love));
  return { titik, korelasi: r };
}

/** Ringkasan lengkap — satu panggilan untuk semua yang dipakai halaman. */
export function ringkas(rows, opsi = {}) {
  const { sekarangISO = '1970-01-01T00:00:00.000Z', temaKosong = [], hariBerjalan = {} } = opsi;
  const rapor = rows.map((r) => raporKarya(r, sekarangISO));
  const hidup = rows.filter((r) => r.hidup).length;
  const berepo = rows.filter((r) => r.github?.ada).length;
  return {
    total: rows.length,
    totalLove: rows.reduce((a, r) => a + angka(r.love), 0),
    hidup,
    mati: rows.length - hidup,
    berepo,
    totalBintang: rows.reduce((a, r) => a + (r.github?.ada ? angka(r.github.stars) : 0), 0),
    tanpaLove: rows.filter((r) => !angka(r.love)).length,
    hostPengganti: rows.filter((r) => pakaiHostPengganti(r.urlBersih || r.url)).length,
    klaimOssTanpaRepo: rows.filter((r) => r.category === 'opensource' && !r.github?.ada).length,
    raporRerata: rapor.length ? rapor.reduce((a, x) => a + x.skor, 0) / rapor.length : 0,
    perTingkat: hitungPer(rapor, (x) => x.tingkat),
    perKategori: hitungPer(rows, (r) => r.category),
    loveKategori: jumlahPer(rows, (r) => r.category, (r) => r.love),
    perProvinsi: hitungPer(rows, (r) => r.provinceName),
    perKota: hitungPer(rows, (r) => r.cityName),
    celah: petaCelah(rows, temaKosong),
    bulan: perBulan(rows, hariBerjalan),
    daftarMati: tautanMati(rows),
    juara: ambangJuara(rows),
    bintang: loveVsBintang(rows),
  };
}
