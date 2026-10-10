// PNG fără dependențe (zlib din Node): citire RGB/RGBA pe 8 biți, scriere RGBA.
import fs from 'node:fs';
import zlib from 'node:zlib';

export function readPNG(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, type = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      type = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (type !== 6 && type !== 2)) throw new Error('PNG neacceptat (doar RGB/RGBA pe 8 biți): ' + file);
    } else if (kind === 'IDAT') idat.push(data);
    pos += len + 12;
  }
  const bpp = type === 6 ? 4 : 3, stride = width * bpp, raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0, b = y ? px[row - stride + x] : 0, c = x >= bpp && y ? px[row - stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      px[row + x] = (src[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set(px.subarray(i * bpp, i * bpp + 3), i * 4);
    data[i * 4 + 3] = bpp === 4 ? px[i * 4 + 3] : 255;
  }
  return { width, height, data };
}

export function writePNG(file, { width, height, data }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  const chunk = (kind, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length);
    head.write(kind, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body])));
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]));
}

/** Imagine RGBA goală. */
export const blank = (width, height, rgba = [0, 0, 0, 0]) => {
  const data = new Uint8Array(width * height * 4);
  if (rgba.some(Boolean)) for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, data };
};

/** Întinde culoarea marginilor în pixelii transparenți: filtrarea liniară nu mai amestecă negru (fără contur închis). */
export function bleed({ width, height, data }, passes = 8) {
  const known = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) known[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const next = known.slice();
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
          if (j < 0 || !known[j]) continue;
          r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; n++;
        }
        if (!n) continue;
        data[i * 4] = r / n; data[i * 4 + 1] = g / n; data[i * 4 + 2] = b / n;
        next[i] = 1;
      }
    known.set(next);
  }
}
