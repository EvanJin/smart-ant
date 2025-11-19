/**
 * Smart Ant 配置类型定义
 * 包含 OpenAI 和 Qdrant 向量数据库的配置信息
 */
export type SmartAntConfig = {
  /** OpenAI API 密钥 */
  openaiApiKey: string;
  /** OpenAI API 基础 URL */
  openaiBaseURL: string;
  /** OpenAI 模型名称 */
  openaiModel: string;
  /** Qdrant 向量数据库 URL */
  qdrantUrl: string;
  /** Qdrant API 密钥 */
  qdrantApiKey: string;
};
