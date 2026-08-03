import { describe, expect, it } from "vitest";

import { renderThemePreview } from "./theme-preview";

import type { ThemeConstraint, ThemeVariable } from "./theme";

const bg: ThemeVariable = {
  name: "--bg",
  description: "Page background color",
  defaultValue: "255 248 240",
};
const text: ThemeVariable = {
  name: "--text",
  description: "Main text color",
  defaultValue: "20 20 20",
};
const cornerShape: ThemeVariable = {
  name: "--corner-shape",
  description: "Corner shape",
  defaultValue: "round",
  kind: "enum",
  allowedValues: ["round", "bevel"],
};

const readPng = async (png: Uint8Array<ArrayBuffer>) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const compressed: Uint8Array<ArrayBuffer>[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "IDAT") {
      compressed.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const scanlines = new Uint8Array(
    await new Response(
      new Blob(compressed).stream().pipeThrough(new DecompressionStream("deflate")),
    ).arrayBuffer(),
  );
  return {
    width,
    height,
    signature: [...png.subarray(0, 8)],
    pixelAt: (x: number, y: number) => {
      const start = y * (width * 3 + 1) + 1 + x * 3;
      return [...scanlines.subarray(start, start + 3)].join(" ");
    },
  };
};

describe("renderThemePreview", () => {
  it("PNGとして読める画像を返す", async () => {
    const png = await renderThemePreview([bg], { "--bg": "10 20 30" }, []);
    const image = await readPng(png);
    expect(image.signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(png.subarray(png.length - 4)).toEqual(new Uint8Array([174, 66, 96, 130]));
  });

  it("色変数がスウォッチとして宣言順に並ぶ", async () => {
    const png = await renderThemePreview(
      [bg, text],
      { "--bg": "10 20 30", "--text": "240 230 220" },
      [],
    );
    const image = await readPng(png);
    expect(image.pixelAt(20, 20)).toBe("10 20 30");
    expect(image.pixelAt(20, 64)).toBe("240 230 220");
  });

  it("色以外の変数は行にならない", async () => {
    const withEnum = await readPng(
      await renderThemePreview([bg, cornerShape], { "--bg": "10 20 30" }, []),
    );
    const colorOnly = await readPng(await renderThemePreview([bg], { "--bg": "10 20 30" }, []));
    expect(withEnum.height).toBe(colorOnly.height);
  });

  it("色として読めない値は市松模様で描かれる", async () => {
    const image = await readPng(await renderThemePreview([bg], { "--bg": "round" }, []));
    expect(image.pixelAt(20, 20)).not.toBe(image.pixelAt(26, 20));
  });

  it("contrast制約は背景色の上に前景色を乗せた帯になる", async () => {
    const constraint: ThemeConstraint = {
      type: "contrast",
      foreground: "--text",
      background: "--bg",
      min: 4.5,
    };
    const values = { "--bg": "10 20 30", "--text": "240 230 220" };
    const withBand = await readPng(await renderThemePreview([bg, text], values, [constraint]));
    const withoutBand = await readPng(await renderThemePreview([bg, text], values, []));
    expect(withBand.height).toBeGreaterThan(withoutBand.height);
    expect(withBand.pixelAt(18, withoutBand.height - 16 + 2)).toBe("10 20 30");
  });

  it("変数も制約もなくても画像を返す", async () => {
    const image = await readPng(await renderThemePreview([], {}, []));
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });
});
