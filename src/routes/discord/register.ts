import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import commands from "~/routes/discord/_commands";

import type { Bindings } from "~/types/bindings";

import type { RESTPutAPIApplicationCommandsResult } from "discord-api-types/v10";

const registerSuccessSchema = z.object({
  type: z.literal("success"),
  message: z.string(),
  data: z.array(z.any()),
});

const registerErrorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

const route = createRoute({
  method: "post",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: registerSuccessSchema,
        },
      },
      description: "コマンドの登録に成功",
    },
    500: {
      content: {
        "application/json": {
          schema: registerErrorSchema,
        },
      },
      description: "コマンドの登録に失敗",
    },
  },
  tags: ["Discord"],
  summary: "Discordスラッシュコマンドを登録",
  description: "定義済みのスラッシュコマンドをDiscordアプリケーションに一括登録します",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const token = c.env.DISCORD_TOKEN;
  const applicationId = c.env.DISCORD_APPLICATION_ID;
  const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    method: "PUT",
    body: JSON.stringify(commands),
  });
  if (response.ok) {
    const data = (await response.json()) as RESTPutAPIApplicationCommandsResult;
    return c.json(
      {
        type: "success" as const,
        message: "Registered all commands",
        data,
      },
      200,
    );
  }

  const text = await response.text();
  return c.json(
    {
      type: "error" as const,
      message: text,
    },
    500,
  );
});

export default app;
