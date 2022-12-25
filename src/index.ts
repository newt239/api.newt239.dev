import { Hono } from "hono";

import line from "./line";
import spotify from "./spotify";

const app = new Hono();
app.get("/", (c) => c.text("🔥"));
app.route("/line", line);
app.route("/spotify", spotify);

export default app;
