/**
 * Penggambar SVG. Murni: masuk angka, keluar string SVG.
 *
 * Aturan yang dijaga uji di test/charts.test.js:
 *  - setiap label sumbu menyebut nilai yang benar-benar dijangkau grafik;
 *  - tidak ada bentuk yang keluar dari viewBox;
 *  - warna diambil dari token tema, tidak pernah literal, supaya terang/gelap ikut;
 *  - teks yang berasal dari data selalu di-escape.
 */

/**
 * Saring URL sebelum masuk atribut href.
 *
 * Escaping saja tidak cukup: `javascript:alert(1)` lolos dari escaping tapi tetap
 * berjalan saat diklik. URL di dataset ini diketik sendiri oleh pemilik karya,
 * jadi hanya skema yang jelas aman yang diloloskan.
 */
export function urlAman(url) {
  const u = String(url ?? '').trim();
  if (u === '') return '#';
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[/#]/.test(u)) return u;          // tautan relatif di situs ini sendiri
  return '#';
}

export function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const bulat = (n) => Math.round(n * 100) / 100;

/**
 * Batang horizontal.
 * @param {{judul:string, data:Array<{label:string,nilai:number,kelas?:string,ekor?:string}>,
 *          lebar?:number, lebarLabel?:number, tinggiBaris?:number, ruangEkor?:number}} o
 */
export function batangHorizontal(o) {
  const {
    judul, data, lebar = 640, lebarLabel = 150, tinggiBaris = 30, ruangEkor = 92,
  } = o;
  if (!Array.isArray(data) || data.length === 0) return kosong(judul, lebar);

  const atas = 26, bawah = 10;
  const tinggi = atas + data.length * tinggiBaris + bawah;
  const maks = Math.max(...data.map((d) => d.nilai), 1);
  const trek = lebar - lebarLabel - ruangEkor;

  const p = [`<svg viewBox="0 0 ${lebar} ${tinggi}" class="grafik" role="img" aria-label="${escXml(judul)}">`];
  p.push(`<text x="0" y="14" class="g-cap">${escXml(judul)}</text>`);
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const y = atas + i * tinggiBaris;
    const w = maks > 0 ? bulat((trek * d.nilai) / maks) : 0;
    const tinggiBatang = tinggiBaris - 12;
    p.push(`<text x="${lebarLabel - 10}" y="${y + tinggiBatang - 3}" class="g-lbl" text-anchor="end">${escXml(d.label)}</text>`);
    if (d.nilai === 0) {
      p.push(`<rect x="${lebarLabel}" y="${y + 2}" width="42" height="${tinggiBatang}" rx="2" class="g-bar-kosong"/>`);
    } else {
      p.push(`<rect x="${lebarLabel}" y="${y + 2}" width="${Math.max(w, 2)}" height="${tinggiBatang}" rx="2" class="g-bar ${escXml(d.kelas || '')}"/>`);
    }
    const xTeks = lebarLabel + Math.max(w, d.nilai === 0 ? 42 : 2) + 8;
    p.push(`<text x="${bulat(xTeks)}" y="${y + tinggiBatang - 3}" class="g-num">${escXml(String(d.nilai))}</text>`);
    if (d.ekor) {
      p.push(`<text x="${bulat(xTeks + 26)}" y="${y + tinggiBatang - 3}" class="g-num g-dim">${escXml(d.ekor)}</text>`);
    }
  }
  p.push('</svg>');
  return p.join('');
}

/**
 * Sebar dua sumbu. Sumbu ditandai dengan tik yang benar-benar dijangkau data.
 * @param {{judul:string, titik:Array<{x:number,y:number,nama:string}>,
 *          lebar?:number, tinggi?:number, labelX:string, labelY:string}} o
 */
