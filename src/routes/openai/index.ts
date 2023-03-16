import { Hono } from "hono";
import { cors } from "hono/cors";

import { Bindings } from "../../types/cloudflare-env";
import { OpenAI } from "../../utils/openai";

const openaiRoute = new Hono<{ Bindings: Bindings }>();
openaiRoute.use("*", cors());

openaiRoute.get("/gpt-3_5", async (c) => {
  const openaiClient = new OpenAI(c.env.OPENAI_API_KEY);
  const completion = await openaiClient.createCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello!" }],
  });
  return c.json(completion);
});

export default openaiRoute;
