"""
기술문서(전기회로도·기계도면)처럼 pdf.js 실시간 렌더링이 불안정한 PDF를,
페이지별 PNG 이미지로 미리 래스터화해서 <원본이름>.pages/ 폴더에 저장한다.
pdf-viewer.html은 이 폴더가 있으면 이미지를, 없으면 기존 pdf.js 방식을 사용한다.
"""
import sys
import os
import pymupdf

DPI = 200

def convert(pdf_path):
    base = os.path.splitext(pdf_path)[0]
    out_dir = base + ".pages"
    os.makedirs(out_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=DPI)
        out_path = os.path.join(out_dir, f"{i}.png")
        pix.save(out_path)
        print(f"  {out_path}  ({pix.width}x{pix.height})")
    print(f"{pdf_path}: {doc.page_count}페이지 -> {out_dir}/")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        convert(p)
