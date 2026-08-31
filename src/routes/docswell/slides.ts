import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getDocswellSlides } from "~/libs/docswell";

import type { Bindings } from "~/types/bindings";

const slideSchema = z.object({
  title: z.string().openapi({
    example: 'hidden="until-found"を使ってアクセシブルな折りたたみを実装する',
  }),
  url: z.string().url().openapi({
    example: "https://www.docswell.com/s/newt239/5JW6WX-introducing-hidden-until-found",
  }),
  date: z.string().openapi({ example: "2026-07-27" }),
  thumbnail: z.string().url().openapi({
    example: "https://bcdn.docswell.com/page/9J29VGGGER.jpg?width=640",
  }),
});

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(slideSchema),
        },
      },
      description: "Docswell に公開しているスライド一覧",
    },
  },
  tags: ["Docswell"],
  summary: "Docswell のスライド一覧を取得",
  description: "Docswell の RSS フィードを JSON に整形して全件返します",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const slides = await getDocswellSlides();
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(slides);
});

export default app;
