/**
 * Perakit halaman. Murni: masuk data, keluar string HTML.
 * Tidak menyentuh berkas — itu tugas build.js.
 */
import { t } from './i18n.js';
import { escXml, urlAman, batangHorizontal, sebar, tumpuk } from './charts.js';
import { KATEGORI, raporKarya } from './engine.js';

const esc = escXml;
const href = (u) => escXml(urlAman(u));
const persen = (a, b) => (b === 0 ? '0' : ((a / b) * 100).toFixed(1).replace(/\.0$/, ''));

const TINGKAT = ['prima', 'sehat', 'rapuh', 'kritis'];

// ---------------------------------------------------------------- bagian

function kepala(b, r, meta) {
  const tiles = [
    [r.total, t(b, 'tile.karya'), t(b, 'tile.karya.ket', { klaim: meta.karyaDiklaim })],
    [Math.round(r.raporRerata), t(b, 'tile.rapor'), t(b, 'tile.rapor.ket')],
    [r.mati, t(b, 'tile.mati'), t(b, 'tile.mati.ket', { persen: persen(r.mati, r.total) })],
    [r.berepo, t(b, 'tile.repo'), t(b, 'tile.repo.ket', { persen: persen(r.berepo, r.total), bintang: r.totalBintang })],
    [r.juara.butuh, t(b, 'tile.juara'), t(b, 'tile.juara.ket', { puncak: r.juara.puncak })],
  ].map(([n, l, k]) => `<div class="tile"><b>${esc(n)}</b><span>${esc(l)}</span><small>${esc(k)}</small></div>`).join('');

  return `<header class="mast">
  <div class="eyebrow">
    <span>${esc(t(b, 'kepala.eyebrow.crawl', { tanggal: meta.tanggal }))}</span><span aria-hidden="true">·</span>
    <span>${esc(t(b, 'kepala.eyebrow.sumber'))}</span><span aria-hidden="true">·</span>
    <span>${esc(t(b, 'kepala.eyebrow.cakupan', { karya: r.total, builder: meta.builder }))}</span>
    <a class="ganti-bahasa" href="${esc(t(b, 'nav.lainHref'))}" hreflang="${b === 'id' ? 'en' : 'id'}">${esc(t(b, 'nav.lain'))}</a>
  </div>
  <h1>${esc(t(b, 'kepala.judul1'))} <em>${esc(t(b, 'kepala.judul2'))}</em></h1>
  <p class="lede">${esc(t(b, 'kepala.lede'))}</p>
  <div class="tiles">${tiles}</div>
</header>`;
}

