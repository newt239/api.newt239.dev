import { Hono } from "hono";
import { cors } from "hono/cors";

import postRoute from "~/routes/lab/post";

const lab = new Hono();

lab.use("*", cors());

lab.post("/post", postRoute);

export default lab;