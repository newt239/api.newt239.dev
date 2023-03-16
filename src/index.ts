import { Hono } from "hono";

import openaiRoute from "./routes/openai";
import spotify from "./routes/spotify";

const app = new Hono();
app.get("/", (c) => c.text("🔥"));
app.route("/openai", openaiRoute);
app.route("/spotify", spotify);

export default app;
