#!/usr/bin/env python3
"""Crawler aiclub.id - kumpulkan seluruh karya (showcase) + builder + event/kerja/sesi/blog.

Sumber data (semua endpoint publik, tanpa login):
  GET /api/v1/showcase                 -> 60 karya terpopuler (kaya metadata)
  GET /api/v1/showcase/<id>            -> detail satu karya
  GET /api/v1/showcase/<id>/comments   -> komentar + memberId komentator
  GET /api/v1/leaderboard[?periode=]   -> top karya / builder / kota
  GET /api/v1/regions                  -> daftar provinsi & kota
  GET /api/v1/{event,kerja,sesi}       -> agenda, lowongan, sesi belajar
  GET /<provinsi>[/<kota>]             -> 6 karya teratas per wilayah (HTML)
  GET /builder/<memberId>              -> SELURUH karya milik builder (HTML)

Strategi penemuan ID (fixpoint):
  seed  = API showcase + leaderboard (semua periode) + halaman provinsi + halaman kota
  loop  = karya -> memberId (pemilik + komentator) -> profil builder -> karya baru
          sampai tidak ada ID baru.
"""
import json, re, html, time, os
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://aiclub.id"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) aiclubid-research/1.0"
WORKERS = 6


def get(path, tries=3):
    url = path if path.startswith("http") else BASE + path
    for i in range(tries):
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept-Language": "id-ID,id"})
            with urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except HTTPError as e:
            if e.code in (404, 401, 403):
                return None
            time.sleep(1 + i)
        except (URLError, TimeoutError, OSError):
            time.sleep(1 + i)
    return None


def get_json(path):
    t = get(path)
    if not t:
        return None
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        return None


def pmap(fn, items):
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        return list(ex.map(fn, items))


RE_KARYA = re.compile(r'href="/showcase/(s00_[A-Z0-9]+)"')
RE_BUILDER = re.compile(r'href="/builder/(s00_[A-Z0-9]+)"')
RE_TITLE = re.compile(r"<title>(.*?)</title>", re.S)
RE_OGD = re.compile(r'<meta property="og:description" content="([^"]*)"')


