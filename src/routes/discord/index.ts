import {
  APIInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import { Hono } from "hono";
import { cors } from "hono/cors";

import registerPOSTRoute from "./register";

import { AWW_COMMAND, INVITE_COMMAND } from "~/routes/discord/_commands";
import { Bindings } from "~/types/bindings";

const discordRoute = new Hono<{ Bindings: Bindings }>();

discordRoute.use("*", cors());

discordRoute.post("/", async (c) => {
  const signature = c.req.header("x-signature-ed25519");
  const timestamp = c.req.header("x-signature-timestamp");
  const body = await c.req.text();
  const isValidRequest =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return c.text("Bad request signature.", 401);
  }

  const interaction: APIInteraction = JSON.parse(body);
  if (!interaction) {
    return c.text("Bad request signature.", 401);
  }

  if (interaction.type === InteractionType.Ping) {
    return c.json<APIInteractionResponse>({
      type: InteractionResponseType.Pong,
    });
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    switch (interaction.data.name.toLowerCase()) {
      case AWW_COMMAND.name.toLowerCase(): {
        console.log("handling cute request");
        const cuteUrl =
          "https://pbs.twimg.com/media/F3N_AKcaAAAHXpt?format=jpg&name=4096x4096";
        return c.json<APIInteractionResponse>({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: cuteUrl,
          },
        });
      }
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = c.env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return c.json<APIInteractionResponse>({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: INVITE_URL,
            flags: 64,
          },
        });
      }
      default:
        console.error("Unknown Command");
        return c.json(
          {
            error: "Unknown Type",
          },
          400
        );
    }
  }

  console.error("Unknown Type");
  return c.json(
    {
      error: "Unknown Type",
    },
    400
  );
});

discordRoute.post("/register", registerPOSTRoute);

export default discordRoute;
