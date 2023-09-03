import { Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
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

import {
  BANDORI_COMMAND,
  INVITE_COMMAND,
  NOTION_COMMAND,
  PJSEKAI_COMMAND,
} from "~/routes/discord/_commands";
import { Bindings } from "~/types/bindings";
import { ParagraphBlock } from "~/types/notion";
import { getVideoInfo } from "~/utils/youtube";

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

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
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
      case NOTION_COMMAND.name.toLowerCase(): {
        const notion = new Client({
          auth: c.env.NOTION_API_KEY,
        });
        if (interaction.data.options[0].type === 3) {
          const videoId = interaction.data.options[0].value.split(/?|@/)[1];
          const video = await getVideoInfo(videoId);
          const descriptionParagraph: ParagraphBlock[] = [];
          if (video) {
            for (const eachParagraph of video.description.split("\n\n")) {
              descriptionParagraph.push({
                type: "paragraph",
                paragraph: {
                  rich_text: [
                    {
                      type: "text",
                      text: {
                        content: eachParagraph + "\n",
                        link: null,
                      },
                    },
                  ],
                },
              });
            }
            const parameters: CreatePageParameters = {
              parent: {
                database_id: c.env.NOTION_MUSIC_DB_ID,
              },
              properties: {
                Name: {
                  title: [
                    {
                      text: {
                        content: video.title,
                      },
                    },
                  ],
                },
                URL: {
                  url: "https://youtube.com/watch?v=" + video.id,
                },
              },
              children: descriptionParagraph,
              icon: {
                type: "external",
                external: {
                  url: "https://www.youtube.com/s/desktop/e06db45c/img/favicon_144x144.png",
                },
              },
              cover: {
                type: "external",
                external: {
                  url: video.thumbnail,
                },
              },
            } as CreatePageParameters;
            const response = await notion.pages.create(parameters);
            return c.json<APIInteractionResponse>({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `Notionに追加しました！\n + ${response.id}`,
              },
            });
          }
        }
        return c.json<APIInteractionResponse>({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "エラーが発生しました",
          },
        });
      }
      case PJSEKAI_COMMAND.name.toLowerCase(): {
        const cards: {
          id: string;
          prefix: string;
          assetbundleName: string;
          cardRarityType: string;
        }[] = await (
          await fetch(
            "https://sekai-world.github.io/sekai-master-db-diff/cards.json"
          )
        ).json();
        const filteredCards = cards.filter(
          (card) =>
            card.cardRarityType !== "rarity_1" &&
            card.cardRarityType !== "rarity_2"
        );
        const n = Math.floor(Math.random() * filteredCards.length);
        const card = filteredCards[n];
        const imageUrl = `https://storage.sekai.best/sekai-assets/character/member_small/${card.assetbundleName}_rip/card_after_training.webp`;
        return c.json<APIInteractionResponse>({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `${card.prefix}\n\n${imageUrl}`,
          },
        });
      }
      case BANDORI_COMMAND.name.toLowerCase(): {
        const data: {
          [key: string]: {
            rarity: number;
            resourceSetName: string;
            prefix: string[];
          };
        } = await (
          await fetch("https://bestdori.com/api/cards/all.5.json")
        ).json();
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
});

discordRoute.post("/register", registerPOSTRoute);

discordRoute.get("/commands", async (c) => {
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

  return c.json(await response.json());
});

export default discordRoute;
