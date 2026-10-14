import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAnnictLibraryEntries, getLibraryWorks, getUnwatchedEpisodes } from "./annict";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("getAnnictLibraryEntries", () => {
  const mockToken = "test_annict_token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常にライブラリ一覧を取得できる", async () => {
    const mockResponse = {
      data: {
        viewer: {
          libraryEntries: {
            pageInfo: { endCursor: "cursor123", hasNextPage: true },
            nodes: [
              {
                work: {
                  annictId: 5680,
                  title: "ご注文はうさぎですか？",
                  titleEn: "Is the Order a Rabbit?",
                  seasonName: "SPRING",
                  seasonYear: 2014,
                  image: {
                    recommendedImageUrl: "https://example.com/rec.jpg",
                    facebookOgImageUrl: "https://example.com/og.jpg",
                  },
                  episodesCount: 12,
                  watchersCount: 3000,
                  officialSiteUrl: "https://www.gochiusa.com/",
                },
                status: { state: "WATCHING" },
                nextEpisode: {
                  number: 3,
                  numberText: "第3話",
                  title: "ひと目で、尋常でないもふもふだと見抜いたよ",
                },
              },
            ],
          },
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50);

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.annict.com/graphql",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("queryとvariablesを含むリクエストボディを送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ data: { viewer: null } }),
    });

    await getAnnictLibraryEntries(mockToken, ["WATCHED"], 10, "cursorABC");

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.query).toContain("libraryEntries");
    expect(callBody.variables).toEqual({
      states: ["WATCHED"],
      seasons: null,
      first: 10,
      after: "cursorABC",
    });
  });

  it("afterが未指定の場合はnullとして送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ data: { viewer: null } }),
    });

    await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.variables.after).toBeNull();
  });

  it("seasonsを指定するとvariablesに含めて送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ data: { viewer: null } }),
    });

    await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50, undefined, ["2026-spring"]);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.query).toContain("$seasons: [String!]");
    expect(callBody.variables.seasons).toEqual(["2026-spring"]);
  });

  it("seasonsが未指定の場合はnullとして送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ data: { viewer: null } }),
    });

    await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.variables.seasons).toBeNull();
  });

  it("ネットワークエラーが発生した場合nullを返す", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error("Network error"));

    consoleErrorSpy.mockRestore();
  });

  it("JSONパースエラーが発生した場合nullを返す", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
    });

    const result = await getAnnictLibraryEntries(mockToken, ["WATCHING"], 50);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error("JSON parse error"));

    consoleErrorSpy.mockRestore();
  });
});

describe("getLibraryWorks", () => {
  const mockToken = "test_annict_token";

  const libraryResponse = (nextEpisode: unknown) => ({
    data: {
      viewer: {
        libraryEntries: {
          pageInfo: { endCursor: null, hasNextPage: false },
          nodes: [
            {
              work: {
                annictId: 1234,
                title: "ゆるゆり♪♪",
                titleEn: null,
                seasonName: "SUMMER",
                seasonYear: 2012,
                image: null,
                episodesCount: 12,
                watchersCount: 1000,
                officialSiteUrl: null,
              },
              status: { state: "WATCHING" },
              nextEpisode,
            },
          ],
        },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("numberがnullでもnumberTextとtitleを次のエピソードとして返す", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi
        .fn()
        .mockResolvedValue(
          libraryResponse({ number: null, numberText: "第7話", title: "七森中☆ないしょ話" }),
        ),
    });

    const result = await getLibraryWorks(mockToken, { state: "watching", order: "asc", first: 50 });

    expect(result.works[0]).toMatchObject({
      nextEpisodeNumber: null,
      nextEpisodeNumberText: "第7話",
      nextEpisodeTitle: "七森中☆ないしょ話",
    });
  });

  it("次のエピソードがない場合は3項目ともnullを返す", async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(libraryResponse(null)),
    });

    const result = await getLibraryWorks(mockToken, { state: "watching", order: "asc", first: 50 });

    expect(result.works[0]).toMatchObject({
      nextEpisodeNumber: null,
      nextEpisodeNumberText: null,
      nextEpisodeTitle: null,
    });
  });
});

describe("getUnwatchedEpisodes", () => {
  const mockToken = "test_annict_token";
  const now = new Date("2026-10-14T12:00:00+09:00");

  const program = (
    episodeId: number,
    startedAt: string,
    work: { annictId: number; title: string; viewerStatusState: string },
  ) => ({
    startedAt,
    channel: { name: "TOKYO MX" },
    episode: {
      annictId: episodeId,
      number: episodeId,
      numberText: `第${episodeId}話`,
      title: null,
    },
    work: {
      ...work,
      officialSiteUrl: "",
      image: { recommendedImageUrl: "https://example.com/rec.jpg", facebookOgImageUrl: "" },
    },
  });

  const watching = { annictId: 1, title: "見てる作品", viewerStatusState: "WATCHING" };
  const wannaWatch = { annictId: 2, title: "見たい作品", viewerStatusState: "WANNA_WATCH" };

  const respond = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { viewer: { programs: { pageInfo: { endCursor, hasNextPage }, nodes } } },
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("放送済み・見てる・重複なしのエピソードだけを作品ごとに返す", async () => {
    respond([
      program(11, "2026-10-01T22:00:00+09:00", watching),
      program(21, "2026-10-02T22:00:00+09:00", wannaWatch),
      program(11, "2026-10-05T22:00:00+09:00", watching),
      program(12, "2026-10-08T22:00:00+09:00", watching),
      program(13, "2026-10-15T22:00:00+09:00", watching),
    ]);

    const result = await getUnwatchedEpisodes(mockToken, now);

    expect(result).toEqual({
      totalCount: 2,
      works: [
        {
          annictId: 1,
          title: "見てる作品",
          officialSiteUrl: null,
          imageUrl: "https://example.com/rec.jpg",
          channelName: "TOKYO MX",
          episodes: [
            {
              annictId: 11,
              number: 11,
              numberText: "第11話",
              title: null,
              startedAt: "2026-10-01T22:00:00+09:00",
            },
            {
              annictId: 12,
              number: 12,
              numberText: "第12話",
              title: null,
              startedAt: "2026-10-08T22:00:00+09:00",
            },
          ],
        },
      ],
    });
  });

  it("未放送の枠に達するまで次のページを取得する", async () => {
    respond([program(11, "2026-10-01T22:00:00+09:00", watching)], true, "cursor1");
    respond([program(12, "2026-10-08T22:00:00+09:00", watching)], true, "cursor2");
    respond([program(13, "2026-10-20T22:00:00+09:00", watching)], true, "cursor3");

    const result = await getUnwatchedEpisodes(mockToken, now);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).variables).toEqual({
      first: 100,
      after: "cursor1",
    });
    expect(result.totalCount).toBe(2);
  });

  it("Annict APIがエラーを返した場合は例外を投げる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ errors: [{ message: "Unauthorized" }] }),
    });

    await expect(getUnwatchedEpisodes(mockToken, now)).rejects.toThrow("Unauthorized");
  });

  it("HTTPステータスが失敗の場合は例外を投げる", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getUnwatchedEpisodes(mockToken, now)).rejects.toThrow("500");
  });
});
