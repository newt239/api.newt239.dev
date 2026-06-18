import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

const postBodySchema = z.record(z.string(), z.unknown()).openapi({
  example: { message: "hello" },
});

const postResponseSchema = z.object({
  body: z.record(z.string(), z.unknown()),
  header: z.object({
    userAgent: z.string().nullable(),
    ContentType: z.string().nullable(),
  }),
});

const route = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: postBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: postResponseSchema,
        },
      },
      description: "送信されたボディと一部のリクエストヘッダーをそのまま返す",
    },
  },
  tags: ["Lab"],
  summary: "リクエスト内容をエコーする",
  description: "送信したJSONボディと一部のリクエストヘッダーをそのまま返す実験用エンドポイント",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, (c) => {
  const body = c.req.valid("json");
  const header = {
    userAgent: c.req.header("User-Agent") ?? null,
    ContentType: c.req.header("Content-Type") ?? null,
  };
  return c.json({ body, header });
});

export default app;
