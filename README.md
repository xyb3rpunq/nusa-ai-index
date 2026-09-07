# nusa-ai-index

**Indeks dan rapor kesehatan ekosistem AI Indonesia.**
Setiap karya yang dipamerkan komunitas AI se-Nusantara di [aiclub.id](https://aiclub.id),
ditarik dari endpoint publiknya, dicek satu per satu apakah tautannya masih hidup,
lalu diberi rapor 0–100. Statis, dwibahasa (ID/EN), nol dependensi runtime.

[![AIClub.id Builder](https://aiclub.id/badge/s00_01M1S5MN7EQ6R3FFYPN965MKRW.svg?style=verified&theme=dark)](https://aiclub.id/builder/s00_01M1S5MN7EQ6R3FFYPN965MKRW)

🔗 **Live:** https://xyb3rpunq.github.io/nusa-ai-index/ · [English](https://xyb3rpunq.github.io/nusa-ai-index/en/)

---

## Kenapa ini ada

Komunitasnya besar — 2.760 builder terdaftar di 32 provinsi — tapi tidak ada satu pun
tempat untuk melihat keseluruhannya sekaligus. Halaman showcase aiclub.id mengunci
tampilannya di 60 karya teratas, halaman kota hanya menampilkan 6, dan tidak ada
yang mengecek apakah karya-karya itu masih hidup.

Repo ini mengisi itu, dan menjawab satu pertanyaan yang tidak bisa dijawab dengan
menggulir halaman showcase: **ruang apa yang masih benar-benar kosong.**

## Apa yang ditemukan

| | |
|---|---|
| Karya terindeks | **242** dari 296 yang diklaim (82% karya, 97% love) |
| Tautan sudah mati | **19** (7,9%) — 9 kode error, 10 gagal jaringan |
| Punya repo publik | **20** (8,3%) — total 162 bintang sekomunitas |
| Korelasi ♥ aiclub vs ★ GitHub | **−0,075** — nol |
| Rerata rapor kesehatan | **51,9** dari 100 |
| Kategori `model` | **3** karya, tidak satu pun benar-benar model |
| Love untuk juara nasional | **26** |

Repo dengan 41 bintang punya nol love. Karya dengan 18 love punya tiga bintang.
Papan peringkat komunitas mengukur siapa yang posting duluan, bukan apa yang dibangun.

## Rapor kesehatan

Tiap karya dinilai tujuh hal, total tepat 100:

| Komponen | Bobot | Lulus kalau |
|---|---|---|
| `hidup` | 40 | tautannya menjawab di bawah 400 saat dicek |
| `repo` | 25 | ada repo publik yang benar-benar bisa dibuka |
| `lisensi` | 10 | repo punya lisensi yang dikenali (bukan `NOASSERTION`) |
| `segar` | 10 | push terakhir dalam 180 hari |
| `dicintai` | 5 | pernah dapat minimal satu love |
| `dijelaskan` | 5 | tagline minimal 40 karakter |
| `produkSendiri` | 5 | tautannya bukan Lynk.id/YouTube/Instagram/share-link Gemini |

Tingkatnya: **prima** ≥85 · **sehat** ≥65 · **rapuh** ≥40 · **kritis** <40.
Arahkan kursor ke angka rapor di tabel untuk melihat komponen mana yang gagal.

## Struktur

```
nusa-ai-index/
├── src/
│   ├── engine.js     mesin hitung — murni, tanpa I/O, tanpa jam sistem
│   ├── charts.js     penggambar SVG + saringan URL
│   ├── i18n.js       kamus ID/EN
│   ├── render.js     perakit halaman
│   ├── build.js      satu-satunya berkas yang menyentuh disk
│   └── sanitize.js   buang isi komentar sebelum data masuk repo publik
├── tools/            crawler Python (dipanggil GitHub Actions tiap hari)
├── data/             dataset terbit — karya, builder, meta
├── docs/             keluaran build, dilayani GitHub Pages
└── test/             142 uji, nol dependensi
```

## Menjalankan

```bash
npm test          # 142 uji, tanpa instal apa pun
npm run build     # rakit docs/ dari data/
npm run periksa   # uji lalu build — dipakai CI
```

Refresh data (butuh Python 3 dan `gh` CLI yang sudah login):

```bash
python tools/scrape_aiclub.py && python tools/analisis.py && python tools/laporan.py && node src/sanitize.js && npm run periksa
```

GitHub Actions menjalankan rangkaian itu tiap hari pukul 04:17 WIB, lalu menerbitkan ulang.

## Cara datanya ditemukan

`/api/v1/showcase` mengembalikan tepat 60 item dan mengabaikan setiap parameter paginasi
(`limit`, `offset`, `page`, `cursor`, `sort` — dites satu per satu). Halaman provinsi dan
kota masing-masing merender 6 karya teratas. Sisanya ditemukan lewat fixpoint:

1. `/api/v1/showcase/<id>` memberi `memberId` pemiliknya;
2. `/builder/<memberId>` menampilkan **seluruh** karya milik orang itu;
3. `/api/v1/showcase/<id>/comments` memberi `memberId` para komentator;
4. ulangi sampai tidak ada ID baru.

Hasilnya 242 dari 296 karya. Yang tidak tertangkap adalah kiriman terbaru berlove-nol
yang tidak muncul di halaman mana pun dan pengirimnya belum pernah berkomentar.

## Etika & kepatuhan

`robots.txt` aiclub.id memasang Content-Signal `search=yes, ai-train=no, use=reference`
dengan `Allow: /`. Repo ini memperlakukan datanya sebagai **referensi dan indeks**:

- yang disimpan hanya metadata dan tautan balik — gambar karya tidak pernah dimirror;
- setiap kartu dan baris tabel menautkan balik ke halaman aslinya di aiclub.id;
- `src/sanitize.js` membuang isi komentar dan `memberId` komentator sebelum data
  masuk repo — jumlah komentar tetap ditampilkan, teksnya tidak;
- `docs/robots.txt` meneruskan sinyal `ai-train=no` dan menutup `/data/` dari crawler;
- data ini bukan bahan latih model, dan tidak dilisensikan ulang.

Pemilik karya yang ingin entrinya dihapus dari indeks ini bisa membuka issue —
akan dihapus tanpa pertanyaan.

## Font di-host sendiri

Halaman ini tidak melakukan **satu pun** permintaan jaringan keluar — termasuk untuk font.
Berkas woff2 subset latin disimpan di repo ini dan dilayani dari domain yang sama.

Itu bukan detail sepele: versi pertama memuat font dari Google Fonts sambil README-nya
mengklaim "nol permintaan jaringan keluar". Klaim itu tidak benar — setiap kunjungan
mengirimkan alamat IP pengunjung ke server pihak ketiga. `pdp-guard` menandainya sendiri
saat dipindai ke situs ini (`transfer-luar-negeri`), dan ada uji yang sekarang menolak
setiap sumber daya dari host luar supaya klaimnya tetap benar.

## Header keamanan di host statis

GitHub Pages tidak bisa menyetel header respons. Content-Security-Policy dan
Referrer-Policy tetap berlaku lewat `<meta>` dan sudah dipasang; Strict-Transport-Security
dan X-Content-Type-Options memang tidak bisa dari sana, dan itu dikatakan apa adanya
alih-alih dipura-purakan.

## Lisensi

Kode: [MIT](LICENSE). Metadata karya di `data/` berasal dari endpoint publik aiclub.id;
hak cipta tiap karya ada pada pembuatnya masing-masing.
