import { H } from "hono/dist/types/types";

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

  if (response.ok) {
    return c.json({
      type: "success",
      message: "Registered all commands",
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
