# -*- coding: utf-8 -*-
"""
설비 부착용 QR 라벨(70mm x 100mm) 인쇄 파일 생성.

    python tools/make_labels.py

결과: qr-codes/설비QR라벨_70x100mm_A4인쇄용.pdf
    - 라벨 1장 = 정확히 가로 70mm x 세로 100mm
    - A4 한 장에 4개(2x2 배치), 설비 10개소이므로 총 3페이지
    - 각 라벨 모서리에 재단선, 페이지마다 수록 설비·인쇄 주의사항 표기

디자인(2026-09-17 확정): 네이비 배경 + 흰 QR 카드(시안 코너 브래킷)
    S C A N → QR → 공정No. → 설비명 → 안내 문구 → DnK MOBILITY

설비명·주소가 바뀌면 아래 EQUIPMENT만 고치고 다시 실행하면 전체가 재생성됩니다.
QR 주소는 tools/make_qr.py 와 같은 규칙(<BASE_URL> + 각 페이지 파일명)을 씁니다.

필요 패키지: pip install qrcode pillow pymupdf
한글 폰트: Windows 기본 맑은 고딕(malgun.ttf) 사용
"""
import io
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont
import pymupdf

# ===================== 설정 =====================

BASE_URL = "https://dnk-mobility.github.io/"
CAPTION = "스캔하면 설비정보를 확인할 수 있습니다"

EQUIPMENT = [
    (110, "레이저 마킹기", "laser-marking.html"),
    (120, "조립전 유로계 리크검사기", "leak-pre-flow.html"),
    (130, "조립전 전체계 리크검사기", "leak-pre-full.html"),
    (140, "오일니쁠 압입기 / 테이퍼 플러그 체결기(1개소)", "nipple-oil-press.html"),
    (150, "씰캡 압입기", "cap-sealing-press.html"),
    (160, "테이퍼 플러그 체결기(5개소)", "taper-plug-fastening.html"),
    (170, "다월핀 압입기", "dowel-pin-press.html"),
    (180, "조립후 유로계 리크검사기", "leak-post-flow.html"),
    (190, "조립후 전체계 리크검사기", "leak-post-full.html"),
    (200, "테이퍼 플러그 돌출높이 검사기", "taper-plug-height.html"),
]

WIDTH_MM = 70.0           # 라벨 가로 (실제 인쇄 크기)
HEIGHT_MM = 100.0         # 라벨 세로 (실제 인쇄 크기)
PXMM = 12                 # 렌더링 해상도 (12px/mm ≈ 305dpi) — 100x100mm 버전과 동일 밀도 유지
WIDTH_PX = round(WIDTH_MM * PXMM)
HEIGHT_PX = round(HEIGHT_MM * PXMM)

NAVY = (10, 37, 64)
CYAN = (55, 198, 224)
WHITE = (255, 255, 255)
BRAND_SUB = (170, 195, 220)

FONT_DIR = "C:/Windows/Fonts/"
F_BOLD, F_REG = "malgunbd.ttf", "malgun.ttf"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PDF = os.path.join(ROOT, "qr-codes", "설비QR라벨_70x100mm_A4인쇄용.pdf")

# ===================== 라벨 렌더링 =====================

def font(name, size):
    return ImageFont.truetype(FONT_DIR + name, max(round(size), 6))

def mm(v):
    return round(v * PXMM)

def make_qr(url):
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H, box_size=16, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="#0a2540", back_color="white").convert("RGB")

def center_text(draw, cx, y, text, fnt, fill, tracking=0):
    if tracking:
        widths = [draw.textlength(ch, font=fnt) for ch in text]
        x = cx - (sum(widths) + tracking * (len(text) - 1)) / 2
        for ch, w in zip(text, widths):
            draw.text((x, y), ch, font=fnt, fill=fill)
            x += w + tracking
        return
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, y), text, font=fnt, fill=fill)

def text_h_mm(fnt):
    bbox = fnt.getbbox("가Hy0")
    return (bbox[3] - bbox[1]) / PXMM

def norm_rect(x0, y0, x1, y1):
    return [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]

def wrap_text(draw, text, fnt, max_width_px):
    """설비명이 길면 공백 기준으로 줄바꿈 (현재 10개소는 전부 한 줄에 들어감)."""
    lines, cur = [], ""
    for tok in text.split(" "):
        trial = tok if not cur else cur + " " + tok
        if draw.textlength(trial, font=fnt) <= max_width_px or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = tok
    if cur:
        lines.append(cur)
    return lines

