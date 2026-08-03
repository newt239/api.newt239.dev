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
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken);

    expect(result).toBe(mockAccessToken);
    expect(mockFetch).toHaveBeenCalledWith("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${mockClientId}:${mockClientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: mockRefreshToken,
      }),
    });
  });

  it("リフレッシュトークンが失効している場合はエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ error: "invalid_grant", error_description: "Refresh token revoked" }),
        ),
    });

    await expect(
      getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken),
    ).rejects.toThrow("Spotify のアクセストークン取得に失敗しました (400)");
  });

  it("レスポンスに access_token が含まれない場合はエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ token_type: "Bearer" }),
    });

    await expect(
      getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken),
    ).rejects.toThrow("Spotify のトークンレスポンスに access_token が含まれていません");
  });

  it("ネットワークエラーはそのまま伝播する", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken),
    ).rejects.toThrow("Network error");
  });

  it("JSONパースエラーはそのまま伝播する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
    });

    await expect(
      getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken),
    ).rejects.toThrow("JSON parse error");
  });

  it("正しいBasic認証ヘッダーを生成する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: "test_token" }),
    });

    await getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken);

    const expectedAuth = btoa(`${mockClientId}:${mockClientSecret}`);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`,
        }),
      }),
    );
  });

  it("正しいリクエストボディを送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: "test_token" }),
    });

    await getSpotifyAccessToken(mockClientId, mockClientSecret, mockRefreshToken);

    const expectedBody = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: mockRefreshToken,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expectedBody,
      }),
    );
  });
});
