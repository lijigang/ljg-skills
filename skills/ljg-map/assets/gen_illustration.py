#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ljg-map 生态地形图生成器：把一个行业画成「生态地形图」，标出瓶颈所在、价值捕获点所在。

用法：
  python3 gen_illustration.py --mold a --frame "<英文地形构图>" --out ~/Downloads/x_terrain.png
  --mold  a = 绘本地图·吉田诚治（默认，与 ljg-library 同源画风） | c = pixel + cyber-hacker（刻意出格）
  --frame 这个行业的地形构图（英文）：价值之河怎么流、哪里是收窄的瓶颈隘口（red 瓶颈牌）、
          哪里是利润沉淀的价值捕获点（gold 宝藏堆），各功能位是地形上的什么地貌，要哪几个中文地名标注。
          由 cast 按 deep research 出的「价值链 + 瓶颈 + 价值捕获」译成地形（见 references/research.md + visual.md）。
  --ref   继刚墨像参考图（默认 assets/ljg-portrait.png）——继刚作小测量员/探险者立在地形上俯瞰，认得出他。

依赖 env: LISTENHUB_API_KEY。直接调 marswave（gemini-3-pro-image），绕交互门控、可进批量管线。
"""
import argparse, base64, json, os, sys, urllib.request, pathlib

API = "https://api.marswave.ai/openapi/v1/images/generation"

MOLDS = {
  "a": (
    "Warm painterly bird's-eye fantasy world-map in the style of Japanese background artist Yoshida Seiji (吉田誠治), "
    "as in his art book ものがたりの家: a cozy hand-painted storybook map seen from above, soft digital painting with "
    "rich environmental detail, solid believable terrain and accurate perspective, deep sense of place. Warm low-angle "
    "sunlight rakes across the land, gentle glow and floating dust motes; honey / amber / wood-brown tones with muted "
    "teal-green water and grass, soft cozy shadows. Painted mountains, valleys, rivers, harbors and little timbered "
    "hamlets crammed with lived-in detail, real enough to live in; small neat hand-lettered Chinese labels that sit "
    "naturally on the map. Painterly storybook illustration, NOT pixel art, NOT flat cartoon, NOT Animal-Crossing, "
    "NOT a realistic photo."
  ),
  "c": (
    "16-bit PIXEL ART with a cyberpunk hacker aesthetic. Chunky pixels, dithering, dark near-black #0a0e14 ground "
    "with CRT scanlines and faint glitch, neon green/cyan/magenta. Terminal-style glowing Chinese labels."
  ),
}

# 生态地形图专用：把行业画成俯瞰地形，价值之河 + 瓶颈隘口 + 价值捕获宝藏
COMMON = (
  "Generate one standalone 16:9 horizontal bird's-eye ECOSYSTEM TERRAIN MAP illustration of an industry, like a "
  "warm hand-painted storybook world map. {dna}\n"
  "Render the industry AS A LANDSCAPE/island terrain seen from above-ish: the flow of value is a RIVER or path "
  "winding across the terrain from upstream to downstream; each part of the industry is a piece of terrain "
  "(mountains, fields, harbors, forests, towns).\n"
  "MUST clearly mark two kinds of spots ON the terrain:\n"
  "  - BOTTLENECK 瓶颈: a narrow rocky PASS / a dam / a single choke-bridge where the value-river or road "
  "constricts — flag it with a small RED sign reading 瓶颈.\n"
  "  - VALUE-CAPTURE 价值捕获: where the profit pools — a GOLD treasure pile / coins / a vault — flag it with a "
  "small GOLD sign reading 价值捕获.\n"
  "The man in the reference image appears SMALL as a recurring surveyor/explorer 你 standing on a vantage point "
  "overlooking the terrain (keep him recognizable: glasses, beard).\n"
  "SCENE / terrain layout: {frame}\n"
  "Constraints: bird's-eye cozy map feel; only a FEW short hand-written Chinese place labels (2-6 chars each, at "
  "most ~6 total) so nothing gets crowded; render Chinese text correctly; the 瓶颈 (red) and 价值捕获 (gold) spots "
  "must read at a glance. Keep it clean, not a dense diagram."
)


def find_b64(o):
    if isinstance(o, dict):
        idd = o.get("inlineData") or o.get("inline_data")
        if isinstance(idd, dict) and isinstance(idd.get("data"), str) and len(idd["data"]) > 1000:
            return idd["data"]
        if isinstance(o.get("data"), str) and len(o["data"]) > 1000:
            return o["data"]
        for v in o.values():
            r = find_b64(v)
            if r:
                return r
    elif isinstance(o, list):
        for v in o:
            r = find_b64(v)
            if r:
                return r
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mold", default="a", choices=["a", "c"])
    ap.add_argument("--frame", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ref", default=str(pathlib.Path(__file__).with_name("ljg-portrait.png")))
    args = ap.parse_args()

    key = os.environ.get("LISTENHUB_API_KEY")
    if not key:
        sys.exit("ERROR: LISTENHUB_API_KEY not set in env")
    ref_b64 = base64.b64encode(pathlib.Path(args.ref).read_bytes()).decode()
    prompt = COMMON.format(dna=MOLDS[args.mold], frame=args.frame)
    payload = {
        "provider": "google",
        "model": "gemini-3-pro-image-preview",
        "prompt": prompt,
        "imageConfig": {"imageSize": "2K", "aspectRatio": "16:9"},
        "referenceImages": [{"inlineData": {"data": ref_b64, "mimeType": "image/png"}}],
    }
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Source": "skills"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        resp = json.loads(r.read().decode())
    b = find_b64(resp)
    if not b:
        sys.exit("ERROR: no image in response: " + json.dumps(resp)[:500])
    out = pathlib.Path(os.path.expanduser(args.out))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(b))
    print(str(out))


if __name__ == "__main__":
    main()
