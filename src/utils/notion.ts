import { Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

import { ParagraphBlock } from "~/types/notion";
import { getPageTitleFromUrl } from "~/utils/general";

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
      URL: {
        url: props.url,
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
  const res = await notion.pages.create(params);
  return res;
};

export const createBunkasaiPageOnNotion = async (
  apiKey: string,
  dbId: string,
  props: {
    url: string;
    source_type: string;
    year: number;
    schoolType: string;
  }
) => {
  const title = await getPageTitleFromUrl(props.url);
  const notion = new Client({
    auth: apiKey,
  });
  const params = {
    parent: { database_id: dbId },
    properties: {
      名前: {
        title: [
          {
            text: {
              content: title || props.url,
            },
          },
        ],
      },
      種別: {
        select: {
          name: props.source_type,
        },
      },
      年度: {
        number: props.year,
      },
      学校種別: {
        select: {
          name: props.schoolType,
        },
      },
    },
  } as CreatePageParameters;
  const is_archive = props.url.includes("web.archive.org");
  if (is_archive) {
    params.properties.アーカイブ = {
      url: props.url,
    };
  } else {
    params.properties.リンク = {
      url: props.url,
    };
  }
  console.log(params);
  const res = await notion.pages.create(params);
  return res;
};
