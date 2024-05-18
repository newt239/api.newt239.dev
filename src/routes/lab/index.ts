import { Hono } from "hono";
import { cors } from "hono/cors";

import iframeRoute from "~/routes/lab/iframe";
import postRoute from "~/routes/lab/post";

const labRoute = new Hono();

labRoute.use("*", cors());

labRoute.post("/post", postRoute);

labRoute.get("/iframe/:url", iframeRoute);

export default labRoute;
