import { Hono } from "hono";
import { cors } from "hono/cors";
import { D1QB } from "workers-qb";

import { Bindings } from "~/types/cloudflare-env";
import { Conversation } from "~/types/d1";
import { OpenAIApiRequest } from "~/types/openai";
import {
  OpenAIChatRequestParams,
  OpenAIChatWithLogsRequestParams,
} from "~/types/route";
import { OpenAI } from "~/utils/openai";

const openaiRoute = new Hono<{ Bindings: Bindings }>();
openaiRoute.use("*", cors());

openaiRoute.post("/gpt-3_5", async (c) => {
  const { message, user_id, session_id } =
    await c.req.json<OpenAIChatRequestParams>();
  const userPrompt: OpenAIApiRequest["messages"][0] = {
    role: "user",
    content: message as string,
  };

  const conditions: string[] = [];
  if (user_id) {
    conditions.push(`user_id = '${user_id}'`);
    if (session_id) conditions.push(`session_id = '${session_id}'`);
  }

  const qb = new D1QB(c.env.DB);
  let histories: OpenAIApiRequest["messages"][0][] = [];
  if (user_id) {
    const data = await qb.fetchAll({
      tableName: "conversations",
      fields: "*",
      where: {
        conditions,
      },
    });
    const results: Conversation[] = data.results
      ? (data.results as Conversation[])
      : [];
    histories = results.map((history) => {
      return { role: history.role, content: history.message };
    });
  }

  const messages = [...histories, userPrompt];
  console.log(messages);

  const openaiClient = new OpenAI(c.env.OPENAI_API_KEY);
  const completion = await openaiClient.createCompletion({
    model: "gpt-3.5-turbo",
    messages,
  });
  console.log(completion);

  try {
    if (typeof completion !== "string") {
      await qb.insert({
        tableName: "conversations",
        data: [
          {
            role: "user",
            message,
            user_id: user_id ? user_id : null,
            session_id: session_id ? session_id : null,
          },
          {
            role: "assistant",
            message: completion.choices[0].message.content,
            user_id: user_id ? user_id : null,
            session_id: session_id ? session_id : null,
          },
        ],
      });
      console.log(completion.choices[0].message.content);
      return c.json(completion);
    }
  } catch (e) {
    console.log(e);
  }

  return c.json(completion);
});

openaiRoute.post("/gpt-3_5-with-logs", async (c) => {
  const { messages } = await c.req.json<OpenAIChatWithLogsRequestParams>();

  console.log(messages);

  const openaiClient = new OpenAI(c.env.OPENAI_API_KEY);
  const completion = await openaiClient.createCompletion({
    model: "gpt-3.5-turbo",
    messages,
  });

  console.log(completion);
  return c.json(completion);
});

export default openaiRoute;
