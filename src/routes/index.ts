import { Hono } from "hono";

import discordRoute from "~/routes/discord";
import labRoute from "~/routes/lab";
import spotifyRoute from "~/routes/spotify";

const app = new Hono();
app.get("/", (c) => c.text("🔥"));
app.route("/spotify", spotifyRoute);
app.route("/discord", discordRoute);
app.route("/lab", labRoute);

export default app;
