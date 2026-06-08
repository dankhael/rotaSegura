const DATA_CODEWORDS_L = [19, 34, 55, 80, 108, 136, 156, 194, 232, 274];
const ECC_CODEWORDS_L = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
const BLOCKS_L = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];
const FORMAT_MASK = 0x5412;

type QrMatrix = {
  modules: boolean[][];
  reserved: boolean[][];
  size: number;
};

export function qrCodeSvg(value: string): string {
  const bytes = Array.from(new TextEncoder().encode(value));
  const version = chooseVersion(bytes.length);
  const matrix = createMatrix(version);
  const data = encodeData(bytes, version);
  const codewords = addErrorCorrection(data, version);

  drawFunctionPatterns(matrix, version);
  drawCodewords(matrix, codewords);
  const mask = chooseBestMask(matrix);
  applyMask(matrix, mask);
  drawFormatBits(matrix, mask);

  return matrixToSvg(matrix.modules);
}

function chooseVersion(byteLength: number): number {
  const version = DATA_CODEWORDS_L.findIndex((capacity) => byteLength + 2 <= capacity) + 1;
  if (version > 0) return version;
  throw new Error("Conteúdo muito longo para gerar QR Code.");
}

function createMatrix(version: number): QrMatrix {
  const size = 17 + version * 4;
  return {
    size,
    modules: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
  };
}

function drawFunctionPatterns(matrix: QrMatrix, version: number) {
  drawFinder(matrix, 0, 0);
  drawFinder(matrix, matrix.size - 7, 0);
  drawFinder(matrix, 0, matrix.size - 7);
  drawTiming(matrix);
  drawAlignments(matrix, version);
  reserveFormatAreas(matrix);
}

function drawFinder(matrix: QrMatrix, x: number, y: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (!inBounds(matrix, xx, yy)) continue;

      const dark =
        dx >= 0 &&
        dx <= 6 &&
        dy >= 0 &&
        dy <= 6 &&
        (dx === 0 ||
          dx === 6 ||
          dy === 0 ||
          dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));

      setModule(matrix, xx, yy, dark, true);
    }
  }
}

function drawTiming(matrix: QrMatrix) {
  for (let i = 8; i < matrix.size - 8; i++) {
    setModule(matrix, i, 6, i % 2 === 0, true);
    setModule(matrix, 6, i, i % 2 === 0, true);
  }
}

function drawAlignments(matrix: QrMatrix, version: number) {
  for (const y of ALIGNMENT_POSITIONS[version - 1]) {
    for (const x of ALIGNMENT_POSITIONS[version - 1]) {
      if (matrix.reserved[y]?.[x]) continue;
      drawAlignment(matrix, x - 2, y - 2);
    }
  }
}

function drawAlignment(matrix: QrMatrix, x: number, y: number) {
  for (let dy = 0; dy < 5; dy++) {
    for (let dx = 0; dx < 5; dx++) {
      const dark = dx === 0 || dx === 4 || dy === 0 || dy === 4 || (dx === 2 && dy === 2);
      setModule(matrix, x + dx, y + dy, dark, true);
    }
  }
}

function reserveFormatAreas(matrix: QrMatrix) {
  for (let i = 0; i < 9; i++) {
    reserve(matrix, 8, i);
    reserve(matrix, i, 8);
  }
  for (let i = 0; i < 8; i++) {
    reserve(matrix, matrix.size - 1 - i, 8);
    reserve(matrix, 8, matrix.size - 1 - i);
  }
  setModule(matrix, 8, matrix.size - 8, true, true);
}