function temuan(b, r) {
  const bar = batangHorizontal({
    judul: t(b, 'grafik.kategori'),
    data: r.perKategori.map(([k, n]) => ({
      label: KATEGORI[k] ?? k, nilai: n,
      kelas: k === 'model' ? 'g-bar-sorot' : '',
      ekor: '♥' + (r.loveKategori.find(([kk]) => kk === k)?.[1] ?? 0),
    })),
  });

  const titik = r.bintang.titik.map((p) => ({ x: p.star, y: p.love, nama: p.slug }));
  const sc = sebar({
    judul: t(b, 'grafik.sebar', { n: titik.length }), titik,
    labelX: t(b, 'grafik.sumbuX'), labelY: t(b, 'grafik.sumbuY'),
  });

  const celah = batangHorizontal({
    judul: t(b, 'grafik.celah'), lebarLabel: 216, tinggiBaris: 26, ruangEkor: 56,
    data: r.celah.map((c) => ({ label: c.tema, nilai: c.n, kelas: `g-nilai-${c.nilai}` })),
  });

  const raporGrafik = tumpuk({
    judul: t(b, 'grafik.rapor'),
    bagian: TINGKAT.map((tk) => ({
      label: t(b, `tingkat.${tk}`),
      nilai: r.perTingkat.find(([k]) => k === tk)?.[1] ?? 0,
      kelas: `s-${tk}`,
    })),
  });

  const top = r.bintang.titik[0] ?? { star: 0, love: 0 };
  const rTeks = r.bintang.korelasi === null ? '—' : r.bintang.korelasi.toFixed(3).replace('-', '−');
  const model = r.perKategori.find(([k]) => k === 'model')?.[1] ?? 0;

  const panel = (kelas, judul, isi, grafik) =>
    `<div class="panel ${kelas}"><h3>${esc(judul)}</h3><p>${esc(isi)}</p>${grafik}</div>`;

  return `<section id="temuan">
  <div class="sec-h"><h2>${esc(t(b, 'bag.temuan'))}</h2><span>${esc(t(b, 'bag.temuan.label'))}</span></div>
  <p class="sec-p">${esc(t(b, 'bag.temuan.intro'))}</p>
  <div class="temuan">
    ${panel('', t(b, 'temuan.1.judul'), t(b, 'temuan.1.isi', { model }), bar)}
    ${panel('', t(b, 'temuan.2.judul'), t(b, 'temuan.2.isi', { r: rTeks, bintangTop: top.star, loveTop: top.love }), sc)}
    ${panel('wide', t(b, 'temuan.4.judul'), t(b, 'temuan.4.isi'), raporGrafik)}
    ${panel('wide', t(b, 'temuan.3.judul'), t(b, 'temuan.3.isi'), celah)}
  </div>
</section>`;
}

function barisTabel(b, rows, sekarangISO) {
  const out = [];
  for (const k of rows) {
    const rp = raporKarya(k, sekarangISO);
    const gh = k.github?.ada ? k.github : null;
    const cari = [k.title, k.tagline, k.author, k.cityName, (k.tema || []).join(' ')]
      .join(' ').toLowerCase();
    out.push(`<tr data-k="${esc(k.category)}" data-kota="${esc(k.cityName || '')}" `
      + `data-hidup="${k.hidup ? 1 : 0}" data-repo="${gh ? 1 : 0}" `
      + `data-love="${k.love || 0}" data-star="${gh ? gh.stars : 0}" data-rapor="${rp.skor}" `
      + `data-cari="${esc(cari)}">`
      + `<td class="c-jud"><a href="${href(k.urlBersih || k.url)}" target="_blank" rel="noopener noreferrer">${esc(k.title)}</a>`
      + `<span class="tag">${esc(String(k.tagline || '').replace(/[\r\n]+/g, ' ').slice(0, 132))}</span></td>`
      + `<td class="c-kat"><span class="pill p-${esc(k.category)}">${esc(KATEGORI[k.category] ?? k.category ?? '-')}</span></td>`
      + `<td class="c-kota">${esc(k.cityName || '—')}<small>${esc(k.provinceName || '')}</small></td>`
      + `<td class="c-num">${k.love || 0}</td>`
      + `<td class="c-num">${gh ? '★' + gh.stars : '—'}</td>`
      + `<td class="c-rap"><span class="rap r-${rp.tingkat}" title="${esc(rincianJudul(b, rp))}">${rp.skor}</span></td>`
      + `<td class="c-src"><a href="${href(k.page)}" target="_blank" rel="noopener noreferrer">aiclub ↗</a></td>`
      + `</tr>`);
  }
  return out.join('\n');
}

function rincianJudul(b, rp) {
  return Object.entries(rp.rincian).map(([k, v]) => `${v ? '✓' : '✗'} ${k}`).join(' · ')
    + ` — ${t(b, `tingkat.${rp.tingkat}`)}`;
}

