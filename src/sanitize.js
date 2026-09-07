/**
 * Bersihkan hasil crawl mentah sebelum masuk repo publik.
 *
 * Yang dibuang:
 *  - commentList  : isi komentar dan memberId komentator. Jumlahnya tetap
 *                   disimpan di kolom `comments`, tapi teksnya milik penulisnya
 *                   dan tidak diterbitkan ulang di sini.
 *  - httpNote     : pesan galat mentah bisa memuat nama host internal; yang
 *                   dibutuhkan halaman cuma jenis kegagalannya.
 *
 *   node src/sanitize.js [sumber.json] [tujuan.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Kolom yang tidak pernah ikut terbit. */
export const DIBUANG = Object.freeze(['commentList', 'imageKey', 'featured']);

/** Ringkas pesan galat jadi jenis yang aman ditampilkan. */
export function jenisGagal(httpStatus, httpNote) {
  if (httpStatus) return `http ${httpStatus}`;
  const n = String(httpNote || '').toLowerCase();
  if (n.includes('timeout') || n.includes('timed out')) return 'timeout';
  if (n.includes('ssl') || n.includes('certificate')) return 'sertifikat tidak sah';
  if (n.includes('getaddrinfo') || n.includes('name or service') || n.includes('11001')) return 'DNS gagal';
  if (n.includes('urlerror') || n.includes('connection')) return 'koneksi gagal';
  return n ? 'gagal' : '';
}

export function bersihkan(rows) {
  return rows.map((r) => {
    const keluar = { ...r };
    for (const k of DIBUANG) delete keluar[k];
    keluar.httpNote = jenisGagal(r.httpStatus, r.httpNote);
    if (!keluar.urlBersih) keluar.urlBersih = keluar.url || '';
    return keluar;
  });
}

function main() {
  const sumber = process.argv[2] || join(AKAR, 'data', 'karya.json');
  const tujuan = process.argv[3] || sumber;
  const rows = JSON.parse(readFileSync(sumber, 'utf8'));
  const bersih = bersihkan(rows);
  const dibuang = rows.filter((r) => r.commentList?.length).length;
  writeFileSync(tujuan, JSON.stringify(bersih, null, 1), 'utf8');
  console.log(`bersih: ${bersih.length} karya, isi komentar dibuang dari ${dibuang} karya -> ${tujuan}`);
}

if (process.argv[1]?.endsWith('sanitize.js')) main();
