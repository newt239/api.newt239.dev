import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

const messagesParamSchema = z.object({
  channelId: z
    .string()
    .min(1, "Channel ID is required")
    .openapi({
      param: {
        name: "channelId",
        in: "path",
      },
      example: "1234567890",
      description: "メッセージを取得するDiscordチャンネルのID",
    }),
});

const messagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("50")
    .openapi({
      param: {
        name: "limit",
        in: "query",
      },
      example: "50",
      description: "取得件数（デフォルト50）",
    }),
  before: z
    .string()
    .optional()
    .openapi({
      param: {
        name: "before",
        in: "query",
      },
      description: "指定したメッセージIDより前のメッセージを取得",
    }),
  after: z
    .string()
    .optional()
    .openapi({
      param: {
        name: "after",
        in: "query",
      },
      description: "指定したメッセージIDより後のメッセージを取得",
    }),
});

const messagesErrorSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

const route = createRoute({
  method: "get",
  path: "/{channelId}",
  request: {
    params: messagesParamSchema,
    query: messagesQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(z.any()),
        },
      },
      description: "チャンネルのメッセージ一覧",
    },
    400: {
      content: { "application/json": { schema: messagesErrorSchema } },
      description: "リクエストエラー",
    },
    401: {
      content: { "application/json": { schema: messagesErrorSchema } },
      description: "認証エラー",
    },
    403: {
      content: { "application/json": { schema: messagesErrorSchema } },
      description: "権限エラー",
    },
    404: {
      content: { "application/json": { schema: messagesErrorSchema } },
      description: "チャンネルが見つからない",
    },
    500: {
      content: { "application/json": { schema: messagesErrorSchema } },
      description: "サーバーエラー",
    },
  },
  tags: ["Discord"],
  summary: "Discordチャンネルのメッセージを取得",
  description: "指定したチャンネルのメッセージ一覧を取得します。before/afterでページングできます。",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const token = c.env.DISCORD_TOKEN;
  const { channelId } = c.req.valid("param");
  const { limit, before, after } = c.req.valid("query");

  let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`;

  if (before) {
    url += `&before=${before}`;
  }
  if (after) {
    url += `&after=${after}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return c.json(
        {
          error: "メッセージ取得に失敗しました",
          details: errorData,
        },
        response.status as 400 | 401 | 403 | 404 | 500,
      );
    }

    const messages = (await response.json()) as unknown[];
    return c.json(messages, 200);
  } catch {
    return c.json({ error: "内部サーバーエラーが発生しました" }, 500);
  }
});

export default app;
