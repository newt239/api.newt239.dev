import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

import type { FC } from "hono/jsx";

const IFrameComponent: FC<{ url: string }> = (props) => {
  const title = "iframe demo";

  return (
    <html lang="ja">
      <head>
        <title>{title}</title>
      </head>
      <body>
        <h1>{title}</h1>
        <iframe width="800px" height="500px" src={props.url} title={title} />
      </body>
    </html>
  );
};

const iframeParamSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .openapi({
      param: {
        name: "url",
        in: "path",
      },
      example: "https://newt239.dev/",
      description: "iframeに埋め込むURL。パースできない場合はnewt239.devにフォールバックします。",
    }),
});

const route = createRoute({
  method: "get",
  path: "/{url}",
  request: {
    params: iframeParamSchema,
  },
  responses: {
    200: {
      content: {
        "text/html": {
          schema: z.string(),
        },
      },
      description: "指定URLを埋め込んだHTMLページ",
    },
  },
  tags: ["Lab"],
  summary: "URLをiframeで埋め込んだHTMLを返す",
  description: "パスで指定したURLをiframeに埋め込んだHTMLページを返す実験用エンドポイントです。",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, (c) => {
  const { url: param } = c.req.valid("param");
  const url = URL.canParse(param) ? param : "https://newt239.dev/";
  return c.html(<IFrameComponent url={url} />);
});

export default app;
