import { Hono } from "hono";

import line from "./line";

const app = new Hono();
app.get("/", (c) => c.text("Hello 🔥"));
app.route("/line", line);

export default app;