function indeks(b, rows, r, sekarangISO) {
  const kota = [...new Set(rows.map((k) => k.cityName).filter(Boolean))].sort();
  const optKota = kota.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
  const optKat = Object.entries(KATEGORI).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');

  return `<section id="indeks">
  <div class="sec-h"><h2>${esc(t(b, 'bag.indeks'))}</h2><span>${r.total}</span></div>
  <p class="sec-p">${esc(t(b, 'bag.indeks.intro'))}</p>
  <div class="tools">
    <input id="q" type="search" placeholder="${esc(t(b, 'cari.placeholder'))}" aria-label="${esc(t(b, 'cari.placeholder'))}">
    <select id="fk" aria-label="${esc(t(b, 'saring.kategori'))}"><option value="">${esc(t(b, 'saring.kategori'))}</option>${optKat}</select>
    <select id="fc" aria-label="${esc(t(b, 'saring.kota'))}"><option value="">${esc(t(b, 'saring.kota'))}</option>${optKota}</select>
    <label><input type="checkbox" id="fm"> ${esc(t(b, 'saring.mati'))}</label>
    <label><input type="checkbox" id="fr"> ${esc(t(b, 'saring.repo'))}</label>
    <span id="hitung" data-pola="${esc(t(b, 'hitung', { n: '@N@', total: '@T@' }))}"></span>
  </div>
  <div class="tbl-scroll">
    <table>
      <thead><tr>
        <th>${esc(t(b, 'kolom.karya'))}</th>
        <th>${esc(t(b, 'kolom.kategori'))}</th>
        <th>${esc(t(b, 'kolom.kota'))}</th>
        <th class="s c-num" data-s="love">${esc(t(b, 'kolom.love'))}</th>
        <th class="s c-num" data-s="star">${esc(t(b, 'kolom.bintang'))}</th>
        <th class="s c-num" data-s="rapor">${esc(t(b, 'kolom.rapor'))}</th>
        <th>${esc(t(b, 'kolom.sumber'))}</th>
      </tr></thead>
      <tbody id="tb">
${barisTabel(b, rows, sekarangISO)}
      </tbody>
    </table>
    <p id="kosong" class="tbl-kosong" hidden>${esc(t(b, 'tabel.kosong'))}</p>
  </div>
</section>`;
}

function bagianMati(b, r) {
  const baris = r.daftarMati.map((m) => `<tr>
    <td><a href="${href(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a></td>
    <td class="c-num">${m.status ?? '—'}</td>
    <td><span class="pill p-${esc(m.jenis)}">${esc(m.jenis)}</span></td>
    <td class="mono">${esc(m.catatan.slice(0, 64))}</td>
  </tr>`).join('');

  return `<section id="mati">
  <div class="sec-h"><h2>${esc(t(b, 'bag.mati'))}</h2><span>${esc(t(b, 'bag.mati.label', { n: r.daftarMati.length }))}</span></div>
  <p class="sec-p">${esc(t(b, 'bag.mati.intro'))}</p>
  <div class="tbl-scroll jangan"><table>
    <thead><tr><th>${esc(t(b, 'kolom.karya'))}</th><th class="c-num">HTTP</th><th>&nbsp;</th><th>&nbsp;</th></tr></thead>
    <tbody>${baris}</tbody>
  </table></div>
</section>`;
}

function kaki(b, r, meta) {
  return `<footer>
  <p>${esc(t(b, 'bag.kaki.data', { tanggal: meta.tanggal }))}</p>
  <p>${esc(t(b, 'bag.kaki.etika'))}</p>
  <p>${esc(t(b, 'bag.kaki.cakupan', {
    karya: r.total, klaim: meta.karyaDiklaim,
    persen: persen(r.total, meta.karyaDiklaim),
    love: r.totalLove, loveKlaim: meta.loveDiklaim,
  }))}</p>
</footer>`;
}

// ---------------------------------------------------------------- halaman

