import { Hono } from "hono";
import { cors } from "hono/cors";

import postRoute from "~/routes/lab/post";

const labRoute = new Hono();

labRoute.use("*", cors());

labRoute.post("/post", postRoute);

export default labRoute;
