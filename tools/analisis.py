#!/usr/bin/env python3
"""Analisis dataset aiclub.id: cek liveness URL, deteksi platform hosting,
klaster tema, lalu ekspor CSV + Markdown + ringkasan JSON."""
import json, re, csv, os, ssl, collections, time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
DOCS = os.path.join(HERE, "..", "laporan")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

PLATFORM = [
    ("github.com", "GitHub repo"), ("vercel.app", "Vercel"), ("netlify.app", "Netlify"),
    ("github.io", "GitHub Pages"), ("web.app", "Firebase"), ("firebaseapp.com", "Firebase"),
    ("lovable.app", "Lovable"), ("play.google.com", "Play Store"), ("apps.microsoft.com", "MS Store"),
    ("lynk.id", "Lynk.id (jual produk)"), ("youtube.com", "YouTube"), ("youtu.be", "YouTube"),
    ("instagram.com", "Instagram"), ("linkedin.com", "LinkedIn"),
    ("gemini.google.com", "Gemini share-link"), ("script.google.com", "Apps Script"),
    ("sites.google.com", "Google Sites"), ("appsheet.com", "AppSheet"),
    ("go.id", "Domain pemerintah"), ("sch.id", "Domain sekolah"), ("ac.id", "Domain kampus"),
    ("my.id", "Domain .my.id"), ("web.id", "Domain .web.id"),
]

TEMA = {
    "POS / kasir / inventori": r"(\bpos\b|kasir|inventor|\bstok\b|\bstock\b|\border\b|laundr|warung|\btoko\b|retail|resto)",
    "Keuangan / akuntansi personal": r"(keuang|finan|cash.?flow|budget|invoice|tagih|neraca|laba|spend|money|catat.?transaksi|dompet)",
    "CRM / WhatsApp automation": r"(\bcrm\b|whatsapp|\bwa\b|blast|omnichannel|customer|\bchat\b|broadcast|\bcs\b|telegram|messenger)",
    "Konten / marketing AI": r"(konten|content|caption|copy|ugc|clip|video|affili|iklan|ads|hook|creator|influencer|thumbnail)",
    "Pendidikan / sekolah": r"(sekolah|siswa|guru|belajar|kuliah|edu|kurikulum|absen|tryout|ujian|matemat|praktikum|pesantren|santri|ruang.?belajar|quiz|kuis)",
    "Web builder / template / portfolio": r"(website builder|web.?builder|landing|template|portfolio|profil|company profile|undangan|blog)",
    "Kesehatan": r"(klinik|medis|rme|pasien|dokter|pediatri|fitness|bmi|sehat|health|puskes|gizi)",
    "Pemerintahan / desa / komunitas": r"(\bdesa\b|kampung|\brt\b|\brw\b|\bwarga\b|kabupaten|kelurahan|kecamatan|cctv|smart ?city|bansos|pemda|masjid|pesantren|ipnu|\bdisnak\b|\.go\.id)",
    "Developer tools / infra": r"(router|gateway|proxy|api|vps|terminal|cli|repo|inspector|framework|devtool|sdk|token|llm|self.?host|n8n|docker|monitor)",
    "Web3 / kripto": r"(web3|kripto|crypto|token|bsc|polygon|defi|blockchain|mining|nft|wallet)",
    "Game / hiburan / kreatif": r"(game|rpg|chess|monopoly|drum|sampler|sound|musik|music|dub siren|pad)",
    "Produktivitas personal": r"(note|catat|second brain|todo|rutinan|pomodor|pomo|tracker|jadwal|habit)",
    "Travel / properti / marketplace": r"(travel|tour|wisata|properti|kost|marketplace|jastip|booking|jadwal|hotel)",
    "Data / riset / intelijen": r"(riset|research|dataset|analis|intelijen|news|scrap|monitor|idx|saham|stock agent|open science)",
}


def bersihkan(url):
    """Rapikan URL yang diketik asal oleh pemilik karya (spasi, skema rusak)."""
    if not url:
        return ""
    u = url.strip().split()[0] if url.strip().split() else ""
    u = re.sub(r"^https?:(?!//)", lambda m: m.group(0) + "//", u)
    u = "".join(ch for ch in u if ord(ch) > 32)
    return u


def head(url, timeout=15):
    url = bersihkan(url)
    if not url.startswith("http"):
        return {"status": None, "note": "url tidak valid"}
    try:
        req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"}, method="GET")
        with urlopen(req, timeout=timeout, context=CTX) as r:
            body = r.read(4096)
            return {"status": r.status, "final": r.geturl(),
                    "note": "ok" if r.status < 400 else "http " + str(r.status),
                    "bytes": len(body)}
    except HTTPError as e:
        return {"status": e.code, "note": "http " + str(e.code)}
    except Exception as e:  # noqa: BLE001 - URL dari user, bisa rusak macam-macam
        return {"status": None, "note": type(e).__name__ + ": " + str(e)[:70]}


def platform_of(url):
    u = (url or "").lower()
    for needle, label in PLATFORM:
        if needle in u:
            return label
    return "Domain sendiri"


def tema_of(row):
    blob = ((row.get("title") or "") + " " + (row.get("tagline") or "") + " " + (row.get("url") or "")).lower()
    hits = [name for name, pat in TEMA.items() if re.search(pat, blob)]
    return hits or ["Lainnya"]


def main():
    os.makedirs(DOCS, exist_ok=True)
    rows = json.load(open(DATA + "/karya.json", encoding="utf-8"))
    print("cek liveness %d URL..." % len(rows), flush=True)
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(lambda r: head(r.get("url")), rows))
    for r, res in zip(rows, results):
        r["httpStatus"] = res.get("status")
        r["httpNote"] = res.get("note")
        r["urlBersih"] = bersihkan(r.get("url"))
        r["platform"] = platform_of(r.get("url"))
        r["tema"] = tema_of(r)
        r["hidup"] = bool(res.get("status") and res["status"] < 400)
    print("  selesai %.0fs" % (time.time() - t0), flush=True)

    json.dump(rows, open(DATA + "/karya.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    cols = ["id", "title", "tagline", "url", "category", "love", "comments", "author",
            "cityName", "provinceName", "createdAt", "platform", "httpStatus", "hidup", "page"]
    with open(DATA + "/karya.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols + ["tema"])
        for r in rows:
            w.writerow([str(r.get(c, "")).replace("\r", " ").replace("\n", " ") for c in cols]
                       + ["; ".join(r["tema"])])

    ringkas = {
        "totalKarya": len(rows),
        "totalLove": sum(r.get("love") or 0 for r in rows),
        "hidup": sum(1 for r in rows if r["hidup"]),
        "mati": sum(1 for r in rows if not r["hidup"]),
        "perKategori": collections.Counter(r.get("category") for r in rows).most_common(),
        "perKota": collections.Counter(r.get("cityName") for r in rows).most_common(20),
        "perProvinsi": collections.Counter(r.get("provinceName") for r in rows).most_common(),
        "perPlatform": collections.Counter(r["platform"] for r in rows).most_common(),
        "perTema": collections.Counter(t for r in rows for t in r["tema"]).most_common(),
        "loveNol": sum(1 for r in rows if not r.get("love")),
        "punyaRepoPublik": sum(1 for r in rows if "github.com" in (r.get("url") or "")),
        "bulanan": collections.Counter((r.get("createdAt") or "")[:7] for r in rows).most_common(),
    }
    json.dump(ringkas, open(DATA + "/ringkasan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    for k, v in ringkas.items():
        print(k, "=", v if not isinstance(v, list) else v[:12])


if __name__ == "__main__":
    main()