export function halaman({ bahasa, rows, ringkasan, meta }) {
  const b = bahasa;
  const r = ringkasan;
  const sekarangISO = meta.sekarangISO;

  return `<!doctype html>
<html lang="${esc(t(b, 'html.lang'))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t(b, 'meta.judul'))}</title>
<meta name="description" content="${esc(t(b, 'meta.deskripsi'))}">
<meta property="og:title" content="${esc(t(b, 'meta.judul'))}">
<meta property="og:description" content="${esc(t(b, 'meta.deskripsi'))}">
<meta property="og:type" content="website">
<link rel="alternate" hreflang="id" href="${esc(meta.basis)}/">
<link rel="alternate" hreflang="en" href="${esc(meta.basis)}/en/">
<link rel="alternate" hreflang="x-default" href="${esc(meta.basis)}/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>${GAYA}</style>
</head>
<body>
<div class="wrap">
${kepala(b, r, meta)}
${temuan(b, r)}
${indeks(b, rows, r, sekarangISO)}
${bagianMati(b, r)}
${kaki(b, r, meta)}
</div>
<script>${SKRIP}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- gaya

export const GAYA = `
:root{
  --ground:#F1F3F7; --surface:#FFFFFF; --sunken:#E7EAF1;
  --ink:#14182A; --ink-2:#414963; --ink-3:#6D7590;
  --rule:#D8DDE8; --rule-2:#C3CADA;
  --nila:#27379B; --nila-soft:#5567CE; --kunyit:#B07806;
  --good:#12705A; --bad:#A6321E; --warn:#B07806; --chip:#E4E8F3;
  --disp:"Bricolage Grotesque",system-ui,sans-serif;
  --body:"Newsreader",Georgia,serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0C0F19; --surface:#141827; --sunken:#1B2032;
    --ink:#E8EAF3; --ink-2:#B3BAD0; --ink-3:#848CA6;
    --rule:#252B40; --rule-2:#333A52;
    --nila:#8E9CF7; --nila-soft:#6F7FE0; --kunyit:#E0A93C;
    --good:#4FBF9B; --bad:#F0836A; --warn:#E0A93C; --chip:#1F253A;
  }
}
:root[data-theme="dark"]{
  --ground:#0C0F19; --surface:#141827; --sunken:#1B2032;
  --ink:#E8EAF3; --ink-2:#B3BAD0; --ink-3:#848CA6;
  --rule:#252B40; --rule-2:#333A52;
  --nila:#8E9CF7; --nila-soft:#6F7FE0; --kunyit:#E0A93C;
  --good:#4FBF9B; --bad:#F0836A; --warn:#E0A93C; --chip:#1F253A;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--body);
  font-size:16.5px;line-height:1.62;-webkit-font-smoothing:antialiased}
img{max-width:100%}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px 96px}
h1,h2,h3{font-family:var(--disp);font-weight:700;text-wrap:balance;margin:0;line-height:1.12}
a{color:var(--nila);text-underline-offset:3px;text-decoration-thickness:1px}
a:focus-visible,select:focus-visible,input:focus-visible,th:focus-visible{
  outline:2px solid var(--nila);outline-offset:2px;border-radius:2px}
code,.mono{font-family:var(--mono);font-size:.88em}

.mast{padding:52px 0 30px;border-bottom:1px solid var(--rule)}
.eyebrow{font-family:var(--mono);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--ink-3);display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.ganti-bahasa{margin-left:auto;letter-spacing:.1em;text-transform:none;font-size:12px}
h1{font-size:clamp(38px,6.4vw,68px);font-weight:800;letter-spacing:-.028em;margin:16px 0 0}
h1 em{font-style:normal;color:var(--nila)}
.lede{max-width:64ch;color:var(--ink-2);font-size:19px;margin:16px 0 0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));margin-top:34px;
  border-top:1px solid var(--rule)}
.tile{padding:18px 20px 18px 0;border-right:1px solid var(--rule);display:flex;flex-direction:column}
.tile:last-child{border-right:0}
.tile b{font-family:var(--disp);font-size:38px;font-weight:800;letter-spacing:-.03em;
  line-height:1;font-variant-numeric:tabular-nums}
