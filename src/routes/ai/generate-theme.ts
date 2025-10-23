import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

import dayjs from "dayjs";
import OpenAI from "openai";

import type { Bindings } from "~/types/bindings";

import { RESPONSE_FORMAT, SYSTEM_PROMPT } from "~/libs/constants";

const generateThemeSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

const app = new Hono<{ Bindings: Bindings }>().post(
  "/",
  zValidator("json", generateThemeSchema),
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
