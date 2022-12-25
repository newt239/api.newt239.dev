import {
  MessageAPIResponseBase,
  TextMessage,
  WebhookEvent,
} from "@line/bot-sdk";
import { Hono } from "hono";

import { OpenAI } from "../openai";
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
  const openaiClient = new OpenAI(openaiSecret);
  const generatedMessage = await openaiClient.generateMessage(
    event.message.text
  );
  const reply: TextMessage = {
    type: "text",
    text:
      generatedMessage ||
      "何らかのエラーによりメッセージを生成できませんでした。",
  };
  await fetch("https://api.line.me/v2/bot/message/reply", {
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [reply],
    }),
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
};
export default line;
