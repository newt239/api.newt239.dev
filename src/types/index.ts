import { WebhookEvent } from "@line/bot-sdk";

export type LineWebhookRequest = {
  destination: string;
  events: WebhookEvent[];
};

export interface OpenAiApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChoicesEntity[];
  usage: Usage;
}
export interface ChoicesEntity {
  text: string;
  index: number;
  logprobs?: null;
  finish_reason: string;
}
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
