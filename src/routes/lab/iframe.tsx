import type { Context } from "hono";
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

const iframeRoute = (c: Context) => {
  const param = c.req.param("param");
  const url = URL.canParse(param) ? param : "https://newt239.dev/";
  return c.html(<IFrameComponent url={url} />);
};

export default iframeRoute;
