"""Fixed PDF tasks executed inside Daytona. Inputs are data, never executable code."""
import html
import json
from pathlib import Path
import pymupdf as fitz


def split(source, output, limit=5):
    with fitz.open(source) as doc:
        if doc.needs_pass:
            raise ValueError("Password-protected PDF is not supported.")
        if not 1 <= len(doc) <= limit:
            raise ValueError(f"PDF must have 1–{limit} pages.")
        paths = []
        for i, page in enumerate(doc):
            scale = min(2, 2400 / max(page.rect.width, page.rect.height))
            if scale <= 0:
                raise ValueError("Invalid PDF page dimensions.")
            path = output / f"page-{i + 1:03}.png"
            page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False).save(path)
            paths.append(path.name)
        return paths


def render(data, output):
    esc = lambda x: html.escape(str(x if x is not None else ""))
    parts = [f'<h1>{esc(data["name"])}</h1>']
    category = None
    for item in data["items"]:
        if item["category"] != category:
            category = item["category"]
            parts.append(f'<h2>{esc(category)}</h2>')
        price = "—" if item["price"] is None else f'{item["price"]:g} {item["currency"] or ""}'
        parts.append(f'<div class="dish"><p><b>{esc(item["name"])}</b> · {esc(price)}</p><p class="description">{esc(item["description"])} {esc(item["portion"])}</p></div>')
    if data.get("url"):
        import qrcode
        qrcode.make(data["url"]).save(output / "qr.png")
        parts.append(f'<h2>Digital menu</h2><img src="qr.png" width="90" height="90"><p>{esc(data["url"])}</p>')
    css = 'body {font-family:sans-serif; font-size:11pt; color:#302426} h1 {font-size:28pt;color:#702b3b} h2 {font-size:16pt;color:#702b3b} p {margin:4pt 0} .dish {margin-bottom:12pt} .description {font-size:10pt;color:#625659}'
    story = fitz.Story(html="".join(parts), user_css=css, archive=fitz.Archive(str(output)))
    def rectfn(n, filled):
        if n >= 100:
            raise ValueError("Rendered menu exceeds 100 pages.")
        return fitz.Rect(0, 0, 595, 842), fitz.Rect(40, 40, 555, 802), None
    writer = fitz.DocumentWriter(str(output / "menu.pdf"))
    try:
        story.write(writer, rectfn)
    finally:
        writer.close()
    with fitz.open(output / "menu.pdf") as doc:
        doc[0].get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False).save(output / "preview.png")
    return ["menu.pdf", "preview.png"]


if __name__ == "__main__":
    data = json.loads(Path("input.json").read_text())
    output = Path("output")
    output.mkdir(exist_ok=True)
    files = split("source.pdf", output, data.get("limit", 5)) if data["task"] == "split" else render(data, output)
    Path("manifest.json").write_text(json.dumps(files))
