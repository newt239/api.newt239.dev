import {
  MessageAPIResponseBase,
  TextMessage,
  WebhookEvent,
} from "@line/bot-sdk";
import { Hono } from "hono";
import { Configuration, OpenAIApi } from "openai";

import { LineWebhookRequest } from "../types";
const line = new Hono();

line.post("/webhook", async (c) => {
  const data: LineWebhookRequest = await c.req.json();
  const events: WebhookEvent[] = data.events;
  const accessToken: string = c.env.CHANNEL_ACCESS_TOKEN;
  const openaiSecret: string = c.env.OPENAI_SECRET;
  await Promise.all(
    events.map(async (event: WebhookEvent) => {
      try {
        await textEventHandler(event, accessToken, openaiSecret);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(err);
        }
        return c.json({
          status: "error",
        });
      }
    })
  );
  return c.json({ message: "ok" });
});

const textEventHandler = async (
  event: WebhookEvent,
  accessToken: string,
  openaiSecret: string
): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const configuration = new Configuration({
    apiKey: openaiSecret,
  });
  const openai = new OpenAIApi(configuration);
  const result = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: event.message.text,
    temperature: 0.3,
    max_tokens: 500,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });

  const response: TextMessage = {
    type: "text",
    text: result.data.choices[0].text || "何らかのエラーが発生しました。",
  };
  await fetch("https://api.line.me/v2/bot/message/reply", {
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [response],
    }),
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
};
export default line;
