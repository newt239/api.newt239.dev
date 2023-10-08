import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

export const INVITE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "invite",
  description: "サーバーへの招待リンクを生成",
};

export const NOTION_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "notion",
  description: "NotionのMusic DBに追加",
  options: [
    {
      name: "music",
      description: "音楽",
      type: 1,
      options: [
        {
          name: "music_url",
          type: 3,
          required: true,
          description: "新たに保存したいYoutubeの動画のURL",
        },
      ],
    },
    {
      name: "bunkasai",
      description: "文化祭",
      type: 1,
      options: [
        {
          name: "bunkasai_url",
          type: 3,
          required: true,
          description: "記事のURL",
        },
        {
          name: "source_type",
          type: 3,
          required: true,
          description: "種別",
          choices: [
            { name: "記事", value: "article" },
            { name: "ウェブサイト", value: "website" },
            { name: "リポジトリ", value: "repository" },
            { name: "ニュース", value: "news" },
          ],
        },
        {
          name: "year",
          type: 4,
          required: true,
          description: "行われた年度",
        },
        {
          name: "school_type",
          type: 3,
          required: true,
          description: "学校の種類",
          choices: [
            { name: "高校", value: "高校" },
            { name: "大学", value: "大学" },
            { name: "高専", value: "高専" },
            { name: "一般", value: "一般" },
          ],
        },
      ],
    },
  ],
};

export const PJSEKAI_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "pjsekai",
  description: "プロセカの画像を返すコマンド",
  options: [
    {
      name: "type",
      type: 3,
      choices: [{ name: "カード", value: "card" }],
      required: true,
      description: "表示する画像の種類",
    },
  ],
};

export const BANDORI_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "bandori",
  description: "バンドリの画像を返すコマンド",
  options: [
    {
      name: "type",
      type: 3,
      choices: [{ name: "カード", value: "card" }],
      required: true,
      description: "表示する画像の種類",
    },
  ],
};

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  INVITE_COMMAND,
  NOTION_COMMAND,
  PJSEKAI_COMMAND,
  BANDORI_COMMAND,
];

export default commands;
