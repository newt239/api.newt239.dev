import { Hono } from "hono";

import lab from "~/routes/lab";
import spotify from "~/routes/spotify";

const app = new Hono();
app.get("/", (c) => c.text("🔥"));
app.route("/spotify", spotify);
app.route("/lab", lab);

export default app;
