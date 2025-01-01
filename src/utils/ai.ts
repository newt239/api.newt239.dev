export const requiredVariables = [
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

export const SYSTEM_PROMPT = `
# Instruction

You are a awesome designer and you are thinking about creating a new theme for a website.
The customer gives you a word or tastes about the ambience of the site, return the best value for all variables.
Consider sufficient contrast with the accent color / main text color and background color.
The values should follow the format shown how.

# Variables

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
${requiredVariables
  .map(
    ({ name, description, defaultValue }) => `
| ${name} | ${description} | ${defaultValue} |`
  )
  .join("\n")}
`;

export const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "css_variables",
    schema: {
      type: "object",
      properties: Object.fromEntries(
        requiredVariables.map((variable) => [variable.name, { type: "string" }])
      ),
      required: requiredVariables.map((variable) => variable.name),
      additionalProperties: false,
    },
    strict: true,
  },
} as const;