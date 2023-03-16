export type OpenAIChatRequestParams = {
  message: string;
  user_id?: string;
  session_id?: string;
};

export type OpenAIChatWithLogsRequestParams = {
  messages: {
    role: "user" | "assistant";
    content: string;
  }[];
};
