import { Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

import { ParagraphBlock } from "~/types/notion";

export const createMusicPageOnNotion = async (
  apiKey: string,
  dbId: string,
  props: {
    title: string;
    url: string;
    description: string;
    cover: string;
  }
) => {
  const notion = new Client({
    auth: apiKey,
  });
  const descriptionParagraph: ParagraphBlock[] = [];
  for (const eachParagraph of props.description.split("\n\n")) {
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
  console.log(descriptionParagraph);
  const params = {
    parent: { database_id: dbId },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: props.title,
            },
          },
        ],
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
        url: props.cover,
      },
    },
  } as CreatePageParameters;
  console.log(params);
  const res = await notion.pages.create(params);
  console.log(res);
  return res;
};
