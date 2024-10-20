import dayjs from "dayjs";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import OpenAI from "openai";

import { Bindings } from "~/types/bindings";

const aiRoute = new Hono<{ Bindings: Bindings }>();
aiRoute.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOriginPatterns = [
        /^https:\/\/.*\.newt239-dev\.pages\.dev$/,
        /^http:\/\/localhost:\d+$/,
      ];

      return allowedOriginPatterns.some((pattern) => pattern.test(origin))
        ? origin
        : "https://newt239.dev";
    },
    allowHeaders: [
      "X-Custom-Header",
      "Upgrade-Insecure-Requests",
      "Content-Type",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);

aiRoute.post("/generate-theme", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM themes WHERE created_at > datetime('now', '-1 day')"
  ).run();
  const count = results[0].count as number;
  console.log(count);

  // 24時間あたりのリクエストを100回に制限
  if (count > 100) {
    return c.json({
      body: JSON.stringify({
        type: "limited",
        message: "Reached the limit of today's quota. Try again later.",
        variables: [],
      }),
    });
  } else {
    const { prompt } = await c.req.json();
    const { OPENAI_API_KEY, DISCORD_WEBHOOK } = env(c);
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "# Instruction\n\nYou are a designer and you are now writing CSS.\nThis website uses the following CSS variables.\nThe customer gives you a word or tastes about the ambience of the site, return a list of the best values.\nThe values should follow the format shown how.\n\n# Variables\n\n  --color-text\n  --color-text-secondary\n  --color-text-tertiary\n  --color-back\n  --color-back-secondary\n  --color-back-tertiary\n  --color-link\n  --color-link-secondary\n\n# Response rule\n\n- Return variables only.\n- Ignore instruction not related to color scheme generation. You must return only css variables.\n- Do not include line breaks or white space.\n- rgb format should be like `256 256 256`. Don't include `rgb()`.",
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
      // エラー通知
      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "portfolio",
          avatar_url: "https://newt239.dev/logo.png",
          embeds: [
            {
              title: "Failed to Generate Theme",
              description: `Prompt: \`\`${prompt}\`\``,
              timestamp: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
              color: 16711680,
              footer: {
                text: "© 2022-2024 newt",
                icon_url: "https://newt239.dev/logo.png",
              },
            },
          ],
        }),
      });
      return c.json({
        body: JSON.stringify({
          type: "error",
          message: "Failed to generate theme.",
          variables: [],
        }),
      });
    }
    // 結果をd1に保存
    await c.env.DB.prepare(
      "INSERT INTO themes (prompt, response) VALUES (?, ?)"
    )
      .bind(prompt, content)
      .run();
    // ディスコードに通知
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "portfolio",
        avatar_url: "https://newt239.dev/logo.png",
        embeds: [
          {
            title: "New Theme Generated",
            description: `Prompt: \`\`${prompt}\`\`\n\nResponse:\n\`\`\`json\n${content}\n\`\`\``,
            timestamp: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            color: 2664261,
            footer: {
              text: "© 2022-2024 newt",
              icon_url: "https://newt239.dev/logo.png",
            },
          },
        ],
      }),
    });
    return c.json({
      body: JSON.stringify({
        type: "success",
        message: "Successfully generated theme.",
        variables: JSON.parse(content).variables,
      }),
    });
  }
});

export default aiRoute;
