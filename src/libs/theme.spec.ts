import { describe, expect, it } from "vitest";

import {
  buildResponseFormat,
  buildSystemPrompt,
  checkConstraints,
  repairConstraints,
  validateThemeValues,
} from "./theme";

import type { ThemeConstraint, ThemeVariable } from "./theme";

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
    expect(
      validateThemeValues(variables, {
        "--bg": "10 20 30",
        "--radius-scale": "0.5",
        "--corner-shape": "bevel",
      }),
    ).toEqual({ "--bg": "10 20 30", "--radius-scale": "0.5", "--corner-shape": "bevel" });
  });

  it("RGBの形式でない色はデフォルト値に落とされる", () => {
    expect(validateThemeValues([colorVariable], { "--bg": "#ff0000" })).toEqual({
      "--bg": "255 248 240",
    });
  });

  it("255を超えるRGBはデフォルト値に落とされる", () => {
    expect(validateThemeValues([colorVariable], { "--bg": "300 20 30" })).toEqual({
      "--bg": "255 248 240",
    });
  });

  it("範囲外の数値はデフォルト値に落とされる", () => {
    expect(validateThemeValues([numberVariable], { "--radius-scale": "5" })).toEqual({
      "--radius-scale": "1",
    });
  });

  it("数値でない値はデフォルト値に落とされる", () => {
    expect(validateThemeValues([numberVariable], { "--radius-scale": "1rem" })).toEqual({
      "--radius-scale": "1",
    });
  });

  it("候補にない値はデフォルト値に落とされる", () => {
    expect(validateThemeValues([enumVariable], { "--corner-shape": "squircle" })).toEqual({
      "--corner-shape": "round",
    });
  });

  it("値が欠けている場合もデフォルト値で補われる", () => {
    expect(validateThemeValues(variables, {})).toEqual({
      "--bg": "255 248 240",
      "--radius-scale": "1",
      "--corner-shape": "round",
    });
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

const textOnSurface: ThemeConstraint = {
  type: "contrast",
  foreground: "--text",
  background: "--surface",
  min: 4.5,
};
const surfaceNearBg: ThemeConstraint = {
  type: "similar",
  a: "--surface",
  b: "--bg",
  max: 1.5,
};

describe("checkConstraints", () => {
  it("スクリーンショットで起きた組み合わせを違反として検出する", () => {
    const violations = checkConstraints([textOnSurface, surfaceNearBg], {
      "--bg": "26 16 8",
      "--surface": "250 244 226",
      "--text": "250 244 226",
    });
    expect(violations).toHaveLength(2);
    expect(violations[0]).toContain("--text");
    expect(violations[0]).toContain("--surface");
    expect(violations[1]).toContain("apart");
  });

  it("違反がなければ空になる", () => {
    expect(
      checkConstraints([textOnSurface, surfaceNearBg], {
        "--bg": "26 16 8",
        "--surface": "38 26 16",
        "--text": "250 244 226",
      }),
    ).toEqual([]);
  });

  it("違反メッセージには実測値と要求値が含まれる", () => {
    const [violation] = checkConstraints([textOnSurface], {
      "--surface": "255 255 255",
      "--text": "250 250 250",
    });
    expect(violation).toContain("255 255 255");
    expect(violation).toContain("4.5:1");
  });

  it("色として解釈できない値は違反にしない", () => {
    expect(checkConstraints([textOnSurface], { "--text": "round", "--surface": "0 0 0" })).toEqual(
      [],
    );
  });
});

describe("repairConstraints", () => {
  it("カード背景を先に背景へ寄せてから文字色を引き離す", () => {
    const repaired = repairConstraints([textOnSurface, surfaceNearBg], {
      "--bg": "26 16 8",
      "--surface": "250 244 226",
      "--text": "250 244 226",
    });
    expect(ratioOf(repaired["--surface"], "26 16 8")).toBeLessThanOrEqual(1.5);
    expect(ratioOf(repaired["--text"], repaired["--surface"])).toBeGreaterThanOrEqual(4.5);
    expect(checkConstraints([textOnSurface, surfaceNearBg], repaired)).toEqual([]);
  });

  it("すでに満たしている値は変更されない", () => {
    const values = { "--bg": "26 16 8", "--surface": "38 26 16", "--text": "250 244 226" };
    expect(repairConstraints([textOnSurface, surfaceNearBg], values)).toEqual(values);
  });

  it("補正後も色味の方向は保たれる", () => {
    const repaired = repairConstraints(
      [{ type: "contrast", foreground: "--text", background: "--bg", min: 4.5 }],
      { "--bg": "10 10 10", "--text": "0 0 60" },
    );
    const [red, green, blue] = repaired["--text"].split(" ").map(Number);
    expect(blue).toBeGreaterThan(red);
    expect(blue).toBeGreaterThan(green);
  });
});
