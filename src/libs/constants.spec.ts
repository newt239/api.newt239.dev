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
