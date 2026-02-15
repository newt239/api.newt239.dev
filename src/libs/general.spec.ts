// getPageTitleFromUrlのテスト

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPageTitleFromUrl } from "./general";

const mockFetch = vi.fn();

describe("getPageTitleFromUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ページのタイトルが取得できる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi
        .fn()
        .mockResolvedValue(
          "<html><head><title>newt239.dev</title></head></html>"
        ),
    });
    const title = await getPageTitleFromUrl("https://newt239.dev/");
    expect(title).toBe("newt239.dev");
  });

  it("無効なURLが指定された場合はnullが返される", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Invalid URL"));
    const title = await getPageTitleFromUrl("invalid-url");
    expect(title).toBeNull();
  });

  it("レスポンスにtitleタグがない場合はnullが返される", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("<html><head></head></html>"),
    });
    const title = await getPageTitleFromUrl("https://example.com/");
    expect(title).toBeNull();
  });
});
