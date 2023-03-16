export type Conversation = {
  id: number;
  user_id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  message: string;
  timestamp: string;
};
