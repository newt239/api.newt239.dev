import { testClient } from "hono/testing";

import { env } from "cloudflare:test";

import app from "~/routes/index";

describe("Testing root path", () => {
  it("Should return 200 response", async () => {
    const res = await testClient(app).index.$get();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("🔥");
  });
});

describe("Testing /discord path", () => {
  it("Should return 400 when channelId is not provided", async () => {
    const res = await testClient(app, env).discord.channels[
      ":channelId"
    ].messages.$get({
      param: { channelId: "" },
    });
    expect(res.status).toBe(400);
  });

  it("Should return messages when valid channelId is provided", async () => {
    // モックのチャンネルIDでテスト
    const res = await testClient(app, env).discord.channels[
      ":channelId"
    ].messages.$get({
      param: { channelId: "123456789" },
    });
    expect(res.status).toBe(200);
  });
});
