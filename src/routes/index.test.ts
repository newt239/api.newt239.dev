import { testClient } from "hono/testing";

import app from "./index";

describe("Testing My App", () => {
  it("Should return 200 response", async () => {
    const res = testClient(app);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("🔥");
  });
});
