# -*- coding: utf-8 -*-
"""
PDF 업로드 전 재압축 도구 (기준: PROJECT_OVERVIEW.md §6 / 개선이력.md)

사용법:
    python tools/compress_pdf.py 파일1.pdf [파일2.pdf ...]

동작:
    - 150dpi를 넘는 내장 이미지를 150dpi / JPEG 품질 75로 재압축하고 구조를 정리해
      같은 폴더에 "<원본이름>-small.pdf" 로 저장합니다. 원본은 절대 건드리지 않습니다.
    - 결과가 원본보다 작지 않으면 파일을 남기지 않고 "원본 유지" 로 알려줍니다.
      (이미 최적화된 PDF는 재압축하면 오히려 커집니다 — ls-r700-manual.pdf 실측 사례)
    - 재압축본은 스마트폰 화면에서 표·도면 글자 가독성을 확인한 뒤 원본 파일명으로
      바꿔서 업로드하세요.

필요 패키지: pip install pymupdf
"""
import os
import sys

try:
    import pymupdf
except ImportError:
    sys.exit("pymupdf가 필요합니다:  pip install pymupdf")

TARGET_DPI = 150
QUALITY = 75
GOAL_MB = 3.0   # 목표
HARD_MB = 5.0   # 초과 시 반드시 재압축 또는 분할

def mb(n):
    return n / 1048576.0

def compress(path):
    orig = os.path.getsize(path)
    out = os.path.splitext(path)[0] + "-small.pdf"

    doc = pymupdf.open(path)
    doc.rewrite_images(
        dpi_threshold=TARGET_DPI + 10,
        dpi_target=TARGET_DPI,
        quality=QUALITY,
        lossy=True,
        lossless=True,
    )
    doc.save(out, garbage=4, deflate=True, clean=True)
    doc.close()

    new = os.path.getsize(out)
    name = os.path.basename(path)
    if new >= orig:
        os.remove(out)
        print("%-40s %6.2f MB -> 재압축이 더 큼, 원본 유지" % (name, mb(orig)))
        verdict_size = orig
    else:
        print("%-40s %6.2f MB -> %6.2f MB (%.0f%%↓)  저장: %s"
              % (name, mb(orig), mb(new), 100.0 * (orig - new) / orig, os.path.basename(out)))
        verdict_size = new

    if mb(verdict_size) > HARD_MB:
        print("    ⚠ 최종 크기가 %.0fMB를 넘습니다 — 문서 분할을 검토하세요." % HARD_MB)
    elif mb(verdict_size) > GOAL_MB:
        print("    참고: 목표(%.0fMB)보다는 큽니다. 열람 빈도가 높은 문서면 분할 권장." % GOAL_MB)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        if not os.path.isfile(p):
            print("파일 없음:", p)
            continue
        compress(p)