export function sebar(o) {
  const { judul, titik, lebar = 640, tinggi = 300, labelX, labelY } = o;
  if (!Array.isArray(titik) || titik.length === 0) return kosong(judul, lebar);

  const kiri = 54, kanan = 18, atas = 32, bawah = 44;
  const xMaks = tikMaks(Math.max(...titik.map((t) => t.x)));
  const yMaks = tikMaks(Math.max(...titik.map((t) => t.y)));
  const sx = (v) => bulat(kiri + ((lebar - kiri - kanan) * v) / (xMaks || 1));
  const sy = (v) => bulat(tinggi - bawah - ((tinggi - atas - bawah) * v) / (yMaks || 1));

  const p = [`<svg viewBox="0 0 ${lebar} ${tinggi}" class="grafik" role="img" aria-label="${escXml(judul)}">`];
  p.push(`<text x="0" y="14" class="g-cap">${escXml(judul)}</text>`);
  for (const v of tik(yMaks)) {
    p.push(`<line x1="${kiri}" y1="${sy(v)}" x2="${lebar - kanan}" y2="${sy(v)}" class="g-grid"/>`);
    p.push(`<text x="${kiri - 8}" y="${sy(v) + 4}" class="g-tik" text-anchor="end">${v}</text>`);
  }
  for (const v of tik(xMaks)) {
    p.push(`<text x="${sx(v)}" y="${tinggi - bawah + 18}" class="g-tik" text-anchor="middle">${v}</text>`);
  }
  p.push(`<line x1="${kiri}" y1="${sy(0)}" x2="${lebar - kanan}" y2="${sy(0)}" class="g-axis"/>`);
  p.push(`<text x="${bulat((kiri + lebar - kanan) / 2)}" y="${tinggi - 6}" class="g-tik g-dim" text-anchor="middle">${escXml(labelX)}</text>`);
  const my = bulat((atas + tinggi - bawah) / 2);
  p.push(`<text x="14" y="${my}" class="g-tik g-dim" text-anchor="middle" transform="rotate(-90 14 ${my})">${escXml(labelY)}</text>`);
  for (const t of titik) {
    p.push(`<circle cx="${sx(t.x)}" cy="${sy(t.y)}" r="5" class="g-dot"><title>${escXml(t.nama)} — ${t.x} / ${t.y}</title></circle>`);
  }
  p.push('</svg>');
  return p.join('');
}

/**
 * Batang bertumpuk satu baris — dipakai untuk sebaran tingkat rapor.
 * @param {{judul:string, bagian:Array<{label:string,nilai:number,kelas:string}>, lebar?:number}} o
 */
export function tumpuk(o) {
  const { judul, bagian, lebar = 640 } = o;
  const total = bagian.reduce((a, b) => a + b.nilai, 0);
  if (total === 0) return kosong(judul, lebar);

  const tinggi = 92, yBar = 28, tBar = 26;
  const p = [`<svg viewBox="0 0 ${lebar} ${tinggi}" class="grafik" role="img" aria-label="${escXml(judul)}">`];
  p.push(`<text x="0" y="14" class="g-cap">${escXml(judul)}</text>`);
  let x = 0;
  for (const b of bagian) {
    const w = bulat((lebar * b.nilai) / total);
    if (w > 0) {
      p.push(`<rect x="${bulat(x)}" y="${yBar}" width="${w}" height="${tBar}" class="g-seg ${escXml(b.kelas)}"><title>${escXml(b.label)}: ${b.nilai}</title></rect>`);
    }
    x += w;
  }
  let lx = 0;
  for (const b of bagian) {
    if (b.nilai === 0) continue;
    p.push(`<rect x="${lx}" y="${yBar + tBar + 14}" width="9" height="9" class="g-seg ${escXml(b.kelas)}"/>`);
    p.push(`<text x="${lx + 14}" y="${yBar + tBar + 22}" class="g-tik">${escXml(b.label)} ${b.nilai}</text>`);
    lx += 26 + String(b.label).length * 6.4 + String(b.nilai).length * 6.4;
  }
  p.push('</svg>');
  return p.join('');
}

function kosong(judul, lebar) {
  return `<svg viewBox="0 0 ${lebar} 48" class="grafik" role="img" aria-label="${escXml(judul)}">`
    + `<text x="0" y="14" class="g-cap">${escXml(judul)}</text>`
    + `<text x="0" y="38" class="g-tik g-dim">tidak ada data</text></svg>`;
}

/** Bulatkan batas atas sumbu ke kelipatan yang enak dibaca. */
export function tikMaks(nilai) {
  if (!Number.isFinite(nilai) || nilai <= 0) return 1;
  const langkah = langkahTik(nilai);
  return Math.ceil(nilai / langkah) * langkah;
}

/** Deret tik sumbu dari 0 sampai maks. */
export function tik(maks) {
  const langkah = langkahTik(maks);
  const out = [];
  for (let v = 0; v <= maks + 1e-9; v += langkah) out.push(Math.round(v * 1000) / 1000);
  return out;
}

function langkahTik(maks) {
  if (maks <= 5) return 1;
  if (maks <= 20) return 5;
  if (maks <= 60) return 10;
  if (maks <= 150) return 25;
  if (maks <= 400) return 50;
  return Math.pow(10, Math.floor(Math.log10(maks)));
}