def render_label(no, name, file):
    img = Image.new("RGB", (WIDTH_PX, HEIGHT_PX), NAVY)
    d = ImageDraw.Draw(img)
    cx = WIDTH_PX / 2
    cur = 4.5

    f_scan = font(F_BOLD, mm(3.0))
    center_text(d, cx, mm(cur), "S C A N", f_scan, CYAN, tracking=mm(0.9))
    cur += text_h_mm(f_scan) + 2.4

    pad, qs = 3.6, 44.0
    card_t, card_b = cur, cur + qs + pad * 2
    card_l, card_r = cx - mm(qs) / 2 - mm(pad), cx + mm(qs) / 2 + mm(pad)
    d.rounded_rectangle([card_l, mm(card_t), card_r, mm(card_b)], radius=mm(2.3), fill=WHITE)
    img.paste(make_qr(BASE_URL + file).resize((mm(qs), mm(qs)), Image.NEAREST),
              (round(cx - mm(qs) / 2), mm(card_t + pad)))

    bl, bw, off = mm(3.8), mm(0.65), mm(1.3)
    for x, y, dx, dy in [(card_l - off, mm(card_t) - off, 1, 1), (card_r + off, mm(card_t) - off, -1, 1),
                         (card_l - off, mm(card_b) + off, 1, -1), (card_r + off, mm(card_b) + off, -1, -1)]:
        d.rectangle(norm_rect(x, y, x + dx * bl, y + dy * bw), fill=CYAN)
        d.rectangle(norm_rect(x, y, x + dx * bw, y + dy * bl), fill=CYAN)
    cur = card_b + 3.2

    f_no = font(F_BOLD, mm(7.0))
    center_text(d, cx, mm(cur), str(no), f_no, WHITE)
    cur += text_h_mm(f_no) + 1.8

    f_name = font(F_REG, mm(2.7))
    lines = wrap_text(d, name, f_name, WIDTH_PX - mm(8))
    for i, ln in enumerate(lines):
        center_text(d, cx, mm(cur), ln, f_name, BRAND_SUB)
        cur += text_h_mm(f_name) + (0.9 if i < len(lines) - 1 else 0)
    cur += 2.4

    f_cap = font(F_REG, mm(2.35))
    center_text(d, cx, mm(cur), CAPTION, f_cap, BRAND_SUB)
    cur += text_h_mm(f_cap) + 2.6

    f_brand = font(F_BOLD, mm(2.55))
    center_text(d, cx, mm(cur), "DnK MOBILITY", f_brand, WHITE, tracking=mm(0.12))
    cur += text_h_mm(f_brand)

    if cur > HEIGHT_MM:
        raise SystemExit(f"[No.{no}] 내용이 라벨을 넘칩니다 ({cur:.1f}mm > {HEIGHT_MM:.0f}mm) — 글꼴 크기를 줄이세요")
    print(f"  No.{no:<4} {name}  (본문 {cur:.1f}mm / {HEIGHT_MM:.0f}mm)")
    return img

# ===================== A4 조판 =====================

PT_MM = 72 / 25.4
A4_W, A4_H = 210 * PT_MM, 297 * PT_MM
CELL_W, CELL_H = WIDTH_MM * PT_MM, HEIGHT_MM * PT_MM
GUTTER = 4 * PT_MM
COLS, ROWS = 2, 2
PER_PAGE = COLS * ROWS
MARK_LEN, MARK_GAP = 12, 3

KFONT, KFONT_BOLD = FONT_DIR + F_REG, FONT_DIR + F_BOLD
C_NAVY = (10 / 255, 37 / 255, 64 / 255)
C_GRAY = (0.42, 0.45, 0.5)

def build_pdf():
    grid_w = CELL_W * COLS + GUTTER * (COLS - 1)
    left = (A4_W - grid_w) / 2
    top = 28 * PT_MM

    doc = pymupdf.open()
    groups = [EQUIPMENT[i:i + PER_PAGE] for i in range(0, len(EQUIPMENT), PER_PAGE)]

    for pno, group in enumerate(groups, 1):
        page = doc.new_page(width=A4_W, height=A4_H)
        nos = ", ".join("No.%d" % e[0] for e in group)
        page.insert_text((left, 16 * PT_MM),
                         f"설비 QR 라벨 70x100mm — {pno}/{len(groups)} 페이지  ({nos})",
                         fontsize=11, fontname="kbold", fontfile=KFONT_BOLD, color=C_NAVY)
        page.insert_text((left, 21.5 * PT_MM),
                         "재단선(모서리 ㄱ자)을 따라 잘라서 설비에 부착하세요.",
                         fontsize=8.5, fontname="kreg", fontfile=KFONT, color=C_GRAY)

        for idx, (no, name, file) in enumerate(group):
            r, c = divmod(idx, COLS)
            x0 = left + c * (CELL_W + GUTTER)
            y0 = top + r * (CELL_H + GUTTER)
            x1, y1 = x0 + CELL_W, y0 + CELL_H

            buf = io.BytesIO()
            render_label(no, name, file).save(buf, format="PNG")
            page.insert_image(pymupdf.Rect(x0, y0, x1, y1), stream=buf.getvalue())

            for mx, my, dx, dy in [(x0, y0, -1, -1), (x1, y0, 1, -1), (x0, y1, -1, 1), (x1, y1, 1, 1)]:
                page.draw_line((mx + dx * MARK_GAP, my), (mx + dx * (MARK_GAP + MARK_LEN), my),
                               color=(0, 0, 0), width=0.5)
                page.draw_line((mx, my + dy * MARK_GAP), (mx, my + dy * (MARK_GAP + MARK_LEN)),
                               color=(0, 0, 0), width=0.5)

        page.insert_text((left, A4_H - 28 * PT_MM),
                         "인쇄 시 반드시 '실제 크기(100%)'로 설정하세요 — '여백에 맞춤'을 켜면 사이즈가 안 맞습니다.",
                         fontsize=9, fontname="kbold", fontfile=KFONT_BOLD, color=C_NAVY)
        page.insert_text((left, A4_H - 23 * PT_MM),
                         "라벨 1장 = 가로 70mm x 세로 100mm · 인쇄 후 자로 재서 크기를 확인하면 확실합니다.",
                         fontsize=8.5, fontname="kreg", fontfile=KFONT, color=C_GRAY)

    # 한글 폰트를 페이지마다 통째로 임베드하면 파일이 100MB를 넘으므로 실제 쓰인 글자만 남긴다
    doc.subset_fonts()
    doc.save(OUT_PDF, garbage=4, deflate=True)
    print("\n저장: %s" % OUT_PDF)
    print("페이지 %d장 · 라벨 %d개 · %.0f KB"
          % (doc.page_count, len(EQUIPMENT), os.path.getsize(OUT_PDF) / 1024))

if __name__ == "__main__":
    print("라벨 생성 중...")
    build_pdf()
