export type OpenAiApiResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
};

export type OpenAIApiRequest = {
  model: string;
  messages: {
    role: "user" | "assistant";
    content: string;
  }[];
};
