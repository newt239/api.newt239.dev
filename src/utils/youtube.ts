import { YoutubeGetVideosResponse, YoutubeThumbnails } from "~/types/youtube";

export const getVideoInfo = async (videoId: string) => {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics`;
  const response: YoutubeGetVideosResponse = await (await fetch(url)).json();
  if (response.items && response.items[0]) {
    const snippet = response.items[0].snippet;
    const data = {
      id: response.items[0].id,
      title: snippet.title,
      description: snippet.description,
      thumbnail: getLargestYoutubeThumbnailURL(snippet.thumbnails),
    };
    return data;
  } else {
    return null;
  }
};

export const getLargestYoutubeThumbnailURL = (
  thumbnails: YoutubeThumbnails
) => {
  if (thumbnails.maxres) {
    return thumbnails.maxres.url;
  } else if (thumbnails.standard) {
    return thumbnails.standard.url;
  } else {
    return thumbnails.high.url;
  }
};
