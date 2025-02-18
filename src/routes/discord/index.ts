import { Hono } from "hono";
import { cors } from "hono/cors";

import {
  type APIInteraction,
  type APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/payloads/v10";
import { verifyKey } from "discord-interactions";

import registerPOSTRoute from "./register";

import {
  BANDORI_COMMAND,
  INVITE_COMMAND,
  PJSEKAI_COMMAND,
} from "~/routes/discord/_commands";
import { Bindings } from "~/types/bindings";

const discordRoute = new Hono<{ Bindings: Bindings }>()
  .use("*", cors())
  .post("/", async (c) => {
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
    console.log(interaction);

    if (interaction.type === InteractionType.ApplicationCommand) {
      switch (interaction.data.name.toLowerCase()) {
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
        case PJSEKAI_COMMAND.name.toLowerCase(): {
          const cards = (await (
            await fetch(
              "https://sekai-world.github.io/sekai-master-db-diff/cards.json"
            )
          ).json()) as {
            id: string;
            prefix: string;
            assetbundleName: string;
            cardRarityType: string;
          }[];
          const filteredCards = cards.filter(
            (card) =>
              card.cardRarityType !== "rarity_1" &&
              card.cardRarityType !== "rarity_2"
          );
          const n = Math.floor(Math.random() * filteredCards.length);
          const card = filteredCards[n];
          const imageUrl = `https://storage.sekai.best/sekai-jp-assets/character/member_small/${card.assetbundleName}_rip/card_after_training.webp`;
          return c.json<APIInteractionResponse>({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `${card.prefix}\n\n${imageUrl}`,
            },
          });
        }
        case BANDORI_COMMAND.name.toLowerCase(): {
          const data = (await (
            await fetch("https://bestdori.com/api/cards/all.5.json")
          ).json()) as {
            [key: string]: {
              rarity: number;
              resourceSetName: string;
              prefix: string[];
            };
          };
          const filteredCards = Object.entries(data)
            .map(([id, value]) => {
              return {
                id,
                ...value,
              };
            })
            .filter((card) => card.rarity > 2);
          const n = Math.floor(Math.random() * filteredCards.length);
          const card = filteredCards[n];
          const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${card.resourceSetName}_rip/card_after_training.png`;
          return c.json<APIInteractionResponse>({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `${card.prefix}\n\n${imageUrl}`,
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
  })
  .post("/register", registerPOSTRoute)
  .get("/commands", async (c) => {
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

export default discordRoute;
