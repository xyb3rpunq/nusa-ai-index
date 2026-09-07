import test from 'node:test';
import assert from 'node:assert/strict';
import { escXml, batangHorizontal, sebar, tumpuk, tik, tikMaks } from '../src/charts.js';

/** Ambil viewBox sebuah SVG sebagai angka. */
function viewBox(svg) {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  assert.ok(m, 'viewBox tidak ditemukan');
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** Semua koordinat x/y yang digambar, untuk memastikan tidak keluar bingkai. */
function koordinat(svg) {
  const out = [];
  for (const m of svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    out.push({ x: Number(m[1]), y: Number(m[2]), x2: Number(m[1]) + Number(m[3]), y2: Number(m[2]) + Number(m[4]) });
  }
  for (const m of svg.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"/g)) {
    out.push({ x: Number(m[1]) - Number(m[3]), y: Number(m[2]) - Number(m[3]),
               x2: Number(m[1]) + Number(m[3]), y2: Number(m[2]) + Number(m[3]) });
  }
  return out;
}

const CONTOH = [
  { label: 'Web', nilai: 65, ekor: '♥76' },
  { label: 'SaaS', nilai: 60, ekor: '♥102' },
  { label: 'Model', nilai: 3, ekor: '♥2' },
];

// ---------------------------------------------------------------- escXml

test('escXml melarikan semua karakter berbahaya', () => {
  assert.equal(escXml('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
});

test('escXml mengubah null dan undefined jadi string kosong', () => {
  assert.equal(escXml(null), '');
  assert.equal(escXml(undefined), '');
});

test('escXml mengurus ampersand lebih dulu supaya tidak dobel-escape', () => {
  assert.equal(escXml('&lt;'), '&amp;lt;');
});

// ---------------------------------------------------------------- batang

test('batangHorizontal menghasilkan SVG yang tertutup rapi', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH });
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.endsWith('</svg>'));
  assert.equal((svg.match(/<svg/g) || []).length, 1);
});

test('batangHorizontal menggambar satu batang per baris data', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH });
  assert.equal((svg.match(/<rect /g) || []).length, CONTOH.length);
});

test('batangHorizontal menulis setiap label dan setiap nilai', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH });
  for (const d of CONTOH) {
    assert.ok(svg.includes(`>${d.label}<`), `label ${d.label} hilang`);
    assert.ok(svg.includes(`>${d.nilai}<`), `nilai ${d.nilai} hilang`);
    assert.ok(svg.includes(`>${d.ekor}<`), `ekor ${d.ekor} hilang`);
  }
});

test('batangHorizontal: batang terpanjang tepat sepanjang treknya, tidak lebih', () => {
  const lebar = 640, lebarLabel = 150, ruangEkor = 92;
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH, lebar, lebarLabel, ruangEkor });
  const lebarBatang = [...svg.matchAll(/<rect x="\d+" y="[\d.]+" width="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(Math.max(...lebarBatang), lebar - lebarLabel - ruangEkor);
});

test('batangHorizontal: tidak ada bentuk yang keluar dari viewBox', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH });
  const { w, h } = viewBox(svg);
  for (const k of koordinat(svg)) {
    assert.ok(k.x >= 0 && k.y >= 0, `bentuk mulai di luar bingkai: ${JSON.stringify(k)}`);
    assert.ok(k.x2 <= w, `bentuk melewati lebar ${w}: ${JSON.stringify(k)}`);
    assert.ok(k.y2 <= h, `bentuk melewati tinggi ${h}: ${JSON.stringify(k)}`);
  }
});

test('batangHorizontal memberi tanda khusus untuk nilai nol, bukan batang tak terlihat', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: [{ label: 'Kosong', nilai: 0 }] });
  assert.ok(svg.includes('g-bar-kosong'));
});

test('batangHorizontal atas data kosong tetap SVG sah', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: [] });
  assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'));
  assert.ok(svg.includes('tidak ada data'));
});

test('batangHorizontal melarikan label yang mengandung markup', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: [{ label: '<script>x</script>', nilai: 1 }] });
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
});

