import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAnnictLibraryEntries } from "./annict";

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
                nextEpisode: { number: 3 },
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
