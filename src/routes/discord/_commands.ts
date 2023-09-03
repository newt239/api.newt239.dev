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
      name: "URL",
      type: 3,
      required: true,
      description: "追加するURL",
    },
  ],
};

export const PJSEKAI_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "pjsekai",
  description: "プロセカの画像を返すコマンド",
  options: [
    {
      name: "タイプ",
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
      name: "タイプ",
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
