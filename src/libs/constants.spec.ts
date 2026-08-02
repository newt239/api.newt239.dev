import { describe, expect, it } from "vitest";

import { buildResponseFormat, buildSystemPrompt, validateThemeValues } from "./constants";

import type { ThemeVariable } from "./constants";

const colorVariable: ThemeVariable = {
  name: "--bg",
  description: "Page background color",
  defaultValue: "255 248 240",
};

const numberVariable: ThemeVariable = {
  name: "--radius-scale",
  description: "Corner rounding multiplier",
  defaultValue: "1",
  kind: "number",
  min: 0,
  max: 2,
};

const enumVariable: ThemeVariable = {
  name: "--corner-shape",
  description: "Corner shape",
  defaultValue: "round",
  kind: "enum",
  allowedValues: ["round", "bevel", "notch"],
};

const variables = [colorVariable, numberVariable, enumVariable];

describe("buildSystemPrompt", () => {
  it("種類ごとの値のフォーマットが指示される", () => {
    const prompt = buildSystemPrompt(variables);
    expect(prompt).toContain("**color**");
    expect(prompt).toContain("**number**");
    expect(prompt).toContain("**enum**");
  });

  it("変数の表に種類と候補が含まれる", () => {
    const prompt = buildSystemPrompt(variables);
    expect(prompt).toContain(
      "| --radius-scale | Corner rounding multiplier | number (0–2) | - | 1 |",
    );
    expect(prompt).toContain("`round` / `bevel` / `notch`");
  });

  it("kindを省略した変数はcolorとして扱われる", () => {
    const prompt = buildSystemPrompt([colorVariable]);
    expect(prompt).toContain("| --bg | Page background color | color | - | 255 248 240 |");
  });
});

describe("buildResponseFormat", () => {
  it("enumの変数には候補がスキーマとして与えられる", () => {
    const { json_schema } = buildResponseFormat(variables);
    expect(json_schema.schema.properties["--corner-shape"]).toEqual({
      type: "string",
      enum: ["round", "bevel", "notch"],
    });
  });

  it("enum以外の変数は文字列として扱われる", () => {
    const { json_schema } = buildResponseFormat(variables);
    expect(json_schema.schema.properties["--bg"]).toEqual({ type: "string" });
    expect(json_schema.schema.properties["--radius-scale"]).toEqual({ type: "string" });
  });

  it("すべての変数が必須になる", () => {
    const { json_schema } = buildResponseFormat(variables);
    expect(json_schema.schema.required).toEqual(["--bg", "--radius-scale", "--corner-shape"]);
  });
});

describe("validateThemeValues", () => {
  it("妥当な値はそのまま返される", () => {
    const result = validateThemeValues(variables, {
      "--bg": "10 20 30",
      "--radius-scale": "0.5",
      "--corner-shape": "bevel",
    });
    expect(result).toEqual([
      { name: "--bg", value: "10 20 30" },
      { name: "--radius-scale", value: "0.5" },
      { name: "--corner-shape", value: "bevel" },
    ]);
  });

  it("RGBの形式でない色はデフォルト値に落とされる", () => {
    const result = validateThemeValues([colorVariable], { "--bg": "#ff0000" });
    expect(result).toEqual([{ name: "--bg", value: "255 248 240" }]);
  });

  it("255を超えるRGBはデフォルト値に落とされる", () => {
    const result = validateThemeValues([colorVariable], { "--bg": "300 20 30" });
    expect(result).toEqual([{ name: "--bg", value: "255 248 240" }]);
  });

  it("範囲外の数値はデフォルト値に落とされる", () => {
    const result = validateThemeValues([numberVariable], { "--radius-scale": "5" });
    expect(result).toEqual([{ name: "--radius-scale", value: "1" }]);
  });

  it("数値でない値はデフォルト値に落とされる", () => {
    const result = validateThemeValues([numberVariable], { "--radius-scale": "1rem" });
    expect(result).toEqual([{ name: "--radius-scale", value: "1" }]);
  });

  it("候補にない値はデフォルト値に落とされる", () => {
    const result = validateThemeValues([enumVariable], { "--corner-shape": "squircle" });
    expect(result).toEqual([{ name: "--corner-shape", value: "round" }]);
  });

  it("値が欠けている場合もデフォルト値で補われる", () => {
    const result = validateThemeValues(variables, {});
    expect(result).toEqual([
      { name: "--bg", value: "255 248 240" },
      { name: "--radius-scale", value: "1" },
      { name: "--corner-shape", value: "round" },
    ]);
  });
});

const luminance = (value: string) => {
  const [r, g, b] = value.split(" ").map((channel) => {
    const ratio = Number(channel) / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratioOf = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const backgroundVariable: ThemeVariable = {
  name: "--bg",
  description: "Page background color",
  defaultValue: "255 248 240",
};

const textVariable: ThemeVariable = {
  name: "--text",
  description: "Main text color",
  defaultValue: "48 42 37",
  contrastAgainst: "--bg",
  minContrast: 4.5,
};

const contrastVariables = [backgroundVariable, textVariable];

describe("validateThemeValues のコントラスト補正", () => {
  it("背景と文字色が同じでも読める明度まで引き離される", () => {
    const result = validateThemeValues(contrastVariables, { "--bg": "0 0 0", "--text": "0 0 0" });
    const text = result.find((v) => v.name === "--text")!.value;
    expect(result.find((v) => v.name === "--bg")!.value).toBe("0 0 0");
    expect(ratioOf(text, "0 0 0")).toBeGreaterThanOrEqual(4.5);
  });

  it("明るい背景では文字色が暗い方向へ補正される", () => {
    const result = validateThemeValues(contrastVariables, {
      "--bg": "255 255 255",
      "--text": "250 250 250",
    });
    const text = result.find((v) => v.name === "--text")!.value;
    expect(ratioOf(text, "255 255 255")).toBeGreaterThanOrEqual(4.5);
    expect(luminance(text)).toBeLessThan(luminance("250 250 250"));
  });

  it("すでに条件を満たしている色は変更されない", () => {
    const result = validateThemeValues(contrastVariables, {
      "--bg": "255 255 255",
      "--text": "20 20 20",
    });
    expect(result.find((v) => v.name === "--text")!.value).toBe("20 20 20");
  });

  it("補正後も色味の方向は保たれる", () => {
    const result = validateThemeValues(contrastVariables, {
      "--bg": "10 10 10",
      "--text": "0 0 60",
    });
    const [r, g, b] = result
      .find((v) => v.name === "--text")!
      .value.split(" ")
      .map(Number);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("contrastAgainstを持たない変数は補正されない", () => {
    const result = validateThemeValues([backgroundVariable], { "--bg": "0 0 0" });
    expect(result).toEqual([{ name: "--bg", value: "0 0 0" }]);
  });
});
