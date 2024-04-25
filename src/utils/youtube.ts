import { YoutubeGetVideosResponse, YoutubeThumbnails } from "~/types/youtube";

export const getYoutubeVideoId = (url: string) => {
  const regex =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regex);
  return match && match[7].length === 11 ? match[7] : null;
};

export const getVideoInfo = async (videoId: string, apiKey: string) => {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
  const response = (await (
    await fetch(url)
  ).json()) as YoutubeGetVideosResponse;
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

const getLargestYoutubeThumbnailURL = (thumbnails: YoutubeThumbnails) => {
  if (thumbnails.maxres) {
    return thumbnails.maxres.url;
  } else if (thumbnails.standard) {
    return thumbnails.standard.url;
  } else {
    return thumbnails.high.url;
  }
};
