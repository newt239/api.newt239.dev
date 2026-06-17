import type { AnnictLibraryEntriesResponse } from "~/types/annict";

const ANNICT_GRAPHQL_ENDPOINT = "https://api.annict.com/graphql";

const LIBRARY_ENTRIES_QUERY = `
  query LibraryEntries($states: [StatusState!], $first: Int, $after: String) {
    viewer {
      libraryEntries(states: $states, first: $first, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          work {
            annictId
            title
            titleEn
            seasonName
            seasonYear
            image {
              recommendedImageUrl
              facebookOgImageUrl
            }
            episodesCount
            watchersCount
            officialSiteUrl
          }
          status {
            state
          }
          nextEpisode {
            number
          }
        }
      }
    }
  }
`;

/**
 * Annict GraphQL APIから視聴ライブラリ（指定ステータスの作品一覧）を取得する。
 * 失敗時はnullを返す。
 */
export const getAnnictLibraryEntries = async (
  token: string,
  states: string[],
  first: number,
  after?: string,
) => {
  const res = (await fetch(ANNICT_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: LIBRARY_ENTRIES_QUERY,
      variables: { states, first, after: after ?? null },
    }),
  })
    .then((r) => {
      return r.json();
    })
    .catch((err) => {
      console.error(err);
      return null;
    })) as AnnictLibraryEntriesResponse | null;
  return res;
};
