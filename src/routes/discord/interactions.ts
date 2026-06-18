import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  type APIInteraction,
  type APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";

import { BANDORI_COMMAND, INVITE_COMMAND, PJSEKAI_COMMAND } from "~/routes/discord/_commands";

import type { Bindings } from "~/types/bindings";

const interactionErrorSchema = z.object({
  error: z.string(),
});

const route = createRoute({
  method: "post",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.any(),
        },
      },
      description: "Discordへのインタラクションレスポンス（Pongまたはメッセージ）",
    },
    400: {
      content: { "application/json": { schema: interactionErrorSchema } },
      description: "未知のインタラクションタイプ",
    },
    401: {
      content: { "application/json": { schema: interactionErrorSchema } },
      description: "署名検証に失敗",
    },
  },
  tags: ["Discord"],
  summary: "Discordインタラクションを処理",
  description:
    "Discordから送信されるスラッシュコマンドのインタラクションを署名検証付きで処理するWebhookエンドポイントです。Ed25519署名ヘッダーが必須のためDiscordからのみ呼び出されます。",
});

const app = new OpenAPIHono<{ Bindings: Bindings }>().openapi(route, async (c) => {
  const signature = c.req.header("x-signature-ed25519");
  const timestamp = c.req.header("x-signature-timestamp");
  const body = await c.req.text();
  const isValidRequest =
    signature && timestamp && verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return c.json({ error: "Bad request signature." }, 401);
  }

  const interaction: APIInteraction = JSON.parse(body);
  if (!interaction) {
    return c.json({ error: "Invalid request body." }, 401);
  }

  if (interaction.type === InteractionType.Ping) {
    return c.json(
      {
        type: InteractionResponseType.Pong,
      } satisfies APIInteractionResponse,
      200,
    );
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    switch (interaction.data.name.toLowerCase()) {
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = c.env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return c.json(
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: INVITE_URL,
              flags: 64,
            },
          } satisfies APIInteractionResponse,
          200,
        );
      }
      case PJSEKAI_COMMAND.name.toLowerCase(): {
        const cards = (await (
          await fetch("https://sekai-world.github.io/sekai-master-db-diff/cards.json")
        ).json()) as {
          id: string;
          prefix: string;
          assetbundleName: string;
          cardRarityType: string;
        }[];
        const filteredCards = cards.filter(
          (card) => card.cardRarityType !== "rarity_1" && card.cardRarityType !== "rarity_2",
        );
        const n = Math.floor(Math.random() * filteredCards.length);
        const card = filteredCards[n];
        const imageUrl = `https://storage.sekai.best/sekai-jp-assets/character/member/${card.assetbundleName}/card_after_training.webp`;
        return c.json(
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `${card.prefix}\n\n${imageUrl}`,
            },
          } satisfies APIInteractionResponse,
          200,
        );
      }
      case BANDORI_COMMAND.name.toLowerCase(): {
        const data = (await (await fetch("https://bestdori.com/api/cards/all.5.json")).json()) as {
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
        return c.json(
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `${card.prefix[0]}\n\n${imageUrl}`,
            },
          } satisfies APIInteractionResponse,
          200,
        );
      }
      default:
        console.error("Unknown Command");
        return c.json(
          {
            error: "Unknown Type",
          },
          400,
        );
    }
  }

  console.error("Unknown Type");
  return c.json(
    {
      error: "Unknown Type",
    },
    400,
  );
});

export default app;
