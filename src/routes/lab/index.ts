import { Hono } from "hono";
import { cors } from "hono/cors";

import iframeRoute from "~/routes/lab/iframe";
import postRoute from "~/routes/lab/post";

const labRoute = new Hono()
  .use("*", cors())
  .post("/post", postRoute)
  .get("/iframe/:url", iframeRoute);

export default labRoute;
