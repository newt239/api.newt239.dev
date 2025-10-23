import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { Bindings } from "~/types/bindings";

const postBodySchema = z.record(z.string(), z.unknown());

const app = new Hono<{ Bindings: Bindings }>().post(
  "/",
  zValidator("json", postBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const header = {
      userAgent: c.req.header("User-Agent"),
      ContentType: c.req.header("Content-Type"),
    };
    const res = { body, header };
    console.log(res);

    return c.json(res);
  }
);

export default app;
