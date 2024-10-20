import { Hono } from "hono";
import { env } from 'hono/adapter'
import { cors } from "hono/cors";
import  OpenAI from "openai";

import { Bindings } from "~/types/bindings";

const aiRoute = new Hono<{ Bindings: Bindings }>();
aiRoute.use("*", cors({
    origin: ['https://newt239.dev', 'http://localhost:3000'],
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }))

aiRoute.post("/generate-theme", async (c) => {
  const {results} = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM themes WHERE created_at > datetime('now', '-1 day')").run();
  if (results[0].count as number > 100) {
    return c.json({body: JSON.stringify({
      type: "limited",
      message: "You have reached the limit of 100 requests per day.",
      variables: []
    })});
  } else {
    const { prompt } = await c.req.json();
    const { OPENAI_API_KEY } = env(c);
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
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
      return c.json({body: JSON.stringify({
        type: "error",
        message: "Failed to generate theme.",
        variables: []
      })});
    }
    await c.env.DB.prepare("INSERT INTO themes (prompt, response) VALUES (?, ?)").bind(prompt, content).run();
    return c.json({body: JSON.stringify({
      type: "success",
      message: "Successfully generated theme.",
      variables: JSON.parse(content).variables
    })});
  }
});

export default aiRoute;
