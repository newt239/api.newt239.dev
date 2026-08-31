import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDocswellSlides } from "./docswell";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const singleItemFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>newtの最新コンテンツ | ドクセル</title>
    <item>
      <title><![CDATA[[スライド] hidden=&quot;until-found&quot;を使ってアクセシブルな折りたたみを実装する]]></title>
      <link>https://www.docswell.com/s/newt239/5JW6WX-introducing-hidden-until-found?ref=rss</link>
      <guid>https://www.docswell.com/s/newt239/5JW6WX-introducing-hidden-until-found</guid>
      <pubDate>Mon, 27 Jul 26 18:00:00 +0900</pubDate>
      <media:thumbnail width="640" url="https://bcdn.docswell.com/page/9J29VGGGER.jpg?width=480"/>
    </item>
  </channel>
</rss>`;

const twoItemsFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>newtの最新コンテンツ | ドクセル</title>
    <item>
      <title><![CDATA[React &amp; Next.js の話]]></title>
      <guid>https://www.docswell.com/s/newt239/AAAAAA-react</guid>
      <pubDate>Thu, 01 Jan 26 08:00:00 +0900</pubDate>
      <media:thumbnail width="640" url="https://bcdn.docswell.com/page/AAAAAA.jpg?width=480"/>
    </item>
    <item>
      <title><![CDATA[[登壇資料] 2026]]></title>
      <guid>https://www.docswell.com/s/newt239/BBBBBB-lt</guid>
      <pubDate>Wed, 31 Dec 25 23:30:00 +0900</pubDate>
      <media:thumbnail width="640" url="https://bcdn.docswell.com/page/BBBBBB.jpg"/>
    </item>
  </channel>
</rss>`;

describe("getDocswellSlides", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("RSS を整形したスライド一覧を返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(singleItemFeed),
    });

    const slides = await getDocswellSlides();

    expect(mockFetch).toHaveBeenCalledWith("https://www.docswell.com/user/newt239/feed", {
      signal: expect.any(AbortSignal),
    });
    expect(slides).toEqual([
      {
        title: 'hidden="until-found"を使ってアクセシブルな折りたたみを実装する',
        url: "https://www.docswell.com/s/newt239/5JW6WX-introducing-hidden-until-found",
        date: "2026-07-27",
        thumbnail: "https://bcdn.docswell.com/page/9J29VGGGER.jpg?width=640",
      },
    ]);
  });

  it("角かっこの見出しが無いタイトルと数字だけのタイトルをそのまま扱う", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(twoItemsFeed),
    });

    const slides = await getDocswellSlides();

    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("React & Next.js の話");
    expect(slides[1].title).toBe("2026");
  });

  it("pubDate を日本時間の日付に変換する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(twoItemsFeed),
    });

    const slides = await getDocswellSlides();

    expect(slides[0].date).toBe("2026-01-01");
    expect(slides[1].date).toBe("2025-12-31");
  });

  it("クエリの無いサムネイルにも width=640 を付ける", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue(twoItemsFeed),
    });

    const slides = await getDocswellSlides();

    expect(slides[1].thumbnail).toBe("https://bcdn.docswell.com/page/BBBBBB.jpg?width=640");
  });

  it("5xx が続く場合は 3 回試したうえでエラーを投げる", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue("Service Unavailable"),
    });

    await expect(getDocswellSlides()).rejects.toThrow(
      "Docswell のフィード取得に失敗しました (503)",
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("522 のあとに成功した場合はスライド一覧を返す", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 522,
        text: vi.fn().mockResolvedValue("error code: 522"),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(singleItemFeed),
      });

    const slides = await getDocswellSlides();

    expect(slides).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("4xx の場合は再試行せずにエラーを投げる", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue("Not Found"),
    });

    await expect(getDocswellSlides()).rejects.toThrow(
      "Docswell のフィード取得に失敗しました (404)",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("通信そのものに失敗した場合は 3 回試したうえでエラーを投げる", async () => {
    mockFetch.mockRejectedValue(new Error("The operation was aborted due to timeout"));

    await expect(getDocswellSlides()).rejects.toThrow("Docswell のフィード取得に失敗しました:");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("本文が RSS でない場合はエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("<html><body>メンテナンス中</body></html>"),
    });

    await expect(getDocswellSlides()).rejects.toThrow(
      "Docswell のフィードが RSS 形式ではありません",
    );
  });
});
