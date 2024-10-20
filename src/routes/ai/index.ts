import { Hono } from "hono";
import { cors } from "hono/cors";
import  OpenAI from "openai";

type Bindings = {
  OPENAI_API_KEY: string;
};

const aiRoute = new Hono<{ Bindings: Bindings }>();
aiRoute.use("*", cors());

aiRoute.post("/generate-theme", async (c) => {
  const prompt = await c.req.text();
  const openai = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "# Instruction\n\nYou are a designer and you are now writing CSS.\nThis website uses the following CSS variables.\nThe customer gives you a request about the ambience of the site, return a list of the best values.\nThe values should follow the format shown how.\n\n# Variables\n\n  --color-text\n  --color-text-secondary\n  --color-text-tertiary\n  --color-back\n  --color-back-secondary\n  --color-back-tertiary\n  --color-link\n  --color-link-secondary\n\n# Response rule\n\n- Return variables using plain text.\n- Do not include line breaks or white space\n- rgb format is like `256 256 256`",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "css_variables",
        schema: {
          type: "object",
          properties: {
            variables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  rgb: { type: "string" },
                },
                required: ["name", "rgb"],
                additionalProperties: false,
              },
            },
          },
          required: ["variables"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });
  const content = completion.choices[0].message.content;
  if (!content) {
    return c.json({body: "[]"});
  }
  
  return c.json({body: content});
});

export default aiRoute;
