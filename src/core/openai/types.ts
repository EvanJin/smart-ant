/**
 * OpenAI 配置接口
 */
export interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
