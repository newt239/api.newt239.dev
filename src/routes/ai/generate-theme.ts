import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { env } from "hono/adapter";

import dayjs from "dayjs";
import OpenAI from "openai";

import type { Bindings } from "~/types/bindings";

import { RESPONSE_FORMAT, SYSTEM_PROMPT } from "~/libs/constants";

const generateThemeSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").openapi({
    example: "夏の海辺をイメージしたテーマ",
    description: "テーマ生成のためのプロンプト",
  }),
});

const themeVariableSchema = z.object({
  name: z.string().openapi({ example: "primary-color" }),
  value: z.string().openapi({ example: "#3498db" }),
});

const themeResponseSchema = z.object({
  body: z.string().openapi({
    example: JSON.stringify({
      type: "success",
      message: "Successfully generated theme.",
      variables: [
        { name: "primary-color", value: "#3498db" },
        { name: "secondary-color", value: "#2ecc71" },
      ],
    }),
  }),
});

const route = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: generateThemeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: themeResponseSchema,
        },
      },
      description: "テーマ生成結果",
    },
  },
  tags: ["AI"],
  summary: "AIでテーマを生成",
  description:
    "指定されたプロンプトからAIがCSSテーマを生成します（1日100回まで）",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(
  route,
  async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM themes WHERE created_at > datetime('now', '-1 day')"
    ).all();
    const count = results[0].count as number;

    // 24時間あたりのリクエストを100回に制限
    if (count > 100) {
      return c.json({
        body: JSON.stringify({
          type: "limited",
          message: "Reached the limit of today's quota. Try again later.",
          variables: [],
        }),
      });
    }

    const { prompt } = c.req.valid("json");
    const { OPENAI_API_KEY, DISCORD_WEBHOOK } = env(c);
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        { role: "user", content: prompt },
      ],
      response_format: RESPONSE_FORMAT,
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
                text: "© 2022-2025 newt",
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
    const parsedContent: { [key: string]: string } = JSON.parse(content);
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
            description: `Prompt: \`\`${prompt}\`\`\n\nResponse:\n\`\`\`json\n${JSON.stringify(parsedContent, null, "\t")}\n\`\`\``,
            timestamp: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            color: 2664261,
            footer: {
              text: "© 2022-2025 newt",
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
        variables: Object.entries(parsedContent).map(([name, value]) => ({
          name,
          value,
        })),
      }),
    });
  }
);

export default app;
