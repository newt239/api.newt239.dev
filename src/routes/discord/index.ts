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

import type { Bindings } from "~/types/bindings";

import {
  BANDORI_COMMAND,
  INVITE_COMMAND,
  PJSEKAI_COMMAND,
} from "~/routes/discord/_commands";

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
      return c.json({ error: "Bad request signature." } as const, 401);
    }

    const interaction: APIInteraction = JSON.parse(body);
    if (!interaction) {
      return c.json({ error: "Invalid request body." } as const, 401);
    }

    if (interaction.type === InteractionType.Ping) {
      return c.json<APIInteractionResponse>({
        type: InteractionResponseType.Pong,
      });
    }

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
          const imageUrl = `https://storage.sekai.best/sekai-jp-assets/character/member/${card.assetbundleName}/card_after_training.webp`;
          return c.json<APIInteractionResponse>({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `${card.prefix}\n\n${imageUrl}`,
            },
          } as const);
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
          } as const);
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
      } as const,
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
  })
  .get("/channels/:channelId/messages", async (c) => {
    const token = c.env.DISCORD_TOKEN;
    const channelId = c.req.param("channelId");
    const limit = c.req.query("limit") || "50";
    const before = c.req.query("before");
    const after = c.req.query("after");

    if (!channelId) {
      return c.json({ error: "チャンネルIDが必要です" }, 400);
    }

    let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`;

    if (before) {
      url += `&before=${before}`;
    }
    if (after) {
      url += `&after=${after}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bot ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return c.json(
          {
            error: "メッセージ取得に失敗しました",
            details: errorData,
          } as const,
          response.status as 400 | 401 | 403 | 404 | 500
        );
      }

      const messages = (await response.json()) as unknown[];
      return c.json(messages);
    } catch {
      return c.json(
        { error: "内部サーバーエラーが発生しました" } as const,
        500
      );
    }
  });

export default discordRoute;
