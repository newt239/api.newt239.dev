import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

const discordCommandSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  version: z.string(),
  default_member_permissions: z.string().nullable(),
  type: z.number(),
  name: z.string(),
  name_localizations: z.record(z.string(), z.string()).nullable(),
  description: z.string(),
  description_localizations: z.record(z.string(), z.string()).nullable(),
  dm_permission: z.boolean().optional(),
  contexts: z.array(z.number()).nullable(),
  integration_types: z.array(z.number()).nullable(),
  options: z.array(z.any()).optional(),
});

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(discordCommandSchema),
        },
      },
      description: "Discordアプリケーションのコマンド一覧",
    },
  },
  tags: ["Discord"],
  summary: "Discordコマンド一覧を取得",
  description:
    "登録されているDiscordアプリケーションのスラッシュコマンド一覧を取得します",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(
  route,
  async (c) => {
    const token = c.env.DISCORD_TOKEN;
    const applicationId = c.env.DISCORD_APPLICATION_ID;
    const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      method: "GET",
    });
    const data: object = await response.json();

    return c.json(data);
  }
);

export default app;
