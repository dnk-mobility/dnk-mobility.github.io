# -*- coding: utf-8 -*-
"""설비별 QR 코드 재생성 (조직 이전으로 주소가 dongnam959.github.io -> dnk-mobility.github.io
로 바뀔 때 1회 실행용). 파일명 규칙은 각 .html 파일명과 동일 (index.html만 예외적으로 루트)."""
import os
import qrcode

BASE = "https://dnk-mobility.github.io/"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "qr-codes")

PAGES = {
    "index": "",  # 홈은 루트 주소
    "laser-marking": "laser-marking.html",
    "leak-pre-flow": "leak-pre-flow.html",
    "leak-pre-full": "leak-pre-full.html",
    "nipple-oil-press": "nipple-oil-press.html",
    "cap-sealing-press": "cap-sealing-press.html",
    "taper-plug-fastening": "taper-plug-fastening.html",
    "dowel-pin-press": "dowel-pin-press.html",
    "leak-post-flow": "leak-post-flow.html",
    "leak-post-full": "leak-post-full.html",
    "taper-plug-height": "taper-plug-height.html",
}

for name, path in PAGES.items():
    url = BASE + path
    img = qrcode.make(url, box_size=10, border=4)
    out_path = os.path.join(OUT, name + ".png")
    img.save(out_path)
    print("%-24s -> %s" % (name, url))
