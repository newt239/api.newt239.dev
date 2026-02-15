import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSpotifyAccessToken } from "./spotify";

// グローバルなfetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("getSpotifyAccessToken", () => {
  const mockClientId = "test_client_id";
  const mockClientSecret = "test_client_secret";
  const mockRefreshToken = "test_refresh_token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常にアクセストークンを取得できる", async () => {
    const mockAccessToken = "mock_access_token_12345";
    const mockResponse = {
      access_token: mockAccessToken,
      token_type: "Bearer",
      expires_in: 3600,
    };

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    expect(result).toBe(mockAccessToken);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${mockClientId}:${mockClientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: mockRefreshToken,
        }),
      }
    );
  });

  it("APIからエラーレスポンスが返された場合nullishな値を返す", async () => {
    const mockErrorResponse = {
      error: "invalid_grant",
      error_description: "Invalid refresh token",
    };

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockErrorResponse),
    });

    const result = await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    expect(result).toBeFalsy();
  });

  it("ネットワークエラーが発生した場合nullを返す", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error("Network error"));

    consoleErrorSpy.mockRestore();
  });

  it("JSONパースエラーが発生した場合nullを返す", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
    });

    const result = await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(new Error("JSON parse error"));

    consoleErrorSpy.mockRestore();
  });

  it("正しいBasic認証ヘッダーを生成する", async () => {
    const mockResponse = { access_token: "test_token" };

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    const expectedAuth = btoa(`${mockClientId}:${mockClientSecret}`);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`,
        }),
      })
    );
  });

  it("正しいリクエストボディを送信する", async () => {
    const mockResponse = { access_token: "test_token" };

    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    await getSpotifyAccessToken(
      mockClientId,
      mockClientSecret,
      mockRefreshToken
    );

    const expectedBody = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: mockRefreshToken,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expectedBody,
      })
    );
  });
});
