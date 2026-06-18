import app from "~/routes/index";

const initializeRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  },
};

describe("Testing /mcp endpoint", () => {
  it("initializeリクエストにサーバー情報を返す", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(initializeRequest),
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("api.newt239.dev");
  });
});
