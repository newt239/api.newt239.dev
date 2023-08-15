import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";

export const AWW_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "awwww",
  description: "Drop some cuteness on this channel.",
};

export const INVITE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "invite",
  description: "Get an invite link to add the bot to your server",
};

export const PJSEKAI_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
  name: "pjsekai",
  description: "get pjsekai data",
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
  AWW_COMMAND,
  INVITE_COMMAND,
  PJSEKAI_COMMAND,
];

export default commands;
