export const getPageTitleFromUrl = async (url: string) => {
  try {
    const response = await fetch(url);
    if (response && response.ok) {
      const text = await response.text();
      const result = text.match(/<title>(.*?)<\/title>/);
      if (result) {
        return result[1];
      }
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
