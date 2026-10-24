/* tools/mesure/png.mjs — décodeur et encodeur PNG minimaux (zlib de Node, sans dépendance).
   decode(fichier | Buffer) -> {w, h, rgba: Uint8Array}
   encodeIndex(W, H, idx, palette[[r,g,b]…], echelle) -> Buffer   (PNG indexé, agrandi en voisin le plus proche) */
import fs from 'node:fs';
import zlib from 'node:zlib';

export function decode(src) {
  const b = Buffer.isBuffer(src) ? src : fs.readFileSync(src);
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, plte = null, trns = null; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; if (d[12]) throw new Error('PNG entrelacé non pris en charge'); }
    else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8) throw new Error('PNG de profondeur ' + bd + ' non pris en charge');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], bpp = ch, stride = w * ch;
  const out = Buffer.alloc(stride * h); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
      cur[x] = v & 255;
    }
    prev = cur;
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (ct === 6) { rgba[o] = out[o]; rgba[o + 1] = out[o + 1]; rgba[o + 2] = out[o + 2]; rgba[o + 3] = out[o + 3]; }
    else if (ct === 2) { rgba[o] = out[i * 3]; rgba[o + 1] = out[i * 3 + 1]; rgba[o + 2] = out[i * 3 + 2]; rgba[o + 3] = 255; }
    else if (ct === 3) { const k = out[i]; rgba[o] = plte[k * 3]; rgba[o + 1] = plte[k * 3 + 1]; rgba[o + 2] = plte[k * 3 + 2]; rgba[o + 3] = trns && k < trns.length ? trns[k] : 255; }
    else if (ct === 0) { rgba[o] = rgba[o + 1] = rgba[o + 2] = out[i]; rgba[o + 3] = 255; }
    else if (ct === 4) { rgba[o] = rgba[o + 1] = rgba[o + 2] = out[i * 2]; rgba[o + 3] = out[i * 2 + 1]; }
  }
  return { w, h, rgba };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = ~0; for (let n = 0; n < buf.length; n++) c = CRC[(c ^ buf[n]) & 255] ^ (c >>> 8); return ~c >>> 0; }
function bloc(type, data) {
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
export function encodeIndex(W, H, idx, palette, echelle = 1) {
  const k = Math.max(1, echelle | 0), w = W * k, h = H * k;
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; const sy = (y / k) | 0;
    for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = idx[sy * W + ((x / k) | 0)] & 255;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3;
  const plte = Buffer.alloc(256 * 3); palette.forEach((c, i) => { plte[i * 3] = c[0]; plte[i * 3 + 1] = c[1]; plte[i * 3 + 2] = c[2]; });
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('PLTE', plte), bloc('IDAT', zlib.deflateSync(raw)), bloc('IEND', Buffer.alloc(0))]);
}
