# Smart Ant 配置指南

## 概述

Smart Ant 使用 VSCode 的配置系统来管理 OpenAI 和 Qdrant 的连接信息。所有敏感信息（如 API Key）都需要用户自行配置。

## 必需配置

### OpenAI 配置

Smart Ant 使用 OpenAI API 来生成代码块的文本嵌入向量。

#### 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `smart-ant.openaiApiKey` | string | "" | OpenAI API Key（必需） |
| `smart-ant.openaiBaseURL` | string | "" | OpenAI API Base URL（可选） |
| `smart-ant.openaiModel` | string | "text-embedding-3-small" | 使用的嵌入模型 |
| `smart-ant.openaiTemperature` | number | 0.7 | 温度参数（0-2） |

#### 支持的模型

- `text-embedding-3-small` - 推荐，性价比高
- `text-embedding-3-large` - 更高质量，成本更高

### Qdrant 配置

Smart Ant 使用 Qdrant 向量数据库来存储和搜索代码块。

#### 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `smart-ant.qdrantUrl` | string | "" | Qdrant 服务器 URL（必需） |
| `smart-ant.qdrantApiKey` | string | "" | Qdrant API Key（必需） |

## 配置方法

### 方法 1: VSCode 设置界面

1. 打开 VSCode 设置（`Cmd+,` / `Ctrl+,`）
2. 搜索 "Smart Ant"
3. 填写相应的配置项

### 方法 2: settings.json

在用户设置或工作区设置中添加：

```json
{
  "smart-ant.openaiApiKey": "your-openai-api-key",
  "smart-ant.openaiBaseURL": "https://api.openai.com/v1",
  "smart-ant.openaiModel": "text-embedding-3-small",
  "smart-ant.qdrantUrl": "http://localhost:6333",
  "smart-ant.qdrantApiKey": "your-qdrant-api-key"
}
```

### 方法 3: 环境变量

也可以通过环境变量配置：

```bash
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

**注意**: VSCode 配置优先级高于环境变量。

## 获取 API Key

### OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录或注册账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制并保存（只显示一次）

### Qdrant

#### 云服务

1. 访问 [Qdrant Cloud](https://cloud.qdrant.io/)
2. 注册并创建集群
3. 获取集群 URL 和 API Key

#### 本地部署

使用 Docker 快速启动：

```bash
docker run -p 6333:6333 qdrant/qdrant
```

本地部署默认不需要 API Key，URL 为 `http://localhost:6333`。

## 安全建议

### ⚠️ 不要将 API Key 提交到代码仓库

**错误做法** ❌:
```json
// package.json
{
  "smart-ant.openaiApiKey": {
    "default": "sk-proj-xxxxx"  // 不要这样做！
  }
}
```

**正确做法** ✅:
```json
// package.json
{
  "smart-ant.openaiApiKey": {
    "default": ""  // 保持为空
  }
}
```

### 使用工作区配置

对于团队项目，可以在 `.vscode/settings.json` 中配置非敏感信息：

```json
{
  "smart-ant.openaiModel": "text-embedding-3-small",
  "smart-ant.openaiBaseURL": "https://your-company-proxy.com/v1"
}
```

然后将敏感信息添加到 `.gitignore`:

```
.vscode/settings.json
```

或者使用单独的 `.vscode/settings.local.json`（需要在 .gitignore 中忽略）。

### 使用环境变量

对于 CI/CD 环境，推荐使用环境变量：

```bash
# .env (添加到 .gitignore)
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=your-url
```

## 配置验证

启动插件后，可以通过以下方式验证配置：

1. 打开 VSCode 开发者工具（`Help` > `Toggle Developer Tools`）
2. 查看 Console 输出
3. 运行 "Smart Ant: 代码索引" 命令
4. 检查是否有配置错误提示

## 故障排查

### API Key 无效

**错误信息**:
```
OpenAI API Key 未配置
```

**解决方案**:
1. 检查配置是否正确填写
2. 确认 API Key 是否有效
3. 检查 API Key 是否有足够的配额

### 连接失败

**错误信息**:
```
Qdrant 客户端初始化失败
```

**解决方案**:
1. 检查 Qdrant URL 是否正确
2. 确认网络连接正常
3. 验证 API Key 是否有效
4. 检查防火墙设置

### 模型不支持

**错误信息**:
```
Model not found
```

**解决方案**:
1. 确认使用的模型名称正确
2. 检查 API Key 是否有权限访问该模型
3. 尝试使用默认模型 `text-embedding-3-small`

## 高级配置

### 自定义 Base URL

如果使用代理或自定义 OpenAI 兼容服务：

```json
{
  "smart-ant.openaiBaseURL": "https://your-proxy.com/v1"
}
```

### 批量处理大小

目前批量处理大小硬编码为 100，未来版本将支持配置：

```typescript
// 未来版本
{
  "smart-ant.batchSize": 100
}
```

### 向量维度

不同模型的向量维度：

- `text-embedding-3-small`: 1536 维
- `text-embedding-3-large`: 3072 维

系统会自动根据模型调整。

## 相关文档

- [Makefile 使用指南](./MAKEFILE.md)
- [Qdrant 集成文档](./QDRANT_INTEGRATION.md)
- [批量 Embedding 优化](./BATCH_EMBEDDING.md)

## 更新日志

- **v0.0.1**: 初始版本，基本配置支持
- **v0.0.2**: 移除默认 API Key，增强安全性

