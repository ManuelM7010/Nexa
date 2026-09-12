import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, isMaskable = false) {
  // Simple uncompressed or deflate-compressed raw truecolor RGBA PNG generator
  function crc32(buf) {
    let c;
    let crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, len + 8));
    buf.writeUInt32BE(crcVal, len + 8);
    return buf;
  }

  // Draw pixel data
  const rawRows = [];
  const cx = width / 2;
  const cy = height / 2;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter byte: none

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      // Background gradient: dark navy #0A192F to #0F2444
      const t = (x + y) / (width + height);
      let r = Math.round(10 + t * 5);
      let g = Math.round(25 + t * 11);
      let b = Math.round(47 + t * 21);
      let a = 255;

      // Rounded rect mask if not maskable
      if (!isMaskable) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          a = 0;
          r = 0; g = 0; b = 0;
        }
      }

      // Draw stylized "N" logo and upward liquidity indicator
      if (a > 0) {
        const scale = width / 512;
        const lx = (x - cx) / scale;
        const ly = (y - cy) / scale;

        // Left bar: lx between -120 and -70, ly between -110 and 110
        if (lx >= -120 && lx <= -70 && ly >= -110 && ly <= 110) {
          r = 37; g = 99; b = 235; // Blue-600
        }
        // Right bar: lx between 70 and 120, ly between -60 and 110
        else if (lx >= 70 && lx <= 120 && ly >= -60 && ly <= 110) {
          r = 56; g = 189; b = 248; // Sky-400
        }
        // Diagonal: lx - ly relation
        else if (ly >= -100 && ly <= 100 && Math.abs((lx - ly * 0.95)) <= 35) {
          r = Math.round(37 + (lx + 100) * 0.7);
          g = Math.round(99 + (lx + 100) * 0.5);
          b = 245;
        }
        // Spark ascent dot (circle at 95, -105)
        const dSpark = Math.hypot(lx - 95, ly - (-105));
        if (dSpark <= 18) {
          r = 16; g = 185; b = 129; // Emerald-500
        }
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }

  const rawBuffer = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawBuffer, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('PWA icons created successfully in /public');
