#!/usr/bin/env python3
"""Perkaya karya.json dengan statistik repo GitHub, lalu tulis DAFTAR-KARYA.md."""
import json, os, re, subprocess, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
DOCS = os.path.join(HERE, "..", "laporan")


def gh(path):
    try:
        out = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=25)
        return json.loads(out.stdout) if out.returncode == 0 else None
    except Exception:
        return None


def enrich_github(rows):
    hit = 0
    for r in rows:
        u = r.get("urlBersih") or r.get("url") or ""
        m = re.search(r"github\.com/([^/]+/[^/#?]+)", u)
        if not m:
            continue
        slug = m.group(1).rstrip("/").removesuffix(".git")
        d = gh("repos/" + slug)
        if not d:
            r["github"] = {"slug": slug, "ada": False}
            continue
        hit += 1
        r["github"] = {"slug": slug, "ada": True, "stars": d.get("stargazers_count", 0),
                       "forks": d.get("forks_count", 0), "bahasa": d.get("language"),
                       "lisensi": (d.get("license") or {}).get("spdx_id"),
                       "pushedAt": (d.get("pushed_at") or "")[:10],
                       "issues": d.get("open_issues_count", 0)}
    print("  repo GitHub terbaca: %d" % hit)
    return rows


KAT = {"opensource": "Open Source", "saas": "SaaS", "produk": "Produk",
       "web": "Web", "tools": "Tools", "model": "Model", "lainnya": "Lainnya"}


def tulis_daftar(rows):
    os.makedirs(DOCS, exist_ok=True)
    hidup = sum(1 for r in rows if r.get("hidup"))
    lines = [
        "# Daftar Lengkap Karya di aiclub.id",
        "",
        "Hasil crawl `scripts/scrape_aiclub.py` — **%d karya** dari %d builder, "
        "%d URL hidup / %d mati saat dicek." % (len(rows), len({r.get("memberId") for r in rows}), hidup, len(rows) - hidup),
        "Sumber: endpoint publik `aiclub.id/api/v1/*` + halaman provinsi/kota/builder.",
        "Angka ♥ = love di aiclub.id; ★ = bintang GitHub (kalau karyanya menautkan repo).",
        "",
        "| # | Karya | Kategori | Kota | ♥ | ★ GitHub | Status | Tautan |",
        "|---|-------|----------|------|---|----------|--------|--------|",
    ]
    for i, r in enumerate(rows, 1):
        g = r.get("github") or {}
        star = ("★%d" % g["stars"]) if g.get("ada") else ("repo hilang" if g else "—")
        status = "hidup" if r.get("hidup") else "**mati** (%s)" % (r.get("httpNote") or "?")[:22]
        judul = (r.get("title") or "").replace("|", "/").strip()
        tag = (r.get("tagline") or "").replace("|", "/").replace("\r", " ").replace("\n", " ").strip()
        lines.append("| %d | **%s**<br><sub>%s</sub> | %s | %s | %d | %s | %s | [buka](%s) · [aiclub](%s) |"
                     % (i, judul, tag[:110], KAT.get(r.get("category"), r.get("category") or "-"),
                        r.get("cityName") or "-", r.get("love") or 0, star, status,
                        r.get("urlBersih") or "#", r.get("page")))
    lines += ["", "---", "", "## Rekap per kategori", "",
              "| Kategori | Jumlah | Total ♥ |", "|---|---|---|"]
    c = collections.Counter(r.get("category") for r in rows)
    lv = collections.Counter()
    for r in rows:
        lv[r.get("category")] += r.get("love") or 0
    for k, n in c.most_common():
        lines.append("| %s | %d | %d |" % (KAT.get(k, k), n, lv[k]))

    lines += ["", "## Rekap per provinsi", "", "| Provinsi | Karya |", "|---|---|"]
    for k, n in collections.Counter(r.get("provinceName") for r in rows).most_common():
        lines.append("| %s | %d |" % (k or "-", n))

    open(DOCS + "/DAFTAR-KARYA.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("  -> laporan/DAFTAR-KARYA.md")


def main():
    rows = json.load(open(DATA + "/karya.json", encoding="utf-8"))
    print("enrich GitHub...")
    rows = enrich_github(rows)
    json.dump(rows, open(DATA + "/karya.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tulis_daftar(rows)

    # ringkasan tambahan untuk laporan
    ring = json.load(open(DATA + "/ringkasan.json", encoding="utf-8"))
    repo = [r for r in rows if (r.get("github") or {}).get("ada")]
    ring["repoTerdeteksi"] = len(repo)
    ring["repoTotalStars"] = sum(r["github"]["stars"] for r in repo)
    ring["klaimOpenSourceTanpaRepo"] = sum(
        1 for r in rows if r.get("category") == "opensource" and "github.com" not in (r.get("url") or ""))
    ring["topRepo"] = sorted(
        [{"title": r["title"], "slug": r["github"]["slug"], "stars": r["github"]["stars"],
          "love": r.get("love") or 0} for r in repo], key=lambda x: -x["stars"])[:10]
    json.dump(ring, open(DATA + "/ringkasan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("  klaim open-source tanpa repo:", ring["klaimOpenSourceTanpaRepo"])
    print("  total stars komunitas:", ring["repoTotalStars"])


if __name__ == "__main__":
    main()
