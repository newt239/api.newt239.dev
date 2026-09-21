import { converter, interpolate, modeOklch, modeRgb, toGamut, useMode } from "culori/fn";

import type { Oklch } from "culori/fn";

export type ThemeVariable = {
  name: string;
  description: string;
  defaultValue: string;
  kind?: "color" | "number" | "enum";
  allowedValues?: string[];
  min?: number;
  max?: number;
};

export type ThemeConstraint =
  | { type: "contrast"; foreground: string; background: string; min: number }
  | { type: "similar"; a: string; b: string; max: number };

export type ColorFormat = "rgb" | "oklch";

useMode(modeRgb);
useMode(modeOklch);

const toOklch = converter("oklch");
// CSS Color 4 のガマットマッピング。ブラウザが描く色と判定を一致させるために通す
const toDisplayable = toGamut("rgb", "oklch");

const RGB_PATTERN = /^\d{1,3} \d{1,3} \d{1,3}$/;
const OKLCH_PATTERN = /^\d+(?:\.\d+)? \d+(?:\.\d+)? \d+(?:\.\d+)?$/;

const WHITE: Oklch = { mode: "oklch", l: 1, c: 0, h: 0 };
const BLACK: Oklch = { mode: "oklch", l: 0, c: 0, h: 0 };

export const defaultRequiredVariables: ThemeVariable[] = [
  {
    name: "--color-text",
    description: "Main text color",
    defaultValue: "0.4091 0 0",
  },
  {
    name: "--color-text-secondary",
    description: "Secondary text color",
    defaultValue: "0.6268 0 0",
  },
  {
    name: "--color-text-tertiary",
    description: "Tertiary text color",
    defaultValue: "0.8452 0 0",
  },
  {
    name: "--color-back",
    description: "Main background color",
    defaultValue: "0.9662 0.0121 96.42",
  },
  {
    name: "--color-back-secondary",
    description: "Secondary background color",
    defaultValue: "0.8045 0.0694 230.8",
  },
  {
    name: "--color-back-tertiary",
    description: "Tertiary background color",
    defaultValue: "0.3873 0.0245 229.79",
  },
  {
    name: "--color-link",
    description: "Main link color",
    defaultValue: "0.5826 0.0867 239.13",
  },
  {
    name: "--color-link-secondary",
    description: "Secondary link color",
    defaultValue: "0.6756 0.0722 248.94",
  },
];

export const detectColorFormat = (variables: ThemeVariable[]): ColorFormat =>
  variables.some(
    (variable) =>
      (variable.kind ?? "color") === "color" && !RGB_PATTERN.test(variable.defaultValue),
  )
    ? "oklch"
    : "rgb";

export const parseColor = (value: string, format: ColorFormat): Oklch | null => {
  if (format === "rgb") {
    if (!RGB_PATTERN.test(value)) {
      return null;
    }
    const [red, green, blue] = value.split(" ").map(Number);
    if (red > 255 || green > 255 || blue > 255) {
      return null;
    }
    return toOklch({ mode: "rgb", r: red / 255, g: green / 255, b: blue / 255 });
  }
  if (!OKLCH_PATTERN.test(value)) {
    return null;
  }
  const [lightness, chroma, hue] = value.split(" ").map(Number);
  if (lightness > 1 || chroma > 0.5 || hue > 360) {
    return null;
  }
  return toOklch(toDisplayable({ mode: "oklch", l: lightness, c: chroma, h: hue }));
};

export const toRgb255 = (color: Oklch): [number, number, number] => {
  const { r, g, b } = toDisplayable(color);
  return [r, g, b].map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255)) as [
    number,
    number,
    number,
  ];
};

const round = (value: number, digits: number) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const formatColor = (color: Oklch, format: ColorFormat): string =>
  format === "rgb"
    ? toRgb255(color).join(" ")
    : [round(color.l, 4), round(color.c, 4), round(color.h ?? 0, 2)].join(" ");

