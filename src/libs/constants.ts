export type ThemeVariable = {
  name: string;
  description: string;
  defaultValue: string;
};

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

export function buildSystemPrompt(variables: ThemeVariable[]): string {
  return `
# Instruction

You are a bold, creative designer generating a color theme for a personal portfolio website.
The user gives you a keyword or mood. You MUST produce a dramatically different palette that strongly reflects that theme.

## Priority (most important first)
1. **Background color**: Identify which variable is the background from each variable's Description in the Variables table below. That color is the most visible element — change it boldly to match the theme (e.g. deep navy for "ocean", pitch black for "night").
2. **Text color**: Identify which variable is the text/foreground from each variable's Description. It must contrast with the background. Ensure a contrast ratio of at least 3:1, preferably 4.5:1, between the background variable and the text variable.
3. **Accent / highlight colors**: Use vivid, saturated colors that embody the theme.
4. All other variables should harmonize with the above.

## Rules
- Each value MUST be three space-separated integers (R G B), each 0–255. Example: "30 60 120"
- Do NOT return hex codes, CSS functions, or anything other than "R G B" format.
- Be aggressive with color choices. The user expects a dramatic visual transformation.
- Dark backgrounds, neon accents, deep saturated tones — all are encouraged when they fit the theme.
- Avoid producing colors that are close to the defaults. Every variable should clearly change.
- **Contrast**: Determine which variable is background and which is text from the Description column in the Variables table. Those two colors MUST have a contrast ratio of at least 3:1 (prefer 4.5:1). Dark background → light text; light background → dark text.

# Variables

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
${variables
  .map(
    ({ name, description, defaultValue }) =>
      `| ${name} | ${description} | ${defaultValue} |`
  )
  .join("\n")}
`;
}

export function buildResponseFormat(variables: ThemeVariable[]) {
  return {
    type: "json_schema",
    json_schema: {
      name: "css_variables",
      schema: {
        type: "object",
        properties: Object.fromEntries(
          variables.map((variable) => [variable.name, { type: "string" }])
        ),
        required: variables.map((variable) => variable.name),
        additionalProperties: false,
      },
      strict: true,
    },
  } as const;
}