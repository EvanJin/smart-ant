import OpenAI from "openai";
import * as vscode from "vscode";

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

/**
 * OpenAI 客户端类
 */
class OpenAIClient {
  private client: OpenAI | null = null;

  private config: OpenAIConfig = {
    model: "text-embedding-3-small",
    temperature: 0.7,
    maxTokens: 2000,
  };

  /**
   * 初始化 OpenAI 客户端
   */
  public initialize(config?: OpenAIConfig): OpenAIClient {
    // 从配置或环境变量获取 API Key
    const apiKey =
      config?.apiKey ||
      vscode.workspace
        .getConfiguration("smart-ant")
        .get<string>("openaiApiKey") ||
      process.env.OPENAI_API_KEY;

    const baseURL =
      config?.baseURL ||
      vscode.workspace
        .getConfiguration("smart-ant")
        .get<string>("openaiBaseURL") ||
      process.env.OPENAI_BASE_URL;

    const model =
      config?.model ||
      vscode.workspace
        .getConfiguration("smart-ant")
        .get<string>("openaiModel") ||
      "text-embedding-3-small";

    if (!apiKey) {
      console.warn(
        `OpenAI API Key 未配置。请在 VSCode 设置中配置 smart-ant.openaiApiKey 或设置环境变量 OPENAI_API_KEY, 当前配置的 API Key: ${apiKey}`
      );
      throw new Error(
        `OpenAI API Key 未配置。请在 VSCode 设置中配置 smart-ant.openaiApiKey 或设置环境变量 OPENAI_API_KEY`
      );
    }

    // 合并配置
    this.config = { ...this.config, ...config, apiKey, baseURL, model };

    // 创建客户端
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    console.log("OpenAI 客户端初始化成功");

    return this;
  }

  /**
   * 检查客户端是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error("OpenAI 客户端未初始化，请先调用 initialize()");
    }
  }

  /**
   * 创建文本嵌入
   * @param text - 文本
   * @returns 文本嵌入向量
   */
  public async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client!.embeddings.create({
      model: this.config.model!,
      input: text,
    });
    return response.data[0].embedding;
  }
}

// 导出单例
export default new OpenAIClient();
