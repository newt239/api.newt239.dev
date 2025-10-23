import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { Bindings } from "~/types/bindings";

const messagesParamSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});

const messagesQuerySchema = z.object({
  limit: z.string().optional().default("50"),
  before: z.string().optional(),
  after: z.string().optional(),
});

const app = new Hono<{ Bindings: Bindings }>().get(
  "/:channelId",
  zValidator("param", messagesParamSchema),
  zValidator("query", messagesQuerySchema),
  async (c) => {
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
          } as const,
          response.status as 400 | 401 | 403 | 404 | 500
        );
      }

      const messages = (await response.json()) as unknown[];
      return c.json(messages);
    } catch {
      return c.json(
        { error: "内部サーバーエラーが発生しました" } as const,
        500
      );
    }
  }
);

export default app;
