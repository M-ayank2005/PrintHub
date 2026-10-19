const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, r, g, b, a) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const isInner =
        (x >= width * 0.3 && x <= width * 0.7 && y >= height * 0.38 && y <= height * 0.62) ||
        (x >= width * 0.38 && x <= width * 0.62 && y >= height * 0.25 && y <= height * 0.38) ||
        (x >= width * 0.35 && x <= width * 0.65 && y >= height * 0.62 && y <= height * 0.75);

      if (isInner) {
        raw[pxOffset] = 255;
        raw[pxOffset + 1] = 255;
        raw[pxOffset + 2] = 255;
        raw[pxOffset + 3] = 255;
      } else {
        raw[pxOffset] = r;
        raw[pxOffset + 1] = g;
        raw[pxOffset + 2] = b;
        raw[pxOffset + 3] = a;
      }
    }
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(raw));
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const businessPublic = path.join(__dirname, '..', 'business', 'public');
const customerPublic = path.join(__dirname, '..', 'customer', 'public');

[businessPublic, customerPublic].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const png192 = createPng(192, 192, 79, 70, 229, 255);
const png512 = createPng(512, 512, 79, 70, 229, 255);
const png32 = createPng(32, 32, 79, 70, 229, 255);

fs.writeFileSync(path.join(businessPublic, 'icon-192.png'), png192);
fs.writeFileSync(path.join(businessPublic, 'icon-512.png'), png512);
fs.writeFileSync(path.join(businessPublic, 'favicon.ico'), png32);

fs.writeFileSync(path.join(customerPublic, 'icon-192.png'), png192);
fs.writeFileSync(path.join(customerPublic, 'icon-512.png'), png512);
fs.writeFileSync(path.join(customerPublic, 'favicon.ico'), png32);

console.log('Successfully generated icon-192.png, icon-512.png, and favicon.ico in business and customer public dirs!');