.tile span{font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-2);margin-top:7px}
.tile small{color:var(--ink-3);font-size:13.5px;line-height:1.4;margin-top:2px}

section{margin-top:62px}
.sec-h{display:flex;align-items:baseline;gap:16px;border-bottom:2px solid var(--ink);padding-bottom:9px}
.sec-h h2{font-size:clamp(24px,3.2vw,33px);letter-spacing:-.02em}
.sec-h span{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink-3);margin-left:auto}
.sec-p{max-width:68ch;color:var(--ink-2);margin:18px 0 0}

.temuan{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:26px;margin-top:26px}
.panel{background:var(--surface);border:1px solid var(--rule);padding:20px 22px 16px}
.panel h3{font-size:19px;letter-spacing:-.01em}
.panel p{color:var(--ink-2);font-size:15.5px;margin:9px 0 14px}
.panel.wide{grid-column:1/-1}
.grafik{width:100%;height:auto;display:block;overflow:visible}
.g-cap{font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;fill:var(--ink-3)}
.g-lbl{font-family:var(--mono);font-size:11.5px;fill:var(--ink-2)}
.g-num{font-family:var(--mono);font-size:12px;font-weight:700;fill:var(--ink)}
.g-num.g-dim{font-weight:400;fill:var(--ink-3)}
.g-tik{font-family:var(--mono);font-size:10px;fill:var(--ink-3)}
.g-grid{stroke:var(--rule);stroke-width:1}
.g-axis{stroke:var(--rule-2);stroke-width:1}
.g-bar{fill:var(--nila-soft)}
.g-bar-sorot{fill:var(--kunyit)}
.g-bar-kosong{fill:none;stroke:var(--good);stroke-width:1.5;stroke-dasharray:3 3}
.g-nilai-jenuh{fill:var(--nila)}
.g-nilai-ramai{fill:var(--nila-soft)}
.g-nilai-tipis{fill:var(--nila-soft);opacity:.55}
.g-dot{fill:var(--kunyit);fill-opacity:.85;stroke:var(--surface);stroke-width:1}
.g-seg.s-prima{fill:var(--good)}
.g-seg.s-sehat{fill:var(--nila-soft)}
.g-seg.s-rapuh{fill:var(--kunyit)}
.g-seg.s-kritis{fill:var(--bad)}

.tools{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:22px 0 0;
  background:var(--surface);border:1px solid var(--rule);padding:14px 16px}
.tools input,.tools select{font-family:var(--mono);font-size:13px;padding:8px 10px;
  background:var(--ground);color:var(--ink);border:1px solid var(--rule-2);border-radius:3px}
.tools input[type=search]{flex:1 1 240px}
.tools label{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;color:var(--ink-2);
  display:flex;align-items:center;gap:6px;cursor:pointer;text-transform:uppercase}
#hitung{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-left:auto;letter-spacing:.06em}
.tbl-scroll{overflow-x:auto;border:1px solid var(--rule);border-top:0;background:var(--surface)}
table{width:100%;border-collapse:collapse;font-size:14.5px;min-width:800px}
thead th{background:var(--sunken);font-family:var(--mono);font-size:10.5px;letter-spacing:.11em;
  text-transform:uppercase;color:var(--ink-2);text-align:left;padding:10px 12px;
  border-bottom:1px solid var(--rule-2);font-weight:500;white-space:nowrap}
thead th.s{cursor:pointer;user-select:none}
thead th.s:hover{color:var(--nila)}
tbody td{padding:11px 12px;border-bottom:1px solid var(--rule);vertical-align:top}
tbody tr:hover{background:var(--sunken)}
.c-jud{max-width:420px}
.c-jud a{font-family:var(--disp);font-weight:700;font-size:15.5px;letter-spacing:-.008em;
  color:var(--ink);text-decoration:none}
