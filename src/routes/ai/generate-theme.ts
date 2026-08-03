import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import dayjs from "dayjs";
import { env } from "hono/adapter";
import OpenAI, { type APIError } from "openai";

import {
  buildResponseFormat,
  buildSystemPrompt,
  checkConstraints,
  defaultRequiredVariables,
  repairConstraints,
  validateThemeValues,
} from "~/libs/theme";
import { renderThemePreview } from "~/libs/theme-preview";

import type { Bindings } from "~/types/bindings";

const MAX_ATTEMPTS = 3;

const themeVariableSchema = z.object({
  name: z.string().openapi({
    example: "--color-text",
    description: "CSS変数名",
  }),
  description: z.string().openapi({
    example: "Main text color",
    description: "変数の説明",
  }),
  defaultValue: z.string().openapi({
    example: "74 74 74",
    description: "デフォルト値。生成された値が不正だった場合はこの値が使われる",
  }),
  kind: z.enum(["color", "number", "enum"]).optional().openapi({
    example: "enum",
    description: "値の種類。省略した場合は color として扱われる",
  }),
  allowedValues: z
    .array(z.string())
    .optional()
    .openapi({
      example: ["round", "bevel"],
      description: "kind が enum の場合に選択させる候補",
    }),
  min: z.number().optional().openapi({
    example: 0,
    description: "kind が number の場合の下限",
  }),
  max: z.number().optional().openapi({
    example: 2,
    description: "kind が number の場合の上限",
  }),
});

const themeConstraintSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("contrast"),
      foreground: z.string(),
      background: z.string(),
      min: z.number(),
    }),
    z.object({
      type: z.literal("similar"),
      a: z.string(),
      b: z.string(),
      max: z.number(),
    }),
  ])
  .openapi({
    example: { type: "contrast", foreground: "--text", background: "--surface", min: 4.5 },
    description:
      "画面上で実際に重なる色の組み合わせ。contrast は前景と背景が保つべき最低コントラスト比、similar は同系統であるべき2色が離れてよい上限",
  });

const generateThemeSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").openapi({
    example: "夏の海辺をイメージしたテーマ",
    description: "テーマ生成のためのプロンプト",
  }),
  requiredVariables: z.array(themeVariableSchema).optional().openapi({
    description: "生成するCSS変数の定義。指定しない場合はデフォルトの変数セットが使用されます。",
  }),
  constraints: z.array(themeConstraintSchema).optional().openapi({
    description:
      "守るべき色の組み合わせ。違反した場合は違反内容を伝えて再生成させ、それでも直らなければ決定的に補正します。",
  }),
});

const themeResponseSuccessSchema = z
  .object({
    type: z.string(),
    message: z.string(),
    variables: z.array(z.object({ name: z.string(), value: z.string() })),
  })
  .openapi({
    example: {
      type: "success",
      message: "Successfully generated theme.",
      variables: [
        { name: "primary-color", value: "#3498db" },
        { name: "secondary-color", value: "#2ecc71" },
      ],
    },
  });

