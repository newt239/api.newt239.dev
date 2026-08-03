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

type Rgb = [number, number, number];

const RGB_PATTERN = /^\d{1,3} \d{1,3} \d{1,3}$/;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export const defaultRequiredVariables: ThemeVariable[] = [
  {
    name: "--color-text",
    description: "Main text color",
    defaultValue: "74 74 74",
  },
  {
    name: "--color-text-secondary",
    description: "Secondary text color",
    defaultValue: "136 136 136",
  },
  {
    name: "--color-text-tertiary",
    description: "Tertiary text color",
    defaultValue: "204 204 204",
  },
  {
    name: "--color-back",
    description: "Main background color",
    defaultValue: "246 244 235",
  },
  {
    name: "--color-back-secondary",
    description: "Secondary background color",
    defaultValue: "145 200 228",
  },
  {
    name: "--color-back-tertiary",
    description: "Tertiary background color",
    defaultValue: "55 71 79",
  },
  {
    name: "--color-link",
    description: "Main link color",
    defaultValue: "70 130 169",
  },
  {
    name: "--color-link-secondary",
    description: "Secondary link color",
    defaultValue: "116 155 194",
  },
];

export const parseRgb = (value: string): Rgb | null => {
  if (!RGB_PATTERN.test(value)) {
    return null;
  }
  const [red, green, blue] = value.split(" ").map(Number);
  return red > 255 || green > 255 || blue > 255 ? null : [red, green, blue];
};

const contrastRatio = (a: Rgb, b: Rgb): number => {
  const luminance = (rgb: Rgb) => {
    const [red, green, blue] = rgb.map((channel) => {
      const ratio = channel / 255;
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

export const buildSystemPrompt = (
  variables: ThemeVariable[],
  constraints: ThemeConstraint[] = [],
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

- **color**: three space-separated integers (R G B), each 0–255. Example: "30 60 120". Do NOT return hex codes or CSS functions.
- **number**: a bare decimal number within the range shown in the Type column. No units. Example: "0.5"
- **enum**: exactly one of the values listed in the Allowed column, copied verbatim. Do NOT invent new values.

## Rules
- Be aggressive with your choices. The user expects a dramatic visual transformation.
- Dark backgrounds, neon accents, deep saturated tones — all are encouraged when they fit the theme.
- Avoid producing values that are close to the defaults. Every variable should clearly change.
- **Contrast**: Determine which variable is background and which is text from the Description column in the Variables table. Those two colors MUST have a contrast ratio of at least 3:1 (prefer 4.5:1). Dark background → light text; light background → dark text. Even when the theme itself is monochrome (ink, charcoal, snow), the text and the background must never be the same shade — pick opposite ends of that monochrome range.
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
): Record<string, string> => {
  const resolved: Record<string, string> = {};

  for (const variable of variables) {
    resolved[variable.name] = variable.defaultValue;
    const value = generated[variable.name];
    if (typeof value !== "string") {
      continue;
    }
    switch (variable.kind ?? "color") {
      case "color":
        if (parseRgb(value)) {
          resolved[variable.name] = value;
        }
        break;
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
): string[] =>
  constraints.flatMap((constraint) => {
    if (constraint.type === "contrast") {
      const foreground = parseRgb(values[constraint.foreground] ?? "");
      const background = parseRgb(values[constraint.background] ?? "");
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
    const a = parseRgb(values[constraint.a] ?? "");
    const b = parseRgb(values[constraint.b] ?? "");
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
): Record<string, string> => {
  const repaired = { ...values };
  const approach = (source: Rgb, target: Rgb, satisfied: (candidate: Rgb) => boolean): Rgb => {
    let low = 0;
    let high = 1;
    let result = target;
    for (let step = 0; step < 16; step++) {
      const middle = (low + high) / 2;
      const candidate: Rgb = [
        Math.round(source[0] + (target[0] - source[0]) * middle),
        Math.round(source[1] + (target[1] - source[1]) * middle),
        Math.round(source[2] + (target[2] - source[2]) * middle),
      ];
      if (satisfied(candidate)) {
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
    const a = parseRgb(repaired[constraint.a] ?? "");
    const b = parseRgb(repaired[constraint.b] ?? "");
    if (!a || !b || contrastRatio(a, b) <= constraint.max) {
      continue;
    }
    repaired[constraint.a] = approach(
      a,
      b,
      (candidate) => contrastRatio(candidate, b) <= constraint.max,
    ).join(" ");
  }

  for (const constraint of constraints) {
    if (constraint.type !== "contrast") {
      continue;
    }
    const foreground = parseRgb(repaired[constraint.foreground] ?? "");
    const background = parseRgb(repaired[constraint.background] ?? "");
    if (!foreground || !background || contrastRatio(foreground, background) >= constraint.min) {
      continue;
    }
    const target =
      contrastRatio(WHITE, background) >= contrastRatio(BLACK, background) ? WHITE : BLACK;
    repaired[constraint.foreground] = approach(
      foreground,
      target,
      (candidate) => contrastRatio(candidate, background) >= constraint.min,
    ).join(" ");
  }

  return repaired;
};
