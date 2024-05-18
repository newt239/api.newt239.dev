import { Context } from "hono";
import { FC } from "hono/jsx";

const IFrameComponent: FC<{ url: string }> = (props) => {
  const title = "iframe demo";

  return (
    <html>
      <head>
        <title>{title}</title>
      </head>
      <body>
        <h1>{title}</h1>
        <iframe width="800px" height="500px" src={props.url}></iframe>
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