function encodeData(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const dataCapacityBits = DATA_CODEWORDS_L[version - 1] * 8;
  appendBits(bits, 0, Math.min(4, dataCapacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data = bitsToBytes(bits);
  for (let pad = 0xec; data.length < DATA_CODEWORDS_L[version - 1]; pad ^= 0xec ^ 0x11) {
    data.push(pad);
  }
  return data;
}

function addErrorCorrection(data: number[], version: number): number[] {
  const blocks = BLOCKS_L[version - 1];
  const eccLength = ECC_CODEWORDS_L[version - 1];
  const shortBlockLength = Math.floor(DATA_CODEWORDS_L[version - 1] / blocks);
  const remainder = DATA_CODEWORDS_L[version - 1] % blocks;
  const dataBlocks: number[][] = [];
  let offset = 0;

  for (let i = 0; i < blocks; i++) {
    const length = shortBlockLength + (i >= blocks - remainder ? 1 : 0);
    dataBlocks.push(data.slice(offset, offset + length));
    offset += length;
  }

  const eccBlocks = dataBlocks.map((block) => reedSolomonRemainder(block, eccLength));
  const result: number[] = [];
  const maxDataLength = Math.max(...dataBlocks.map((block) => block.length));

  for (let i = 0; i < maxDataLength; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < eccLength; i++) {
    for (const block of eccBlocks) result.push(block[i]);
  }

  return result;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const divisor = reedSolomonDivisor(degree);
  const result = Array<number>(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }

  return result;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;

  for (let root = 0; root < degree; root++) {
    for (let i = 0; i < degree; i++) {
      result[i] = gfMultiply(result[i], gfPow(2, root));
      if (i + 1 < degree) result[i] ^= result[i + 1];
    }
  }

  return result;
}

function gfPow(x: number, power: number): number {
  let result = 1;
  for (let i = 0; i < power; i++) result = gfMultiply(result, x);
  return result;
}

function gfMultiply(x: number, y: number): number {
  let result = 0;
  for (; y !== 0; y >>>= 1) {
    if (y & 1) result ^= x;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  return result;
}

function drawCodewords(matrix: QrMatrix, codewords: number[]) {
  const bits = codewords.flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => ((byte >>> (7 - index)) & 1) === 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let x = matrix.size - 1; x >= 1; x -= 2) {
    if (x === 6) x--;
    for (let yOffset = 0; yOffset < matrix.size; yOffset++) {
      const y = upward ? matrix.size - 1 - yOffset : yOffset;
      for (let dx = 0; dx < 2; dx++) {
        const xx = x - dx;
        if (matrix.reserved[y][xx]) continue;
        matrix.modules[y][xx] = bits[bitIndex++] ?? false;
      }
    }
    upward = !upward;
  }
}

function chooseBestMask(matrix: QrMatrix): number {
  let bestMask = 0;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    applyMask(matrix, mask);
    drawFormatBits(matrix, mask);
    const penalty = calculatePenalty(matrix.modules);
    applyMask(matrix, mask);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
  }

  return bestMask;
}

function applyMask(matrix: QrMatrix, mask: number) {
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.reserved[y][x] && maskBit(mask, x, y)) {
        matrix.modules[y][x] = !matrix.modules[y][x];
      }
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function drawFormatBits(matrix: QrMatrix, mask: number) {
  const bits = getFormatBits(mask);
  for (let i = 0; i <= 5; i++) setModule(matrix, 8, i, getBit(bits, i), true);
  setModule(matrix, 8, 7, getBit(bits, 6), true);
  setModule(matrix, 8, 8, getBit(bits, 7), true);
  setModule(matrix, 7, 8, getBit(bits, 8), true);
  for (let i = 9; i < 15; i++) setModule(matrix, 14 - i, 8, getBit(bits, i), true);

  for (let i = 0; i < 8; i++) setModule(matrix, matrix.size - 1 - i, 8, getBit(bits, i), true);
  for (let i = 8; i < 15; i++) setModule(matrix, 8, matrix.size - 15 + i, getBit(bits, i), true);
  setModule(matrix, 8, matrix.size - 8, true, true);
}

function getFormatBits(mask: number): number {
  const data = (1 << 3) | mask;
  let bits = data << 10;
  const generator = 0x537;

  for (let i = 14; i >= 10; i--) {
    if (((bits >>> i) & 1) !== 0) bits ^= generator << (i - 10);
  }

  return ((data << 10) | bits) ^ FORMAT_MASK;
}

function calculatePenalty(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  for (let y = 0; y < size; y++) penalty += linePenalty(modules[y]);
  for (let x = 0; x < size; x++) penalty += linePenalty(modules.map((row) => row[x]));

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y][x];
      if (
        modules[y][x + 1] === color &&
        modules[y + 1][x] === color &&
        modules[y + 1][x + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  const dark = modules.flat().filter(Boolean).length;
  penalty += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
  return penalty;
}

function linePenalty(line: boolean[]): number {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let i = 1; i < line.length; i++) {
    if (line[i] === runColor) {
      runLength++;
      if (runLength === 5) penalty += 3;
      else if (runLength > 5) penalty++;
    } else {
      runColor = line[i];
      runLength = 1;
    }
  }

  return penalty;
}

function matrixToSvg(modules: boolean[][]): string {
  const quietZone = 4;
  const size = modules.length + quietZone * 2;
  const paths: string[] = [];

  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) paths.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`);
    });
  });

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img"><path fill="#fff" d="M0 0h${size}v${size}H0z"/><path fill="#0f1620" d="${paths.join("")}"/></svg>`;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function bitsToBytes(bits: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    result.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  return result;
}

function getBit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

function setModule(matrix: QrMatrix, x: number, y: number, dark: boolean, reserved: boolean) {
  if (!inBounds(matrix, x, y)) return;
  matrix.modules[y][x] = dark;
  if (reserved) matrix.reserved[y][x] = true;
}

function reserve(matrix: QrMatrix, x: number, y: number) {
  if (inBounds(matrix, x, y)) matrix.reserved[y][x] = true;
}

function inBounds(matrix: QrMatrix, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < matrix.size && y < matrix.size;
}
