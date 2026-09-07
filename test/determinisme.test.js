import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep as sepPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(AKAR, 'docs');

/** Sidik seluruh isi docs/: jalur relatif + isinya, diurutkan supaya stabil. */
function sidikDocs() {
  const berkas = [];
  const telusuri = (d) => {
    for (const nama of readdirSync(d).sort()) {
      const p = join(d, nama);
      if (statSync(p).isDirectory()) telusuri(p);
      else berkas.push(p);
    }
  };
  telusuri(DOCS);
  const h = createHash('sha256');
  for (const p of berkas) {
    h.update(relative(DOCS, p).split(sepPath).join('/'));
    h.update(readFileSync(p));
  }
  return { sidik: h.digest('hex'), jumlah: berkas.length };
}

function bangun() {
  execFileSync(process.execPath, ['src/build.js'], { cwd: AKAR, stdio: 'pipe' });
}

test('build deterministik: dua kali jalan menghasilkan docs/ yang identik', () => {
  bangun();
  const pertama = sidikDocs();
  bangun();
  const kedua = sidikDocs();
  assert.equal(kedua.jumlah, pertama.jumlah, 'jumlah berkas berubah antar build');
  assert.equal(kedua.sidik, pertama.sidik,
    'isi docs/ berubah padahal tidak ada yang disunting — ada sumber ketidaktentuan '
    + '(jam mesin, waktu eksekusi, atau urutan yang tidak stabil) yang bocor ke keluaran');
});

test('build tidak membaca jam mesin', () => {
  const kode = readFileSync(join(AKAR, 'src', 'build.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const pola of [/new Date\(/, /Date\.now\(/, /performance\.now\(/]) {
    assert.ok(!pola.test(kode),
      `build.js membaca jam mesin (${pola}) — keluarannya jadi berubah tiap hari`);
  }
});

test('keluaran tidak memuat cap waktu selain tanggal terbit yang dicatat', () => {
  const sidikWaktu = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const telusuri = (d) => {
    for (const nama of readdirSync(d)) {
      const p = join(d, nama);
      if (statSync(p).isDirectory()) { telusuri(p); continue; }
      // Berkas di data/ adalah data terbitan: isinya boleh memuat tanggal yang
      // memang berasal dari sumbernya (misalnya tanggal karya dibuat). Keterulangannya
      // sudah dijamin uji sidik-ganda di atas; yang dijaga di sini adalah artefak
      // yang DIRENDER build, tempat jam mesin biasanya bocor.
      if (relative(DOCS, p).split(sepPath).join('/').startsWith('data/')) continue;
      if (!/\.(html|xml|txt|css|js)$/.test(nama)) continue;
      const isi = readFileSync(p, 'utf8');
      const m = isi.match(sidikWaktu);
      assert.equal(m, null,
        `${relative(DOCS, p)} memuat cap waktu "${m && m[0]}" — keluaran jadi tidak bisa diulang`);
    }
  };
  telusuri(DOCS);
});
