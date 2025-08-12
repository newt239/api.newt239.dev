import { testClient } from "hono/testing";

import { env } from "cloudflare:test";

import app from "~/routes/index";
import { requiredVariables } from "~/utils/ai";

describe("Testing root path", () => {
  it("Should return 200 response", async () => {
    const res = await testClient(app).index.$get();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("🔥");
  });
});

describe("Testing /ai path", () => {
  it("返り値に含まれる変数の数が期待する個数と等しい", async () => {
    // TODO: .dev.varsの変数が取得できていない
    const res = await testClient(app, env).ai["generate-theme"].$post({
      form: {
        prompt: "Test request with Vitest",
      },
    });
    expect(res.status).toBe(200);
    const data = JSON.parse((await res.json()).body);
    expect(data.type).toBe("success");
    expect(data.variables.length).toEqual(requiredVariables.length);
  });
});
