import { parseRgb } from "~/libs/theme";

import type { ThemeConstraint, ThemeVariable } from "~/libs/theme";

const GLYPHS: Record<string, string[]> = {
  a: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  b: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  c: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  d: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  e: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  f: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  g: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  h: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  i: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  j: ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  k: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  l: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  m: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  n: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  o: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  p: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  r: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  s: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  t: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  u: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  v: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  x: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  ".": [".....", ".....", ".....", ".....", ".....", "..#..", "..#.."],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
};

const SCALE = 2;
const CHAR_ADVANCE = 6 * SCALE;
const TEXT_HEIGHT = 7 * SCALE;
const PADDING = 16;
const SWATCH_WIDTH = 96;
const SWATCH_HEIGHT = 36;
const ROW_HEIGHT = 44;
const BAND_HEIGHT = 40;
const BAND_BODY_HEIGHT = 34;
const LABEL_OFFSET = SWATCH_WIDTH + 12;
const MAX_ROWS = 24;
const MAX_BANDS = 8;
const MIN_WIDTH = 360;
const MAX_WIDTH = 900;

const CANVAS_COLOR: [number, number, number] = [24, 24, 28];
const OUTLINE_COLOR: [number, number, number] = [72, 72, 80];
const NAME_COLOR: [number, number, number] = [232, 232, 236];
const VALUE_COLOR: [number, number, number] = [148, 148, 156];
const CHECKER_COLORS: [number, number, number][] = [
  [90, 90, 96],
  [46, 46, 52],
];

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const buildChunk = (type: string, data: Uint8Array): Uint8Array => {
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let index = 0; index < 4; index++) {
    chunk[4 + index] = type.charCodeAt(index);
  }
  chunk.set(data, 8);
  let crc = 0xffffffff;
  for (let index = 4; index < chunk.length - 4; index++) {
    crc = CRC_TABLE[(crc ^ chunk[index]) & 0xff] ^ (crc >>> 8);
  }
  view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0);
  return chunk;
};

export const renderThemePreview = async (
  variables: ThemeVariable[],
  values: Record<string, string>,
  constraints: ThemeConstraint[],
): Promise<Uint8Array<ArrayBuffer>> => {
  const rows = variables
    .filter((variable) => (variable.kind ?? "color") === "color")
    .slice(0, MAX_ROWS)
    .map((variable) => {
      const rgb = parseRgb(values[variable.name] ?? "");
      return {
        name: variable.name,
        rgb,
        value: rgb
          ? `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
          : "no value",
      };
    });

  const bands = constraints
    .filter((constraint) => constraint.type === "contrast")
    .slice(0, MAX_BANDS)
    .map((constraint) => ({
      label: `${constraint.foreground} on ${constraint.background} ${constraint.min}:1`,
      foreground: parseRgb(values[constraint.foreground] ?? ""),
      background: parseRgb(values[constraint.background] ?? ""),
    }));

  const width = Math.min(
    MAX_WIDTH,
    Math.max(
      MIN_WIDTH,
      ...rows.map(
        (row) =>
          PADDING +
          LABEL_OFFSET +
          Math.max(row.name.length, row.value.length) * CHAR_ADVANCE +
          PADDING,
      ),
      ...bands.map((band) => PADDING + 10 + band.label.length * CHAR_ADVANCE + PADDING + 10),
    ),
  );
  const height = PADDING * 2 + rows.length * ROW_HEIGHT + bands.length * BAND_HEIGHT;

  const pixels = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index++) {
    pixels.set(CANVAS_COLOR, index * 3);
  }

  const fillRect = (
    left: number,
    top: number,
    rectWidth: number,
    rectHeight: number,
    color: [number, number, number],
  ) => {
    for (let y = Math.max(0, top); y < Math.min(height, top + rectHeight); y++) {
      for (let x = Math.max(0, left); x < Math.min(width, left + rectWidth); x++) {
        pixels.set(color, (y * width + x) * 3);
      }
    }
  };

  const drawText = (text: string, left: number, top: number, color: [number, number, number]) => {
    for (let position = 0; position < text.length; position++) {
      const glyph = GLYPHS[text[position].toLowerCase()];
      if (!glyph) {
        continue;
      }
      glyph.forEach((line, glyphY) => {
        for (let glyphX = 0; glyphX < line.length; glyphX++) {
          if (line[glyphX] === "#") {
            fillRect(
              left + position * CHAR_ADVANCE + glyphX * SCALE,
              top + glyphY * SCALE,
              SCALE,
              SCALE,
              color,
            );
          }
        }
      });
    }
  };

  rows.forEach((row, index) => {
    const top = PADDING + index * ROW_HEIGHT;
    fillRect(PADDING - 1, top - 1, SWATCH_WIDTH + 2, SWATCH_HEIGHT + 2, OUTLINE_COLOR);
    if (row.rgb) {
      fillRect(PADDING, top, SWATCH_WIDTH, SWATCH_HEIGHT, row.rgb);
    } else {
      for (let y = 0; y < SWATCH_HEIGHT; y += 6) {
        for (let x = 0; x < SWATCH_WIDTH; x += 6) {
          fillRect(PADDING + x, top + y, 6, 6, CHECKER_COLORS[((x + y) / 6) % 2]);
        }
      }
    }
    drawText(row.name, PADDING + LABEL_OFFSET, top + 2, NAME_COLOR);
    drawText(row.value, PADDING + LABEL_OFFSET, top + 6 + TEXT_HEIGHT, VALUE_COLOR);
  });

  bands.forEach((band, index) => {
    const top = PADDING + rows.length * ROW_HEIGHT + index * BAND_HEIGHT;
    fillRect(PADDING - 1, top - 1, width - PADDING * 2 + 2, BAND_BODY_HEIGHT + 2, OUTLINE_COLOR);
    if (!band.background || !band.foreground) {
      for (let y = 0; y < BAND_BODY_HEIGHT; y += 6) {
        for (let x = 0; x < width - PADDING * 2; x += 6) {
          fillRect(PADDING + x, top + y, 6, 6, CHECKER_COLORS[((x + y) / 6) % 2]);
        }
      }
      return;
    }
    fillRect(PADDING, top, width - PADDING * 2, BAND_BODY_HEIGHT, band.background);
    drawText(band.label, PADDING + 10, top + (BAND_BODY_HEIGHT - TEXT_HEIGHT) / 2, band.foreground);
  });

  const stride = width * 3 + 1;
  const scanlines = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    scanlines.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * stride + 1);
  }
  const compressed = new Uint8Array(
    await new Response(
      new Blob([scanlines]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);

  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    buildChunk("IHDR", header),
    buildChunk("IDAT", compressed),
    buildChunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
};
