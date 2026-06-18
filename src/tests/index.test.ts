import app from "~/routes/index";

describe("Testing root path", () => {
  it("Should return 200 response", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("🔥");
  });
});
