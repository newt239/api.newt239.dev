import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

import generateThemeRoute from "~/routes/ai/generate-theme";
import libraryRoute from "~/routes/annict/library";
import commandsRoute from "~/routes/discord/commands";
import interactionsRoute from "~/routes/discord/interactions";
import messagesRoute from "~/routes/discord/messages";
import registerRoute from "~/routes/discord/register";
import iframeRoute from "~/routes/lab/iframe";
import postRoute from "~/routes/lab/post";
import myTopTracksRoute from "~/routes/spotify/my-top-tracks";
import searchRoute from "~/routes/spotify/search";

import type { Bindings } from "~/types/bindings";

/** Cloudflare Pages のプレビューURL（例: https://811319f9.newt239-dev.pages.dev） */
const PREVIEW_ORIGIN_REGEX = /^https:\/\/[a-zA-Z0-9-]+\.newt239-dev\.pages\.dev$/;

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (
        origin === "https://newt239.dev" ||
        origin === "http://localhost:3000" ||
        PREVIEW_ORIGIN_REGEX.test(origin)
      ) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/", (c) => c.text("🔥"));

// Spotify routes
app.route("/spotify/my-top-tracks", myTopTracksRoute);
app.route("/spotify/search", searchRoute);
// Discord routes
app.route("/discord", interactionsRoute);
app.route("/discord/register", registerRoute);
app.route("/discord/commands", commandsRoute);
app.route("/discord/channels", messagesRoute);
// AI routes
app.route("/ai/generate-theme", generateThemeRoute);
app.route("/annict/library", libraryRoute);
// Lab routes
app.route("/lab/post", postRoute);
app.route("/lab/iframe", iframeRoute);

// OpenAPI仕様書のエンドポイント
app.doc("/docs/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "api.newt239.dev",
    description: "newt239のAPIサーバー",
  },
  servers: [
    {
      url: "https://api.newt239.dev",
      description: "Production server",
    },
    {
      url: "http://localhost:8787",
      description: "Development server",
    },
  ],
});

// Swagger UIのエンドポイント
app.get("/docs", swaggerUI({ url: "/docs/openapi.json" }));

export default app;