.c-jud a:hover{color:var(--nila);text-decoration:underline}
.tag{display:block;color:var(--ink-3);font-size:13.5px;line-height:1.42;margin-top:2px}
.c-num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.c-kota small{display:block;color:var(--ink-3);font-size:12px}
.c-src a{font-family:var(--mono);font-size:11.5px;white-space:nowrap}
.c-rap{text-align:right}
.rap{font-family:var(--mono);font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;
  padding:2px 7px;border-radius:2px;cursor:help}
.rap.r-prima{background:var(--good);color:var(--surface)}
.rap.r-sehat{color:var(--nila);box-shadow:inset 0 0 0 1px currentColor}
.rap.r-rapuh{color:var(--kunyit);box-shadow:inset 0 0 0 1px currentColor}
.rap.r-kritis{color:var(--bad);box-shadow:inset 0 0 0 1px currentColor}
.pill{font-family:var(--mono);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;
  padding:3px 7px;border-radius:2px;background:var(--chip);color:var(--ink-2);white-space:nowrap}
.pill.p-opensource{color:var(--good);box-shadow:inset 0 0 0 1px currentColor;background:none}
.pill.p-model{color:var(--kunyit);box-shadow:inset 0 0 0 1px currentColor;background:none}
.pill.p-kode{color:var(--bad);box-shadow:inset 0 0 0 1px currentColor;background:none}
.tbl-kosong{padding:24px;color:var(--ink-3);margin:0;text-align:center}
.jangan table{min-width:600px}

footer{margin-top:62px;padding-top:22px;border-top:1px solid var(--rule);
  color:var(--ink-3);font-size:14px;max-width:78ch}
footer p{margin:0 0 10px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (max-width:640px){
  .tile{border-right:0;border-bottom:1px solid var(--rule)}
  .ganti-bahasa{margin-left:0}
}
`;

// ---------------------------------------------------------------- skrip

export const SKRIP = `
(function(){
  var tb=document.getElementById('tb'); if(!tb) return;
  var rows=Array.prototype.slice.call(tb.rows);
  var q=document.getElementById('q'), fk=document.getElementById('fk'),
      fc=document.getElementById('fc'), fm=document.getElementById('fm'),
      fr=document.getElementById('fr'), hit=document.getElementById('hitung'),
      kosong=document.getElementById('kosong');
  var pola=hit.getAttribute('data-pola')||'@N@/@T@';
  function saring(){
    var t=q.value.trim().toLowerCase(), k=fk.value, c=fc.value, n=0;
    for(var i=0;i<rows.length;i++){
      var r=rows[i], ok=true;
      if(t && r.dataset.cari.indexOf(t)<0) ok=false;
      if(ok && k && r.dataset.k!==k) ok=false;
      if(ok && c && r.dataset.kota!==c) ok=false;
      if(ok && fm.checked && r.dataset.hidup!=='0') ok=false;
      if(ok && fr.checked && r.dataset.repo!=='1') ok=false;
      r.hidden=!ok; if(ok) n++;
    }
    hit.textContent=pola.replace('@N@',n).replace('@T@',rows.length);
    kosong.hidden = n!==0;
  }
  [q,fk,fc,fm,fr].forEach(function(el){
    el.addEventListener(el.type==='search'?'input':'change',saring);
  });
  var naik={};
  Array.prototype.forEach.call(document.querySelectorAll('th.s'),function(th){
    th.tabIndex=0; th.setAttribute('role','button');
    function urut(){
      var key=th.dataset.s; naik[key]=!naik[key];
      rows.sort(function(a,b){
        var d=(+b.dataset[key])-(+a.dataset[key]);
        return naik[key]?-d:d;
      });
      rows.forEach(function(r){tb.appendChild(r);});
    }
    th.addEventListener('click',urut);
    th.addEventListener('keydown',function(ev){
      if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();urut();}
    });
  });
  saring();
})();
`;
