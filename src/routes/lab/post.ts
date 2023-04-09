import type { Context } from "hono";

const postRoute = async (c: Context) => {
  const body = await c.req.json();
  const header = {
    userAgent: c.req.header("User-Agent"),
    ContentType: c.req.header("Content-Type"),
  };
  const res = { body, header };
  console.log(res);

  return c.json(res);
};

export default postRoute;
