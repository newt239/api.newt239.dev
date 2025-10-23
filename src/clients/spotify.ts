import { SpotifyApi } from "@spotify/web-api-ts-sdk";

export const createSpotifyClient = (clientId: string, clientSecret: string) => {
  const sdk = SpotifyApi.withClientCredentials(clientId, clientSecret);
  return sdk;
};
