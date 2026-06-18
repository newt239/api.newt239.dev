import type { AnnictLibraryEntriesResponse } from "~/types/annict";

const ANNICT_GRAPHQL_ENDPOINT = "https://api.annict.com/graphql";

const LIBRARY_ENTRIES_QUERY = `
  query LibraryEntries($states: [StatusState!], $seasons: [String!], $first: Int, $after: String) {
    viewer {
      libraryEntries(states: $states, seasons: $seasons, first: $first, after: $after) {
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

export const getAnnictLibraryEntries = async (
  token: string,
  states: string[],
  first: number,
  after?: string,
  seasons?: string[],
) => {
  const res = (await fetch(ANNICT_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: LIBRARY_ENTRIES_QUERY,
      variables: { states, seasons: seasons ?? null, first, after: after ?? null },
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

export type LibraryState = "watching" | "watched" | "wanna_watch" | "on_hold" | "stop_watching";
export type LibraryOrderBy = "annictId" | "watchersCount" | "titleEn" | "season";
export type LibraryOrder = "asc" | "desc";

export type LibraryWork = {
  annictId: number;
  title: string;
  titleEn: string | null;
  seasonName: string | null;
  seasonYear: number | null;
  imageUrl: string | null;
  episodesCount: number;
  watchersCount: number;
  officialSiteUrl: string | null;
  state: string | null;
  nextEpisodeNumber: number | null;
};

export type LibraryWorksResult = {
  works: LibraryWork[];
  pageInfo: { endCursor: string | null; hasNextPage: boolean };
};

export type GetLibraryWorksParams = {
  state: LibraryState;
  orderBy?: LibraryOrderBy;
  order: LibraryOrder;
  currentSeason?: boolean;
  first: number;
  after?: string;
};

const SEASON_NAME_ORDER: Record<string, number> = {
  WINTER: 1,
  SPRING: 2,
  SUMMER: 3,
  AUTUMN: 4,
};

const getCurrentSeasonSlug = (now: Date): string => {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const name = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
  return `${year}-${name}`;
};

const orderByValue = (work: LibraryWork, orderBy: LibraryOrderBy): number | string | null => {
  switch (orderBy) {
    case "annictId":
      return work.annictId;
    case "watchersCount":
      return work.watchersCount;
    case "titleEn":
      return work.titleEn;
    case "season":
      return work.seasonYear === null
        ? null
        : work.seasonYear * 10 + (SEASON_NAME_ORDER[work.seasonName ?? ""] ?? 0);
  }
};

const sortWorks = (
  works: LibraryWork[],
  orderBy: LibraryOrderBy,
  order: LibraryOrder,
): LibraryWork[] => {
  const direction = order === "desc" ? -1 : 1;
  return [...works].sort((a, b) => {
    const av = orderByValue(a, orderBy);
    const bv = orderByValue(b, orderBy);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * direction;
    }
    return ((av as number) - (bv as number)) * direction;
  });
};

const emptyResult: LibraryWorksResult = {
  works: [],
  pageInfo: { endCursor: null, hasNextPage: false },
};

export const getLibraryWorks = async (
  token: string,
  params: GetLibraryWorksParams,
): Promise<LibraryWorksResult> => {
  const { state, orderBy, order, currentSeason, first, after } = params;

  const seasons = currentSeason ? [getCurrentSeasonSlug(new Date())] : undefined;

  const result = await getAnnictLibraryEntries(token, [state.toUpperCase()], first, after, seasons);

  if (!result || result.errors || !result.data?.viewer) {
    if (result?.errors) {
      console.error(result.errors);
    }
    return emptyResult;
  }

  const { nodes, pageInfo } = result.data.viewer.libraryEntries;

  const mappedWorks: LibraryWork[] = nodes.map((node) => ({
    annictId: node.work.annictId,
    title: node.work.title,
    titleEn: node.work.titleEn || null,
    seasonName: node.work.seasonName ?? null,
    seasonYear: node.work.seasonYear ?? null,
    imageUrl: node.work.image?.facebookOgImageUrl || node.work.image?.recommendedImageUrl || null,
    episodesCount: node.work.episodesCount,
    watchersCount: node.work.watchersCount,
    officialSiteUrl: node.work.officialSiteUrl || null,
    state: node.status?.state ?? null,
    nextEpisodeNumber: node.nextEpisode?.number ?? null,
  }));

  const works = orderBy ? sortWorks(mappedWorks, orderBy, order) : mappedWorks;

  return { works, pageInfo };
};
