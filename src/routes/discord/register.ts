import { H } from "hono/dist/types/types";

import type { RESTPutAPIApplicationCommandsResult } from "discord-api-types/v10";

import commands from "~/routes/discord/_commands";
import { Bindings } from "~/types/bindings";

const registerPOSTRoute: H<{ Bindings: Bindings }> = async (c) => {
  const token = c.env.DISCORD_TOKEN;
  const applicationId = c.env.DISCORD_APPLICATION_ID;
  const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    method: "PUT",
    body: JSON.stringify(commands),
  });
  console.log(response);
  if (response.ok) {
    const data = (await response.json()) as RESTPutAPIApplicationCommandsResult;
    return c.json({
      type: "success",
      message: "Registered all commands",
      data,
    });
  } else {
    const text = await response.text();
    return c.json(
      {
        type: "error",
        message: text,
      },
      500
    );
  }
};

export default registerPOSTRoute;
