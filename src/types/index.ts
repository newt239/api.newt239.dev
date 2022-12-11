import { WebhookEvent } from "@line/bot-sdk";

export type LineWebhookRequest = {
  destination: string;
  events: WebhookEvent[];
};
