import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

import type { Bindings } from "~/types/bindings";

import generateThemeRoute from "~/routes/ai/generate-theme";
import commandsRoute from "~/routes/discord/commands";
import myTopTracksRoute from "~/routes/spotify/my-top-tracks";
import searchRoute from "~/routes/spotify/search";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// OpenAPI対応のルートを追加
app.route("/spotify/my-top-tracks", myTopTracksRoute);
app.route("/spotify/search", searchRoute);
app.route("/discord/commands", commandsRoute);
app.route("/ai/generate-theme", generateThemeRoute);

// OpenAPI仕様書のエンドポイント
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "api.newt239.dev",
    description: "newt239のAPIサーバー - OpenAPI対応ルート",
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
app.get("/", swaggerUI({ url: "/docs/openapi.json" }));

export default app;
