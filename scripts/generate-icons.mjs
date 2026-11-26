/**
 * Dependency-free icon generator for Teglato.
 * Renders a crisp black-cat silhouette with warm yellow eyes into PNGs and a multi-size ICO.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const ICONS_DIR = resolve(process.cwd(), 'src-tauri/icons');

// Build CRC32 lookup table once for valid PNG chunks.
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, crcInput, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(frames.length, 4);

  const dirEntries = [];
  let offset = 6 + frames.length * 16;

  for (const frame of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = frame.size >= 256 ? 0 : frame.size;
    entry[1] = frame.size >= 256 ? 0 : frame.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(frame.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += frame.png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...frames.map((f) => f.png)]);
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function drawCatIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4; // 4x4 supersampling for clean anti-aliased edges

  const samplePixel = (u, v) => {
    // Warm amber circular badge background
    const dxBg = u - 0.5;
    const dyBg = v - 0.5;
    const distBg = Math.hypot(dxBg, dyBg);
    if (distBg > 0.47) {
      return [0, 0, 0, 0];
    }

    // Subtle badge border ring
    let r = 247;
    let g = 199;
    let b = 74;
    if (distBg > 0.435) {
      r = 35;
      g = 36;
      b = 44;
    }

    // Cat head + shoulders + ears
    const headDist = Math.hypot((u - 0.5) / 0.285, (v - 0.57) / 0.245);
    const bodyDist = Math.hypot((u - 0.5) / 0.27, (v - 0.86) / 0.22);
    const leftEar = pointInTriangle(u, v, 0.23, 0.49, 0.27, 0.21, 0.43, 0.37);
    const rightEar = pointInTriangle(u, v, 0.77, 0.49, 0.73, 0.21, 0.57, 0.37);
    const inCat = headDist <= 1 || bodyDist <= 1 || leftEar || rightEar;

    if (inCat) {
      r = 25;
      g = 26;
      b = 31;

      // Inner ears
      const leftInnerEar = pointInTriangle(u, v, 0.265, 0.43, 0.29, 0.275, 0.385, 0.385);
      const rightInnerEar = pointInTriangle(u, v, 0.735, 0.43, 0.71, 0.275, 0.615, 0.385);
      if (leftInnerEar || rightInnerEar) {
        r = 110;
        g = 86;
        b = 96;
      }

      // Expressive yellow eyes
      const leftEye = Math.hypot(u - 0.39, v - 0.56);
      const rightEye = Math.hypot(u - 0.61, v - 0.56);
      if (leftEye <= 0.068 || rightEye <= 0.068) {
        r = 248;
        g = 204;
        b = 70;
        const leftPupil = Math.hypot((u - 0.395) / 0.026, (v - 0.56) / 0.044);
        const rightPupil = Math.hypot((u - 0.605) / 0.026, (v - 0.56) / 0.044);
        if (leftPupil <= 1 || rightPupil <= 1) {
          r = 18;
          g = 19;
          b = 24;
        }
        // Specular catchlight
        if (Math.hypot(u - 0.378, v - 0.542) <= 0.015 || Math.hypot(u - 0.592, v - 0.542) <= 0.015) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      // Tiny pink nose
      if (Math.hypot((u - 0.5) / 0.028, (v - 0.635) / 0.02) <= 1) {
        r = 232;
        g = 138;
        b = 158;
      }
    }

    return [r, g, b, 255];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const u = (x + (sx + 0.5) / samples) / size;
          const v = (y + (sy + 0.5) / samples) / size;
          const [sr, sg, sb, sa] = samplePixel(u, v);
          accR += sr * (sa / 255);
          accG += sg * (sa / 255);
          accB += sb * (sa / 255);
          accA += sa;
        }
      }
      const n = samples * samples;
      const outA = accA / n;
      const idx = (y * size + x) * 4;
      if (outA > 0) {
        const alphaNorm = outA / 255;
        rgba[idx] = Math.min(255, Math.round(accR / n / alphaNorm));
        rgba[idx + 1] = Math.min(255, Math.round(accG / n / alphaNorm));
        rgba[idx + 2] = Math.min(255, Math.round(accB / n / alphaNorm));
        rgba[idx + 3] = Math.min(255, Math.round(outA));
      }
    }
  }

  return rgba;
}

mkdirSync(ICONS_DIR, { recursive: true });

const sizes = [32, 128, 256];
const pngBySize = new Map();
for (const size of sizes) {
  const rgba = drawCatIcon(size);
  pngBySize.set(size, encodePng(size, size, rgba));
}

writeFileSync(resolve(ICONS_DIR, '32x32.png'), pngBySize.get(32));
writeFileSync(resolve(ICONS_DIR, '128x128.png'), pngBySize.get(128));
writeFileSync(resolve(ICONS_DIR, '128x128@2x.png'), pngBySize.get(256));
writeFileSync(resolve(ICONS_DIR, 'icon.png'), pngBySize.get(256));
writeFileSync(
  resolve(ICONS_DIR, 'icon.ico'),
  encodeIco([
    { size: 32, png: pngBySize.get(32) },
    { size: 128, png: pngBySize.get(128) },
  ]),
);

console.log('Generated Teglato icons in', ICONS_DIR);