def strip_tags(h):
    t = re.sub(r"<script.*?</script>", " ", h, flags=re.S)
    t = re.sub(r"<style.*?</style>", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    t = html.unescape(t)
    return "\n".join(l.strip() for l in t.split("\n") if l.strip())


def seed():
    karya, builders, meta = set(), set(), {}

    api = get_json("/api/v1/showcase") or {"items": []}
    for it in api["items"]:
        karya.add(it["id"])
        builders.add(it["memberId"])
        meta[it["id"]] = it
    print("  api/showcase      : %d karya" % len(api["items"]), flush=True)

    boards = {}
    for per in ["semua", "tahun", "bulan", "minggu", "hari"]:
        lb = get_json("/api/v1/leaderboard?periode=" + per) or {}
        boards[per] = lb
        for it in lb.get("topKarya", []):
            karya.add(it["id"])
        for it in lb.get("topBuilder", []):
            builders.add(it["memberId"])
    json.dump(boards, open(OUT + "/leaderboard.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    regions = get_json("/api/v1/regions") or {}
    json.dump(regions, open(OUT + "/regions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    sc = get("/showcase") or ""
    karya |= set(RE_KARYA.findall(sc))
    sel = re.search(r"<select[^>]*>.*?</select>", sc, re.S)
    cities = []
    if sel:
        cities = [v for v, _ in re.findall(r'<option value="([^"]*)"[^>]*>([^<]*)</option>', sel.group(0)) if v]
    provs = [p["slug"] for p in regions.get("provinces", [])]
    paths = ["/" + c for c in cities] + ["/" + p for p in provs]
    print("  halaman wilayah   : %d" % len(paths), flush=True)

    def grab(p):
        return set(RE_KARYA.findall(get(p) or ""))

    for s in pmap(grab, paths):
        karya |= s
    return karya, builders, meta, cities, provs


def fetch_karya(kid):
    """Detail karya + komentarnya. Balikkan (record, memberIds_baru)."""
    d = get_json("/api/v1/showcase/" + kid)
    if not d or not d.get("item"):
        return None, set()
    rec = dict(d["item"])
    rec["page"] = BASE + "/showcase/" + kid
    rec["image"] = BASE + "/img/" + rec.get("imageKey", "")
    ids = {rec["memberId"]} if rec.get("memberId") else set()
    rec["commentList"] = []
    if rec.get("comments"):
        c = get_json("/api/v1/showcase/" + kid + "/comments") or {}
        for cm in c.get("comments", []):
            rec["commentList"].append(cm)
            if cm.get("memberId"):
                ids.add(cm["memberId"])
    return rec, ids


def fetch_builder(bid):
    h = get("/builder/" + bid)
    if not h:
        return None, set()
    txt = strip_tags(h)
    ids = set(RE_KARYA.findall(h))
    d = {"memberId": bid, "page": BASE + "/builder/" + bid, "karyaIds": sorted(ids)}
    m = RE_TITLE.search(h)
    if m:
        d["name"] = html.unescape(m.group(1)).replace(" — Builder AIClub Indonesia", "").strip()
    m = re.search(r"^>?\s*(.*?), (.*?) · gabung (.*?)_$", txt, re.M)
    if m:
        d["city"], d["province"], d["joined"] = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
    m = re.search(r"(\d+)\s*\n\s*TOTAL LOVE", txt)
    if m:
        d["totalLove"] = int(m.group(1))
    m = re.search(r"(\d+)\s*\n\s*KARYA", txt)
    if m:
        d["karyaCount"] = int(m.group(1))
    d["verified"] = "VERIFIED" in txt[:500]
    d["badges"] = [b.strip() for b in re.findall(r"^[⬢★♛♔✦♥]\s*(.+)$", txt, re.M)]
    return d, ids


def scrape_side():
    side = {}
    for name, ep in [("event", "/api/v1/event"), ("kerja", "/api/v1/kerja"), ("sesi", "/api/v1/sesi")]:
        side[name] = get_json(ep)
    blog = get("/blog") or ""
    posts = sorted(set(re.findall(r'href="(/blog/[^"#]+)"', blog)))

    def bp(p):
        h = get(p) or ""
        m, d = RE_TITLE.search(h), RE_OGD.search(h)
        return {"path": p, "url": BASE + p,
                "title": html.unescape(m.group(1)).strip() if m else "",
                "desc": html.unescape(d.group(1)).strip() if d else ""}

    side["blog"] = pmap(bp, posts)
    for name, path in [("materi", "/materi"), ("kuis", "/kuis"), ("statistik", "/statistik"),
                       ("tentang", "/tentang"), ("papan", "/papan"), ("kerja_page", "/kerja"),
                       ("event_page", "/event"), ("sesi_page", "/sesi"), ("beranda", "/")]:
        h = get(path)
        side[name + "_text"] = strip_tags(h) if h else None
    return side


def main():
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    print("[1/4] seeding...", flush=True)
    karya, builders, api_meta, cities, provs = seed()
    print("      seed: %d karya, %d builder" % (len(karya), len(builders)), flush=True)

    details, bprofiles = {}, {}
    print("[2/4] fixpoint crawl...", flush=True)
    for rnd in range(1, 12):
        new_k = sorted(karya - set(details))
        if new_k:
            for rec, ids in pmap(fetch_karya, new_k):
                if rec:
                    details[rec["id"]] = rec
                    builders |= ids
        new_b = sorted(builders - set(bprofiles))
        if new_b:
            for prof, ids in pmap(fetch_builder, new_b):
                if prof:
                    bprofiles[prof["memberId"]] = prof
                    karya |= ids
        print("      ronde %d: +%d karya, +%d builder -> total %d karya / %d builder"
              % (rnd, len(new_k), len(new_b), len(karya), len(builders)), flush=True)
        if not new_k and not new_b:
            break

    for kid, m in api_meta.items():
        details.setdefault(kid, dict(m, page=BASE + "/showcase/" + kid))

    rows = sorted(details.values(), key=lambda x: (-(x.get("love") or 0), x.get("title") or ""))
    json.dump(rows, open(OUT + "/karya.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(sorted(bprofiles.values(), key=lambda x: -(x.get("totalLove") or 0)),
              open(OUT + "/builders.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("[3/4] konten lain (event/kerja/sesi/blog/materi)...", flush=True)
    json.dump(scrape_side(), open(OUT + "/side.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"cities": cities, "provinces": provs},
              open(OUT + "/wilayah.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("[4/4] selesai: %d karya, %d builder (%.0fs) -> %s"
          % (len(rows), len(bprofiles), time.time() - t0, os.path.abspath(OUT)), flush=True)


if __name__ == "__main__":
    main()