const contrastRatio = (a: Oklch, b: Oklch): number => {
  const luminance = (color: Oklch) => {
    const [red, green, blue] = toRgb255(color).map((channel) => {
      const ratio = channel / 255;
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const colorFormatRule = (format: ColorFormat) =>
  format === "rgb"
    ? `three space-separated integers (R G B), each 0–255. Example: "30 60 120". Do NOT return hex codes or CSS functions.`
    : `three space-separated numbers (L C H) in the OKLCH color space: L is lightness from 0 to 1, C is chroma from 0 to 0.4, H is hue in degrees from 0 to 360. Example: "0.55 0.17 255". Do NOT return hex codes or CSS functions.`;

export const buildSystemPrompt = (
  variables: ThemeVariable[],
  constraints: ThemeConstraint[] = [],
  format: ColorFormat = detectColorFormat(variables),
): string => `
# Instruction

You are a bold, creative designer generating a visual theme for a personal portfolio website.
The user gives you a keyword or mood. You MUST produce a dramatically different theme that strongly reflects it.
The theme covers not only colors but also shape, typography and motion.

## Priority (most important first)
1. **Background color**: Identify which variable is the background from each variable's Description in the Variables table below. That color is the most visible element — change it boldly to match the theme (e.g. deep navy for "ocean", pitch black for "night").
2. **Text color**: Identify which variable is the text/foreground from each variable's Description. It must contrast with the background. Ensure a contrast ratio of at least 3:1, preferably 4.5:1, between the background variable and the text variable.
3. **Accent / highlight colors**: Use vivid, saturated colors that embody the theme.
4. **Shape, typography and motion**: Pick the corner rounding, border width, corner shape, font and transition that match the mood.
5. All other variables should harmonize with the above.

## Value format
Each variable has a Type in the Variables table. Follow the rule for that type.

- **color**: ${colorFormatRule(format)}
- **number**: a bare decimal number within the range shown in the Type column. No units. Example: "0.5"
- **enum**: exactly one of the values listed in the Allowed column, copied verbatim. Do NOT invent new values.

## Rules
- Be aggressive with your choices. The user expects a dramatic visual transformation.
- Dark backgrounds, neon accents, deep saturated tones — all are encouraged when they fit the theme.
- Avoid producing values that are close to the defaults. Every variable should clearly change.
- **Contrast**: Determine which variable is background and which is text from the Description column in the Variables table. Those two colors MUST have a contrast ratio of at least 3:1 (prefer 4.5:1). Dark background → light text; light background → dark text. Even when the theme itself is monochrome (ink, charcoal, snow), the text and the background must never be the same shade — pick opposite ends of that monochrome range.${
  format === "oklch"
    ? `
- **Harmony**: keeping H the same across a group of variables and moving only L holds the palette together. Surfaces that belong to the same family should share a hue and differ mainly in lightness.`
    : ""
}
- **Coherence**: shape, typography and motion must agree with the mood. Sharp / futuristic / brutal themes want little or no corner rounding, angular corner shapes, thick borders and fast linear motion. Soft / cute / dreamy themes want generous rounding, rounded corners, thin borders and slow bouncy motion.

# Variables

| Name | Description | Type | Allowed | Default Value |
| ---- | ----------- | ---- | ------- | ------------- |
${variables
  .map((variable) => {
    const kind = variable.kind ?? "color";
    const type = kind === "number" ? `number (${variable.min ?? 0}–${variable.max ?? 1})` : kind;
    const allowed =
      kind === "enum"
        ? (variable.allowedValues ?? []).map((value) => `\`${value}\``).join(" / ")
        : "-";
    return `| ${variable.name} | ${variable.description} | ${type} | ${allowed} | ${variable.defaultValue} |`;
  })
  .join("\n")}
${
  constraints.length === 0
    ? ""
    : `
# Readability rules

These pairs are how the colors actually meet on screen. Every rule below is checked programmatically after you answer, and you will be asked to redo the theme if any of them fails — so satisfy them on the first try.

${constraints
  .map((constraint) =>
    constraint.type === "contrast"
      ? `- \`${constraint.foreground}\` placed on \`${constraint.background}\` must have a contrast ratio of at least ${constraint.min}:1`
      : `- \`${constraint.a}\` must stay within ${constraint.max}:1 of \`${constraint.b}\` — they are variations of the same surface, never opposites`,
  )
  .join("\n")}

Note that a card surface being close to the page background is just as important as text being readable. If you darken the page, darken the cards with it.
`
}`;

export const buildResponseFormat = (variables: ThemeVariable[]) =>
  ({
    type: "json_schema",
    json_schema: {
      name: "css_variables",
      schema: {
        type: "object",
        properties: Object.fromEntries(
          variables.map((variable) => [
            variable.name,
            variable.kind === "enum" && variable.allowedValues?.length
              ? { type: "string", enum: variable.allowedValues }
              : { type: "string" },
          ]),
        ),
        required: variables.map((variable) => variable.name),
        additionalProperties: false,
      },
      strict: true,
    },
  }) as const;

