#!/usr/bin/env python3
"""
Extract polar bear animation frames from green-screen sprite sheet without external deps.
Outputs:
- walk-s{state}-f{0|1}.png (top row)
- sit-s{state}.png         (middle row)
- stand-s{state}.png       (third row)
"""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "extension/assets/sprites/polar-bear-sheet.png"
OUT_DIR = ROOT / "extension/assets/sprites/frames"
MANIFEST = OUT_DIR / "manifest.json"


class PNGImage:
    def __init__(self, width: int, height: int, rgba: bytearray):
        self.width = width
        self.height = height
        self.rgba = rgba

    def get(self, x: int, y: int) -> Tuple[int, int, int, int]:
        i = (y * self.width + x) * 4
        d = self.rgba
        return d[i], d[i + 1], d[i + 2], d[i + 3]


def paeth_predictor(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: Path) -> PNGImage:
    data = path.read_bytes()
    sig = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(sig):
        raise ValueError("Not a PNG file")

    pos = len(sig)
    width = height = None
    bit_depth = color_type = interlace = None
    idat_parts: List[bytes] = []

    while pos < len(data):
        if pos + 8 > len(data):
            break
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk_data = data[pos + 8:pos + 8 + length]
        pos += 12 + length

        if ctype == b"IHDR":
            width, height, bit_depth, color_type, _comp, _filter, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
        elif ctype == b"IDAT":
            idat_parts.append(chunk_data)
        elif ctype == b"IEND":
            break

    if width is None or height is None:
        raise ValueError("Invalid PNG: missing IHDR")
    if bit_depth != 8:
        raise ValueError(f"Unsupported bit depth: {bit_depth}")
    if interlace != 0:
        raise ValueError("Interlaced PNG is not supported")
    if color_type not in (2, 6):
        raise ValueError(f"Unsupported color type: {color_type}")

    bpp = 3 if color_type == 2 else 4
    stride = width * bpp

    raw = zlib.decompress(b"".join(idat_parts))
    expected = height * (1 + stride)
    if len(raw) != expected:
        raise ValueError(f"Unexpected decompressed size: {len(raw)} vs {expected}")

    out = bytearray(width * height * 4)
    prev = bytearray(stride)
    src_pos = 0

    for y in range(height):
        ftype = raw[src_pos]
        src_pos += 1
        scan = bytearray(raw[src_pos:src_pos + stride])
        src_pos += stride

        if ftype == 1:
            for i in range(bpp, stride):
                scan[i] = (scan[i] + scan[i - bpp]) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                scan[i] = (scan[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = scan[i - bpp] if i >= bpp else 0
                up = prev[i]
                scan[i] = (scan[i] + ((left + up) // 2)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                a = scan[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                scan[i] = (scan[i] + paeth_predictor(a, b, c)) & 0xFF
        elif ftype != 0:
            raise ValueError(f"Unsupported filter type: {ftype}")

        prev = scan

        for x in range(width):
            si = x * bpp
            di = (y * width + x) * 4
            out[di] = scan[si]
            out[di + 1] = scan[si + 1]
            out[di + 2] = scan[si + 2]
            out[di + 3] = 255 if bpp == 3 else scan[si + 3]

    return PNGImage(width, height, out)


def write_png_rgba(path: Path, width: int, height: int, rgba: bytes) -> None:
    def chunk(ctype: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + ctype
            + payload
            + struct.pack(">I", zlib.crc32(ctype + payload) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)

    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        start = y * stride
        rows.extend(rgba[start:start + stride])

    idat = zlib.compress(bytes(rows), level=9)

    png = bytearray()
    png.extend(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", ihdr))
    png.extend(chunk(b"IDAT", idat))
    png.extend(chunk(b"IEND", b""))
    path.write_bytes(bytes(png))


def is_green_bg(r: int, g: int, b: int, a: int) -> bool:
    if a < 10:
        return True
    return g >= 115 and g >= int(r * 1.22) and g >= int(b * 1.22)


def alpha_key_px(r: int, g: int, b: int, a: int) -> Tuple[int, int, int, int]:
    if is_green_bg(r, g, b, a):
        return (r, g, b, 0)
    return (r, g, b, 255)


def keep_largest_alpha_blob(rgba: bytearray, w: int, h: int) -> None:
    total = w * h
    visited = bytearray(total)
    labels = [-1] * total
    comps: List[List[int]] = []

    for idx in range(total):
        if visited[idx]:
            continue
        if rgba[idx * 4 + 3] == 0:
            visited[idx] = 1
            continue

        visited[idx] = 1
        stack = [idx]
        comp: List[int] = []

        while stack:
            cur = stack.pop()
            comp.append(cur)
            x = cur % w
            y = cur // w

            if x > 0:
                n = cur - 1
                if not visited[n] and rgba[n * 4 + 3] > 0:
                    visited[n] = 1
                    stack.append(n)
            if x + 1 < w:
                n = cur + 1
                if not visited[n] and rgba[n * 4 + 3] > 0:
                    visited[n] = 1
                    stack.append(n)
            if y > 0:
                n = cur - w
                if not visited[n] and rgba[n * 4 + 3] > 0:
                    visited[n] = 1
                    stack.append(n)
            if y + 1 < h:
                n = cur + w
                if not visited[n] and rgba[n * 4 + 3] > 0:
                    visited[n] = 1
                    stack.append(n)

        comp_id = len(comps)
        for px in comp:
            labels[px] = comp_id
        comps.append(comp)

    if not comps:
        return

    largest_id = max(range(len(comps)), key=lambda i: len(comps[i]))
    for idx in range(total):
        if labels[idx] != largest_id:
            rgba[idx * 4 + 3] = 0


def find_components(mask: bytearray, w: int, h: int) -> List[Tuple[int, int, int, int, int]]:
    visited = bytearray(w * h)
    comps: List[Tuple[int, int, int, int, int]] = []

    for idx in range(w * h):
        if visited[idx] or not mask[idx]:
            continue

        visited[idx] = 1
        stack = [idx]
        minx = maxx = idx % w
        miny = maxy = idx // w
        area = 0

        while stack:
            cur = stack.pop()
            x = cur % w
            y = cur // w
            area += 1
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)

            if x > 0:
                n = cur - 1
                if not visited[n] and mask[n]:
                    visited[n] = 1
                    stack.append(n)
            if x + 1 < w:
                n = cur + 1
                if not visited[n] and mask[n]:
                    visited[n] = 1
                    stack.append(n)
            if y > 0:
                n = cur - w
                if not visited[n] and mask[n]:
                    visited[n] = 1
                    stack.append(n)
            if y + 1 < h:
                n = cur + w
                if not visited[n] and mask[n]:
                    visited[n] = 1
                    stack.append(n)

        comps.append((minx, miny, maxx, maxy, area))

    return comps


def group_rows(comps: List[Tuple[int, int, int, int, int]]) -> List[List[Tuple[int, int, int, int, int]]]:
    comps_sorted = sorted(comps, key=lambda c: (c[1] + c[3]) / 2)
    rows: List[List[Tuple[int, int, int, int, int]]] = []

    for c in comps_sorted:
        cy = (c[1] + c[3]) / 2
        placed = False
        for row in rows:
            row_cy = sum((r[1] + r[3]) / 2 for r in row) / len(row)
            if abs(cy - row_cy) <= 85:
                row.append(c)
                placed = True
                break
        if not placed:
            rows.append([c])

    return rows


def select_animation_rows(rows: List[List[Tuple[int, int, int, int, int]]]) -> List[List[Tuple[int, int, int, int, int]]]:
    eligible = []
    for row in rows:
        if len(row) < 8:
            continue
        heights = [(c[3] - c[1] + 1) for c in row]
        avg_h = sum(heights) / len(heights)
        if avg_h > 170:
            continue
        eligible.append(row)

    if len(eligible) < 3:
        raise SystemExit(f"Could not detect 3 animation rows, found {len(eligible)}")

    eligible = sorted(eligible, key=lambda row: min(c[1] for c in row))
    return [sorted(row, key=lambda c: c[0])[:10] for row in eligible[:3]]


def crop_and_write(
    img: PNGImage,
    box: Tuple[int, int, int, int],
    out_path: Path,
    pad_x: int = 16,
    pad_top: int = 18,
    pad_bottom: int = 14,
) -> Tuple[int, int]:
    minx, miny, maxx, maxy = box
    w, h = img.width, img.height

    x0 = max(0, minx - pad_x)
    y0 = max(0, miny - pad_top)
    x1 = min(w - 1, maxx + pad_x)
    y1 = min(h - 1, maxy + pad_bottom)

    cw = x1 - x0 + 1
    ch = y1 - y0 + 1
    out_rgba = bytearray(cw * ch * 4)

    for y in range(ch):
        sy = y0 + y
        for x in range(cw):
            sx = x0 + x
            r, g, b, a = img.get(sx, sy)
            rr, gg, bb, aa = alpha_key_px(r, g, b, a)
            di = (y * cw + x) * 4
            out_rgba[di] = rr
            out_rgba[di + 1] = gg
            out_rgba[di + 2] = bb
            out_rgba[di + 3] = aa

    keep_largest_alpha_blob(out_rgba, cw, ch)
    write_png_rgba(out_path, cw, ch, out_rgba)
    return cw, ch


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source sprite: {SRC}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img = read_png(SRC)
    w, h = img.width, img.height

    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = img.get(x, y)
            if not is_green_bg(r, g, b, a):
                mask[y * w + x] = 1

    comps = find_components(mask, w, h)
    comps = [c for c in comps if c[4] >= 900 and (c[3] - c[1]) >= 35 and (c[2] - c[0]) >= 45]
    if not comps:
        raise SystemExit("No bear components found")

    rows = group_rows(comps)
    walk_row, sit_row, stand_row = select_animation_rows(rows)

    manifest = {
        "source": str(SRC.relative_to(ROOT)),
        "states": 5,
        "walkFramesPerState": 2,
        "walk": [],
        "sit": [],
        "stand": [],
    }

    for state in range(5):
        for frame in range(2):
            idx = state * 2 + frame
            minx, miny, maxx, maxy, _ = walk_row[idx]
            name = f"walk-s{state}-f{frame}.png"
            cw, ch = crop_and_write(img, (minx, miny, maxx, maxy), OUT_DIR / name)
            manifest["walk"].append(
                {
                    "state": state,
                    "frame": frame,
                    "file": f"assets/sprites/frames/{name}",
                    "width": cw,
                    "height": ch,
                }
            )

        sidx = state * 2 + 1
        minx, miny, maxx, maxy, _ = sit_row[sidx]
        sname = f"sit-s{state}.png"
        scw, sch = crop_and_write(img, (minx, miny, maxx, maxy), OUT_DIR / sname)
        manifest["sit"].append(
            {
                "state": state,
                "file": f"assets/sprites/frames/{sname}",
                "width": scw,
                "height": sch,
            }
        )

        tidx = state * 2 + 1
        minx, miny, maxx, maxy, _ = stand_row[tidx]
        tname = f"stand-s{state}.png"
        tcw, tch = crop_and_write(img, (minx, miny, maxx, maxy), OUT_DIR / tname)
        manifest["stand"].append(
            {
                "state": state,
                "file": f"assets/sprites/frames/{tname}",
                "width": tcw,
                "height": tch,
            }
        )

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote frame set to {OUT_DIR}")
    print(f"Wrote manifest: {MANIFEST}")


if __name__ == "__main__":
    main()
