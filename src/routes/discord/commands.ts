import { Hono } from "hono";

import type { Bindings } from "~/types/bindings";

const app = new Hono<{ Bindings: Bindings }>().get("/", async (c) => {
  const token = c.env.DISCORD_TOKEN;
  const applicationId = c.env.DISCORD_APPLICATION_ID;
  const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    method: "GET",
  });
  const data: object = await response.json();

  return c.json(data);
});

export default app;
