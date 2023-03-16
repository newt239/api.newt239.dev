export type Message = {
  role: string;
  content: string;
};

export type OpenAiApiResponse = {
  id: string;
  object: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    message: Message;
    finish_reason: string;
    index: number;
  }[];
};

export type OpenAIApiRequest = {
  model: string;
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[];
};