export const validateThemeValues = (
  variables: ThemeVariable[],
  generated: Record<string, unknown>,
  format: ColorFormat = detectColorFormat(variables),
): Record<string, string> => {
  const resolved: Record<string, string> = {};

  for (const variable of variables) {
    resolved[variable.name] = variable.defaultValue;
    const value = generated[variable.name];
    if (typeof value !== "string") {
      continue;
    }
    switch (variable.kind ?? "color") {
      case "color": {
        // ガマット外の指定はマッピング後の値へ置き換えて返す
        const parsed = parseColor(value, format);
        if (parsed) {
          resolved[variable.name] = formatColor(parsed, format);
        }
        break;
      }
      case "number": {
        const parsed = Number(value);
        if (
          Number.isFinite(parsed) &&
          parsed >= (variable.min ?? Number.NEGATIVE_INFINITY) &&
          parsed <= (variable.max ?? Number.POSITIVE_INFINITY)
        ) {
          resolved[variable.name] = value;
        }
        break;
      }
      case "enum":
        if ((variable.allowedValues ?? []).includes(value)) {
          resolved[variable.name] = value;
        }
        break;
    }
  }

  return resolved;
};

export const checkConstraints = (
  constraints: ThemeConstraint[],
  values: Record<string, string>,
  format: ColorFormat = "rgb",
): string[] =>
  constraints.flatMap((constraint) => {
    if (constraint.type === "contrast") {
      const foreground = parseColor(values[constraint.foreground] ?? "", format);
      const background = parseColor(values[constraint.background] ?? "", format);
      if (!foreground || !background) {
        return [];
      }
      const ratio = contrastRatio(foreground, background);
      return ratio >= constraint.min
        ? []
        : [
            `${constraint.foreground} (${values[constraint.foreground]}) on ${constraint.background} (${values[constraint.background]}) is only ${ratio.toFixed(2)}:1, it must be at least ${constraint.min}:1`,
          ];
    }
    const a = parseColor(values[constraint.a] ?? "", format);
    const b = parseColor(values[constraint.b] ?? "", format);
    if (!a || !b) {
      return [];
    }
    const ratio = contrastRatio(a, b);
    return ratio <= constraint.max
      ? []
      : [
          `${constraint.a} (${values[constraint.a]}) and ${constraint.b} (${values[constraint.b]}) are ${ratio.toFixed(2)}:1 apart, they must stay within ${constraint.max}:1`,
        ];
  });

export const repairConstraints = (
  constraints: ThemeConstraint[],
  values: Record<string, string>,
  format: ColorFormat = "rgb",
): Record<string, string> => {
  const repaired = { ...values };
  // 丸めたあとの値で判定する。二分探索が境界ちょうどへ収束するため、丸め前で判定すると出力が基準を割る
  const emit = (color: Oklch) => formatColor(toOklch(toDisplayable(color)), format);
  const approach = (source: Oklch, target: Oklch, satisfied: (candidate: Oklch) => boolean) => {
    const mix = interpolate([source, target], "oklch");
    let low = 0;
    let high = 1;
    let result = emit(target);
    for (let step = 0; step < 16; step++) {
      const middle = (low + high) / 2;
      const candidate = emit(mix(middle));
      const parsed = parseColor(candidate, format);
      if (parsed && satisfied(parsed)) {
        high = middle;
        result = candidate;
      } else {
        low = middle;
      }
    }
    return result;
  };

  for (const constraint of constraints) {
    if (constraint.type !== "similar") {
      continue;
    }
    const a = parseColor(repaired[constraint.a] ?? "", format);
    const b = parseColor(repaired[constraint.b] ?? "", format);
    if (!a || !b || contrastRatio(a, b) <= constraint.max) {
      continue;
    }
    repaired[constraint.a] = approach(
      a,
      b,
      (candidate) => contrastRatio(candidate, b) <= constraint.max,
    );
  }

  for (const constraint of constraints) {
    if (constraint.type !== "contrast") {
      continue;
    }
    const foreground = parseColor(repaired[constraint.foreground] ?? "", format);
    const background = parseColor(repaired[constraint.background] ?? "", format);
    if (!foreground || !background || contrastRatio(foreground, background) >= constraint.min) {
      continue;
    }
    const toward = contrastRatio(WHITE, background) >= contrastRatio(BLACK, background) ? 1 : 0;
    const target: Oklch = { mode: "oklch", l: toward, c: foreground.c, h: foreground.h };
    repaired[constraint.foreground] = approach(
      foreground,
      target,
      (candidate) => contrastRatio(candidate, background) >= constraint.min,
    );
  }

  return repaired;
};
