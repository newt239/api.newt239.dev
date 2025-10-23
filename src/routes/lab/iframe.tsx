import { Hono } from "hono";
import type { FC } from "hono/jsx";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { Bindings } from "~/types/bindings";

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
  url: z.string().min(1, "URL is required"),
});

const app = new Hono<{ Bindings: Bindings }>().get(
  "/:url",
  zValidator("param", iframeParamSchema),
  (c) => {
    const { url: param } = c.req.valid("param");
    const url = URL.canParse(param) ? param : "https://newt239.dev/";
    return c.html(<IFrameComponent url={url} />);
  }
);

export default app;
