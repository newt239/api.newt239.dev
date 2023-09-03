export type ParagraphBlock = {
  type: "paragraph";
  paragraph: {
    rich_text: {
      type: "text";
      text: {
        content: string;
        link: null;
      };
    }[];
  };
};