test('batangHorizontal tidak memakai warna literal, hanya kelas tema', () => {
  const svg = batangHorizontal({ judul: 'Uji', data: CONTOH });
  assert.equal(/fill="#|stroke="#|fill="rgb|style="fill/.test(svg), false);
});

// ---------------------------------------------------------------- sebar

const TITIK = [
  { x: 41, y: 0, nama: 'clopen' },
  { x: 36, y: 3, nama: 'teledrive' },
  { x: 3, y: 18, nama: 'moneymate' },
];

test('sebar menggambar satu lingkaran per titik', () => {
  const svg = sebar({ judul: 'Uji', titik: TITIK, labelX: 'bintang', labelY: 'love' });
  assert.equal((svg.match(/<circle /g) || []).length, TITIK.length);
});

test('sebar: setiap titik punya judul tooltip yang menyebut namanya', () => {
  const svg = sebar({ judul: 'Uji', titik: TITIK, labelX: 'bintang', labelY: 'love' });
  for (const t of TITIK) assert.ok(svg.includes(`${t.nama} — ${t.x} / ${t.y}`));
});

test('sebar: label sumbu tertinggi mencakup nilai data terbesar', () => {
  const svg = sebar({ judul: 'Uji', titik: TITIK, labelX: 'bintang', labelY: 'love' });
  const tikTerlihat = [...svg.matchAll(/class="g-tik"[^>]*>(\d+)</g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...tikTerlihat) >= 41, 'sumbu tidak menjangkau nilai terbesar');
});

test('sebar: tidak ada titik yang keluar dari viewBox', () => {
  const svg = sebar({ judul: 'Uji', titik: TITIK, labelX: 'bintang', labelY: 'love' });
  const { w, h } = viewBox(svg);
  for (const k of koordinat(svg)) {
    assert.ok(k.x >= 0 && k.y >= 0 && k.x2 <= w && k.y2 <= h, `keluar bingkai: ${JSON.stringify(k)}`);
  }
});

test('sebar dengan satu titik tetap menggambar sumbu yang sah', () => {
  const svg = sebar({ judul: 'Uji', titik: [{ x: 0, y: 0, nama: 'a' }], labelX: 'x', labelY: 'y' });
  assert.ok(svg.includes('<circle '));
  assert.ok(!svg.includes('NaN'));
});

test('sebar atas titik kosong tidak melempar', () => {
  const svg = sebar({ judul: 'Uji', titik: [], labelX: 'x', labelY: 'y' });
  assert.ok(svg.includes('tidak ada data'));
});

// ---------------------------------------------------------------- tumpuk

const BAGIAN = [
  { label: 'prima', nilai: 5, kelas: 's-prima' },
  { label: 'sehat', nilai: 15, kelas: 's-sehat' },
  { label: 'rapuh', nilai: 200, kelas: 's-rapuh' },
  { label: 'kritis', nilai: 22, kelas: 's-kritis' },
];

test('tumpuk melebar tepat selebar viewBox-nya', () => {
  const lebar = 640;
  const svg = tumpuk({ judul: 'Uji', bagian: BAGIAN, lebar });
  const segmen = [...svg.matchAll(/<rect x="([\d.]+)" y="28" width="([\d.]+)"/g)]
    .map((m) => ({ x: Number(m[1]), w: Number(m[2]) }));
  const ujung = segmen[segmen.length - 1];
  assert.ok(Math.abs(ujung.x + ujung.w - lebar) <= 1, `ujung ${ujung.x + ujung.w} != ${lebar}`);
});

test('tumpuk melewati bagian bernilai nol tanpa meninggalkan celah', () => {
  const svg = tumpuk({ judul: 'Uji', bagian: [{ label: 'a', nilai: 0, kelas: 'x' }, { label: 'b', nilai: 5, kelas: 'y' }] });
  assert.equal((svg.match(/<rect x="[\d.]+" y="28"/g) || []).length, 1);
});

test('tumpuk atas total nol menghasilkan pesan, bukan pembagian nol', () => {
  const svg = tumpuk({ judul: 'Uji', bagian: [{ label: 'a', nilai: 0, kelas: 'x' }] });
  assert.ok(svg.includes('tidak ada data'));
  assert.ok(!svg.includes('NaN'));
});

// ---------------------------------------------------------------- sumbu

test('tikMaks membulatkan ke atas, tidak pernah memotong data', () => {
  for (const v of [1, 3, 7, 18, 41, 63, 99, 242, 1234]) {
    assert.ok(tikMaks(v) >= v, `tikMaks(${v}) = ${tikMaks(v)} lebih kecil dari data`);
  }
});

test('tikMaks aman untuk nol dan masukan tak sah', () => {
  assert.equal(tikMaks(0), 1);
  assert.equal(tikMaks(-5), 1);
  assert.equal(tikMaks(NaN), 1);
});

test('tik selalu mulai dari nol dan berakhir di maks', () => {
  for (const m of [1, 5, 20, 45, 100, 250]) {
    const t = tik(tikMaks(m));
    assert.equal(t[0], 0);
    assert.equal(t[t.length - 1], tikMaks(m));
  }
});

test('tik menghasilkan jumlah tik yang wajar dibaca', () => {
  for (const m of [5, 20, 45, 100, 250, 1000]) {
    const t = tik(tikMaks(m));
    assert.ok(t.length >= 2 && t.length <= 12, `maks ${m} menghasilkan ${t.length} tik`);
  }
});
