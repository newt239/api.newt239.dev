// getPageTitleFromUrlのテスト

import { describe, expect } from "vitest";

import { getPageTitleFromUrl } from "./general";

describe("getPageTitleFromUrl", async () => {
  it("ページのタイトルが取得できる", async () => {
    const title = await getPageTitleFromUrl("https://newt239.dev/");
    expect(title).toBe("newt239.dev");
  });
  it("無効なURLが指定された場合はnullが返される", async () => {
    const title = await getPageTitleFromUrl("https://example.invalid/");
    expect(title).toBeNull();
  });
});
