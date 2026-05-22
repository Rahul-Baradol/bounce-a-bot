export type PromptRequest = {
  modelId: string;
  prompt: string;
  conversationId?: string | null;
};

export type Conversation = {
  id: string;
  title: string;
};

export type Message = {
  recipient: "user" | "bot";
  message: string;
};