const themeResponseErrorSchema = z
  .object({
    type: z.string(),
    error: z.object(),
  })
  .openapi({
    example: {
      type: "error",
      message: "Failed to generate theme.",
    },
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
          schema: themeResponseSuccessSchema,
        },
      },
      description: "テーマ生成結果",
    },
    400: {
      content: {
        "application/json": {
          schema: themeResponseErrorSchema,
        },
      },
      description: "エラー",
    },
  },
  tags: ["AI"],
  summary: "AIでテーマを生成",
  description: "指定されたプロンプトからAIがCSSテーマを生成します（1日100回まで）",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  c.header("Accept-CH", "Sec-CH-Viewport-Width, Sec-CH-Viewport-Height, Sec-CH-DPR");

  const { results } = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM themes WHERE created_at > datetime('now', '-1 day')",
  ).all();
  const count = results[0].count as number;

  // 24時間あたりのリクエストを100回に制限
  if (count > 100) {
    return c.json(
      {
        type: "limited",
        error: "Reached the limit of today's quota. Try again later.",
      },
      400,
    );
  }

  const { prompt, requiredVariables, constraints } = c.req.valid("json");
  const variables = requiredVariables ?? defaultRequiredVariables;
  const rules = constraints ?? [];
  const { OPENAI_API_KEY, DISCORD_WEBHOOK } = env(c);
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const viewportWidth = c.req.header("sec-ch-viewport-width") ?? c.req.header("viewport-width");
  const viewportHeight = c.req.header("sec-ch-viewport-height");
  const pixelRatio = c.req.header("sec-ch-dpr") ?? c.req.header("dpr");
  const client = [
    c.req.header("user-agent"),
    viewportWidth &&
      `${viewportWidth}${viewportHeight ? `x${viewportHeight}` : ""}${pixelRatio ? ` @${pixelRatio}x` : ""}`,
    c.req.header("sec-ch-ua-platform")?.replaceAll('"', ""),
  ]
    .filter(Boolean)
    .join(" / ");

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(variables, rules) },
      { role: "user", content: prompt },
    ];
    let content = "";
    let values: Record<string, string> = {};
    let violations: string[] = [];
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const completion = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        messages,
        response_format: buildResponseFormat(variables),
      });
      const message = completion.choices[0].message.content;
      if (!message) {
        throw new Error("Failed to generate theme.");
      }
      content = message;
      values = validateThemeValues(variables, JSON.parse(message));
      violations = checkConstraints(rules, values);
      if (violations.length === 0) {
        break;
      }
      messages.push(
        { role: "assistant", content: message },
        {
          role: "user",
          content: `That theme breaks the readability rules:\n${violations.map((violation) => `- ${violation}`).join("\n")}\n\nReturn the whole JSON again. Keep the same mood and keep every value that already passes, but fix the colors listed above.`,
        },
      );
    }

    const repaired = violations.length === 0 ? values : repairConstraints(rules, values);
    // 結果をd1に保存
    await c.env.DB.prepare("INSERT INTO themes (prompt, response) VALUES (?, ?)")
      .bind(prompt, content)
      .run();
    const parsedContent = repaired;
    // ディスコードに通知
    const preview = await renderThemePreview(variables, parsedContent, rules).catch((error) => {
      console.error(error);
      return null;
    });
    const nonColorValues = Object.fromEntries(
      variables
        .filter((variable) => variable.kind === "number" || variable.kind === "enum")
        .map((variable) => [variable.name, parsedContent[variable.name]]),
    );
    const notification = new FormData();
    notification.append(
      "payload_json",
      JSON.stringify({
        username: "portfolio",
        avatar_url: "https://newt239.dev/logo.png",
        attachments: preview ? [{ id: 0, filename: "theme.png" }] : undefined,
        embeds: [
          {
            title: "New Theme Generated",
            description: `Prompt: \`\`${prompt}\`\`\n\nAttempts: ${attempts}/${MAX_ATTEMPTS}${violations.length === 0 ? "" : `\nRepaired after unmet rules:\n${violations.map((violation) => `- ${violation}`).join("\n")}`}${Object.keys(nonColorValues).length === 0 ? "" : `\n\nResponse:\n\`\`\`json\n${JSON.stringify(nonColorValues, null, "\t")}\n\`\`\``}`,
            image: preview ? { url: "attachment://theme.png" } : undefined,
            fields: client ? [{ name: "Client", value: client }] : undefined,
            timestamp: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            color: 2664261,
            footer: {
              text: "© 2022-2025 newt",
              icon_url: "https://newt239.dev/logo.png",
            },
          },
        ],
      }),
    );
    if (preview) {
      notification.append("files[0]", new Blob([preview], { type: "image/png" }), "theme.png");
    }
    await fetch(DISCORD_WEBHOOK, { method: "POST", body: notification });
    return c.json(
      {
        type: "success",
        message: "Successfully generated theme.",
        variables: variables.map((variable) => ({
          name: variable.name,
          value: parsedContent[variable.name],
        })),
      },
      200,
    );
  } catch (error) {
    console.error(error);
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
            title: (error as APIError).code || "Unknown Error",
            description: (error as APIError).message,
            fields: client ? [{ name: "Client", value: client }] : undefined,
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
    return c.json({ type: "error", error: error as object }, 400);
  }
});

export default app;
