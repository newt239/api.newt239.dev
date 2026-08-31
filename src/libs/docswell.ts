import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { XMLParser } from "fast-xml-parser";

dayjs.extend(utc);

const DOCSWELL_FEED_URL = "https://www.docswell.com/user/newt239/feed";

export type DocswellSlide = {
  title: string;
  url: string;
  date: string;
  thumbnail: string;
};

export const getDocswellSlides = async (): Promise<DocswellSlide[]> => {
  const res = await fetch(DOCSWELL_FEED_URL);
  if (!res.ok) {
    throw new Error(`Docswell のフィード取得に失敗しました (${res.status}): ${await res.text()}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    isArray: (name) => name === "item",
  });
  const feed = parser.parse(await res.text()) as {
    rss?: {
      channel?: {
        item?: Array<{
          title: string;
          guid: string;
          pubDate: string;
          "media:thumbnail": { "@_url": string };
        }>;
      };
    };
  };

  const channel = feed.rss?.channel;
  if (!channel) {
    throw new Error("Docswell のフィードが RSS 形式ではありません");
  }

  return (channel.item ?? []).map((item) => {
    const thumbnail = new URL(item["media:thumbnail"]["@_url"]);
    thumbnail.search = "width=640";
    return {
      title: item.title
        .replace(/^\[[^\]]*\]\s*/, "")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'")
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&"),
      url: item.guid,
      date: dayjs(item.pubDate).utcOffset(9).format("YYYY-MM-DD"),
      thumbnail: thumbnail.toString(),
    };
  });
};
