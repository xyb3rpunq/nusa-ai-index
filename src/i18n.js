/**
 * Kamus dwibahasa. Aturannya dijaga test/i18n.test.js:
 *  - kunci ID dan EN harus persis sama, tidak boleh ada yang tertinggal;
 *  - tidak boleh ada nilai kosong;
 *  - jumlah placeholder {x} di kedua bahasa harus sama untuk kunci yang sama.
 */

export const BAHASA = Object.freeze(['id', 'en']);

export const KAMUS = Object.freeze({
  id: Object.freeze({
    'html.lang': 'id',
    'meta.judul': 'Indeks Karya Nusantara',
    'meta.deskripsi': 'Indeks dan rapor kesehatan seluruh karya komunitas AI Indonesia di aiclub.id — dicek satu per satu, dipetakan celahnya.',
    'nav.lain': 'English',
    'nav.lainHref': '../en/',

    'kepala.eyebrow.crawl': 'Crawl {tanggal}',
    'kepala.eyebrow.sumber': 'Sumber: aiclub.id/api/v1',
    'kepala.eyebrow.cakupan': '{karya} karya · {builder} builder',
    'kepala.judul1': 'Indeks Karya',
    'kepala.judul2': 'Nusantara',
    'kepala.lede': 'Seluruh karya yang dipamerkan komunitas AI se-Indonesia, ditarik dari endpoint publik aiclub.id, dicek satu per satu apakah masih hidup, lalu diberi rapor. Satu pertanyaan yang dijawab halaman ini: ruang apa yang masih benar-benar kosong.',

    'tile.karya': 'karya terindeks',
    'tile.karya.ket': 'dari {klaim} yang diklaim situs',
    'tile.rapor': 'rerata rapor kesehatan',
    'tile.rapor.ket': 'dari 100 — hidup, berepo, berlisensi, terawat',
    'tile.mati': 'tautan sudah mati',
    'tile.mati.ket': '{persen}% karya tumbang saat dicek',
    'tile.repo': 'punya repo publik',
    'tile.repo.ket': '{persen}% — total {bintang} bintang sekomunitas',
    'tile.juara': 'love untuk juara nasional',
    'tile.juara.ket': 'puncak saat ini {puncak}',

    'bag.temuan': 'Empat temuan yang menentukan',
    'bag.temuan.label': 'Analisis',
    'bag.temuan.intro': 'Setiap angka dihitung ulang dari data/karya.json di repo ini, bukan dari klaim halaman depan aiclub.id.',

    'temuan.1.judul': 'Karya menumpuk di lapisan aplikasi',
    'temuan.1.isi': 'Web dan SaaS memakan setengah showcase. Kategori model isinya {model} karya — dan tidak satu pun benar-benar model.',
    'temuan.2.judul': 'Love tidak mengukur kualitas',
    'temuan.2.isi': 'Korelasi Pearson antara love aiclub dan bintang GitHub: {r}. Repo dengan {bintangTop} bintang punya {loveTop} love.',
    'temuan.3.judul': 'Yang jenuh sudah sangat jenuh — yang kosong benar-benar kosong',
    'temuan.3.isi': 'Klasterisasi kata kunci judul dan tagline; satu karya bisa masuk beberapa tema. Baris bergaris putus-putus bukan tema yang sepi, tapi tema yang nol.',
    'temuan.4.judul': 'Sebagian besar karya tidak sehat',
    'temuan.4.isi': 'Rapor menilai tujuh hal: tautan hidup, repo publik, lisensi, kesegaran push, pernah dapat love, tagline memadai, dan tautannya produk sendiri.',

    'bag.indeks': 'Indeks lengkap',
    'bag.indeks.intro': 'Klik judul untuk membuka karyanya, kolom kanan untuk halaman aslinya di aiclub.id. Status dicek dengan permintaan GET saat crawl.',
    'cari.placeholder': 'Cari judul, tagline, builder, kota…',
    'saring.kategori': 'Semua kategori',
    'saring.kota': 'Semua kota',
    'saring.mati': 'hanya yang mati',
    'saring.repo': 'hanya yang punya repo',
    'hitung': '{n} dari {total} karya',
    'kolom.karya': 'Karya',
    'kolom.kategori': 'Kategori',
    'kolom.kota': 'Kota',
    'kolom.love': '♥ love',
    'kolom.bintang': '★ github',
    'kolom.rapor': 'Rapor',
    'kolom.sumber': 'Sumber',
    'status.hidup': 'hidup',
    'status.mati': 'mati',
    'tabel.kosong': 'Tidak ada karya yang cocok dengan saringan itu.',

    'bag.mati': 'Tautan yang sudah tumbang',
    'bag.mati.label': '{n} karya',
    'bag.mati.intro': 'Dicek dengan permintaan GET. Kegagalan "kode" berarti servernya menjawab dengan error; "jaringan" berarti DNS gagal, sertifikat tidak sah, atau timeout.',

    'bag.kaki.data': 'Data ditarik dari endpoint publik aiclub.id/api/v1/* serta halaman provinsi, kota, dan profil builder pada {tanggal}.',
    'bag.kaki.etika': 'robots.txt aiclub.id memasang Content-Signal search=yes, ai-train=no, use=reference dengan Allow: /. Halaman ini memperlakukan datanya sebagai referensi dan indeks — metadata dan tautan balik, tanpa memirror gambar atau isi karya, dan bukan sebagai bahan latih model.',
    'bag.kaki.cakupan': '{karya} dari {klaim} karya berhasil ditarik ({persen}%), mencakup {love} dari {loveKlaim} love. Hak cipta tiap karya ada pada pembuatnya masing-masing.',

    'grafik.kategori': 'KARYA PER KATEGORI',
    'grafik.sebar': '♥ AICLUB vs ★ GITHUB — {n} KARYA BERREPO',
    'grafik.celah': 'KEPADATAN TEMA — YANG JENUH DAN YANG KOSONG',
    'grafik.rapor': 'SEBARAN TINGKAT RAPOR',
    'grafik.sumbuX': 'bintang GitHub',
    'grafik.sumbuY': 'love aiclub',

    'tingkat.prima': 'prima', 'tingkat.sehat': 'sehat',
    'tingkat.rapuh': 'rapuh', 'tingkat.kritis': 'kritis',
  }),

  en: Object.freeze({
    'html.lang': 'en',
    'meta.judul': 'Nusantara Works Index',
    'meta.deskripsi': 'An index and health report for every project shown by Indonesia’s AI community on aiclub.id — each link checked, every gap mapped.',
    'nav.lain': 'Bahasa Indonesia',
    'nav.lainHref': '../',

    'kepala.eyebrow.crawl': 'Crawled {tanggal}',
    'kepala.eyebrow.sumber': 'Source: aiclub.id/api/v1',
    'kepala.eyebrow.cakupan': '{karya} projects · {builder} builders',
    'kepala.judul1': 'Nusantara Works',
    'kepala.judul2': 'Index',
    'kepala.lede': 'Every project the Indonesian AI community has shown on aiclub.id, pulled from its public endpoints, checked one by one for whether it is still alive, then scored. This page answers one question: which space is still genuinely empty.',

    'tile.karya': 'projects indexed',
    'tile.karya.ket': 'of {klaim} the site claims',
    'tile.rapor': 'mean health score',
    'tile.rapor.ket': 'out of 100 — alive, has a repo, licensed, maintained',
    'tile.mati': 'links already dead',
    'tile.mati.ket': '{persen}% failed when checked',
    'tile.repo': 'have a public repo',
    'tile.repo.ket': '{persen}% — {bintang} stars across the whole community',
    'tile.juara': 'loves to top the country',
    'tile.juara.ket': 'current peak is {puncak}',

    'bag.temuan': 'Four findings that decide the strategy',
    'bag.temuan.label': 'Analysis',
    'bag.temuan.intro': 'Every number here is recomputed from data/karya.json in this repo, not taken from the aiclub.id front page.',

    'temuan.1.judul': 'The work piles up in the application layer',
    'temuan.1.isi': 'Web and SaaS take half the showcase. The model category holds {model} entries — and not one is actually a model.',
    'temuan.2.judul': 'Love does not measure quality',
    'temuan.2.isi': 'Pearson correlation between aiclub loves and GitHub stars: {r}. The repo with {bintangTop} stars has {loveTop} loves.',
    'temuan.3.judul': 'The crowded themes are very crowded — the empty ones are truly empty',
    'temuan.3.isi': 'Keyword clustering over titles and taglines; one project can fall in several themes. The dashed rows are not quiet themes, they are themes at zero.',
    'temuan.4.judul': 'Most projects are not healthy',
    'temuan.4.isi': 'The score weighs seven things: a live link, a public repo, a licence, recent pushes, at least one love, an adequate tagline, and a link to the product itself.',

    'bag.indeks': 'Full index',
    'bag.indeks.intro': 'Click a title to open the project, the right column for its original page on aiclub.id. Status was checked with a GET request during the crawl.',
    'cari.placeholder': 'Search title, tagline, builder, city…',
    'saring.kategori': 'All categories',
    'saring.kota': 'All cities',
    'saring.mati': 'dead links only',
    'saring.repo': 'with a repo only',
    'hitung': '{n} of {total} projects',
    'kolom.karya': 'Project',
    'kolom.kategori': 'Category',
    'kolom.kota': 'City',
    'kolom.love': '♥ loves',
    'kolom.bintang': '★ github',
    'kolom.rapor': 'Score',
    'kolom.sumber': 'Source',
    'status.hidup': 'alive',
    'status.mati': 'dead',
    'tabel.kosong': 'No project matches that filter.',

    'bag.mati': 'Links that have already fallen over',
    'bag.mati.label': '{n} projects',
    'bag.mati.intro': 'Checked with a GET request. A "code" failure means the server answered with an error; "network" means DNS failed, the certificate was invalid, or it timed out.',

    'bag.kaki.data': 'Data pulled from the public endpoints at aiclub.id/api/v1/* plus province, city, and builder pages on {tanggal}.',
    'bag.kaki.etika': 'The aiclub.id robots.txt carries Content-Signal search=yes, ai-train=no, use=reference with Allow: /. This page treats that data as reference and index material — metadata and backlinks, with no mirroring of images or project content, and never as model training data.',
    'bag.kaki.cakupan': '{karya} of {klaim} projects were retrieved ({persen}%), covering {love} of {loveKlaim} loves. Each project remains the copyright of its author.',

    'grafik.kategori': 'PROJECTS PER CATEGORY',
    'grafik.sebar': '♥ AICLUB vs ★ GITHUB — {n} PROJECTS WITH A REPO',
    'grafik.celah': 'THEME DENSITY — CROWDED AND EMPTY',
    'grafik.rapor': 'HEALTH SCORE DISTRIBUTION',
    'grafik.sumbuX': 'GitHub stars',
    'grafik.sumbuY': 'aiclub loves',

    'tingkat.prima': 'excellent', 'tingkat.sehat': 'healthy',
    'tingkat.rapuh': 'fragile', 'tingkat.kritis': 'critical',
  }),
});

/**
 * Ambil terjemahan dan isi placeholder {nama}.
 * Melempar kalau kuncinya tidak ada — lebih baik gagal saat build daripada
 * menerbitkan halaman berisi "undefined".
 */
export function t(bahasa, kunci, isi = {}) {
  const kamus = KAMUS[bahasa];
  if (!kamus) throw new RangeError(`bahasa tak dikenal: ${bahasa}`);
  const nilai = kamus[kunci];
  if (nilai === undefined) throw new RangeError(`kunci hilang di "${bahasa}": ${kunci}`);
  return nilai.replace(/\{(\w+)\}/g, (cocok, nama) => {
    if (!(nama in isi)) throw new RangeError(`placeholder {${nama}} tidak diisi untuk kunci ${kunci}`);
    return String(isi[nama]);
  });
}

/** Semua placeholder yang dipakai sebuah teks. */
export function placeholder(teks) {
  return [...String(teks).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
