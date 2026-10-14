type AnnictWork = {
  annictId: number;
  title: string;
  titleEn: string | null;
  seasonName: string | null;
  seasonYear: number | null;
  image: {
    recommendedImageUrl: string | null;
    facebookOgImageUrl: string | null;
  } | null;
  episodesCount: number;
  watchersCount: number;
  officialSiteUrl: string | null;
};

type AnnictLibraryEntryNode = {
  work: AnnictWork;
  status: { state: string } | null;
  nextEpisode: { number: number | null } | null;
};

export type AnnictLibraryEntriesResponse = {
  data?: {
    viewer: {
      libraryEntries: {
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
        nodes: AnnictLibraryEntryNode[];
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

type AnnictProgramNode = {
  startedAt: string;
  channel: { name: string };
  episode: {
    annictId: number;
    number: number | null;
    numberText: string | null;
    title: string | null;
  };
  work: AnnictWork & { viewerStatusState: string | null };
};

export type AnnictProgramsResponse = {
  data?: {
    viewer: {
      programs: {
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
        nodes: AnnictProgramNode[];
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};
