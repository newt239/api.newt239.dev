import { Hono } from "hono";

import lab from "~/routes/lab";
import openaiRoute from "~/routes/openai";
import spotify from "~/routes/spotify";

const app = new Hono();
app.get("/", (c) => c.text("🔥"));
app.route("/openai", openaiRoute);
app.route("/spotify", spotify);
app.route("/lab", lab);

export default app;
