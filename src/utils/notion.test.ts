import { createMusicPageOnNotion } from "~/utils/notion";

test("create music page on notion", async () => {
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionMusicDbId = process.env.NOTION_MUSIC_DB_ID;
  if (notionApiKey && notionMusicDbId) {
    const result = await createMusicPageOnNotion(
      notionApiKey,
      notionMusicDbId,
      {
        title: "Hello",
        url: "https://www.youtube.com/watch?v=1",
        description: "Hello Taro",
        cover: "https://i.ytimg.com/vi/Q1_vm1TwYyU/hqdefault.jpg",
      }
    );
    console.log(result);
  }
});
