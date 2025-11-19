# Smart Ant 架构设计

## 概述

Smart Ant 是一个基于 VSCode 的代码索引和搜索插件，采用模块化设计，使用依赖注入模式，集成了 Merkle 树、OpenAI 嵌入和 Qdrant 向量数据库。

## 技术栈

### 核心技术

- **TypeScript**: 主要开发语言
- **VSCode Extension API**: 插件开发框架
- **InversifyJS**: 依赖注入框架
- **esbuild**: 打包工具

### 外部服务

- **OpenAI API**: 文本嵌入生成（text-embedding-3-small）
- **Qdrant**: 向量数据库

### 开发工具

- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查
- **pnpm**: 包管理器

## 项目结构

```
smart-ant/
├── src/
│   ├── core/                      # 核心模块
│   │   ├── commands/              # 命令实现
│   │   │   ├── base.ts           # 命令基类
│   │   │   ├── code-indexing.ts  # 代码索引命令
│   │   │   └── search.ts         # 搜索命令
│   │   ├── config/                # 配置管理
│   │   │   ├── core.ts           # ConfigContainer
│   │   │   ├── types.ts          # 配置类型定义
│   │   │   └── index.ts          # 导出
│   │   ├── merkel/                # Merkle 树实现
│   │   │   ├── chunk.ts          # 代码分块
│   │   │   ├── node.ts           # Merkle 节点
│   │   │   ├── core.ts           # Merkle 树核心
│   │   │   ├── types.ts          # 类型定义
│   │   │   └── index.ts          # 导出
│   │   ├── openai/                # OpenAI 集成
│   │   │   ├── core.ts           # OpenAIClient
│   │   │   ├── types.ts          # 类型定义
│   │   │   └── index.ts          # 导出
│   │   ├── qdrant/                # Qdrant 集成
│   │   │   ├── core.ts           # QdrantCoreClient
│   │   │   ├── types.ts          # 类型定义
│   │   │   └── index.ts          # 导出
│   │   ├── workspace/             # 工作区管理
│   │   │   ├── core.ts           # Workspace 类
│   │   │   ├── types.ts          # 类型定义
│   │   │   └── index.ts          # 导出
│   │   └── index.ts               # DI 容器配置
│   ├── config/                    # 静态配置
│   │   └── code.ts               # 代码文件扩展名
│   ├── types/                     # 全局类型定义
│   │   └── global.d.ts
│   └── extension.ts               # 插件入口
├── docs/                          # 文档
│   ├── ARCHITECTURE.md            # 架构设计（本文档）
│   ├── CONFIGURATION.md           # 配置指南
│   ├── DEPENDENCY_INJECTION.md    # 依赖注入文档
│   ├── WORKSPACE_API.md           # Workspace API 文档
│   ├── MERKLE_TREE.md             # Merkle 树文档
│   ├── QDRANT_INTEGRATION.md      # Qdrant 集成文档
│   ├── CODE_SEARCH.md             # 代码搜索文档
│   ├── BATCH_EMBEDDING.md         # 批量嵌入文档
│   ├── MAKEFILE.md                # Makefile 使用文档
│   └── IMPLEMENTATION_SUMMARY.md  # 实现总结
├── .vscode/                       # VSCode 配置
│   ├── launch.json               # 调试配置
│   ├── tasks.json                # 任务配置
│   ├── settings.json             # 工作区设置
│   └── extensions.json           # 推荐扩展
├── build/                         # 构建产物（.vsix 文件）
├── dist/                          # 编译输出
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript 配置
├── esbuild.js                     # esbuild 配置
├── eslint.config.mjs              # ESLint 配置
├── .prettierrc                    # Prettier 配置
├── .prettierignore                # Prettier 忽略文件
├── .gitignore                     # Git 忽略文件
├── Makefile                       # 构建脚本
└── README.md                      # 项目说明
```

## 架构图

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        VSCode Extension                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Extension Entry                     │   │
│  │                  (extension.ts)                      │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Dependency Injection Container             │   │
│  │                  (InversifyJS)                       │   │
│  └───┬──────────┬──────────┬──────────┬──────────┬─────┘   │
│      │          │          │          │          │           │
│      ▼          ▼          ▼          ▼          ▼           │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │Config│  │Work- │  │OpenAI│  │Qdrant│  │Commd │         │
│  │      │  │space │  │Client│  │Client│  │ands  │         │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘         │
│                │                                              │
│                ▼                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Merkle Tree                         │   │
│  │         (Code Chunking & Hashing)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       │                    │
                       ▼                    ▼
              ┌──────────────┐    ┌──────────────┐
              │  OpenAI API  │    │   Qdrant DB  │
              │  (Embedding) │    │   (Vector)   │
              └──────────────┘    └──────────────┘
```

### 依赖关系图

```
ConfigContainer (配置管理)
    │
    ├─> OpenAIClient (OpenAI 客户端)
    │       │
    │       └─> 生成文本嵌入
    │
    └─> QdrantCoreClient (Qdrant 客户端)
            │
            └─> 向量存储和搜索

Workspace (工作区管理)
    │
    ├─> 文件遍历
    ├─> Gitignore 解析
    └─> Merkle 树构建
            │
            ├─> CodeChunker (代码分块)
            └─> MerkleNode (Merkle 节点)

Commands (命令层)
    │
    ├─> CodeIndexingCommand
    │       ├─> Workspace
    │       ├─> OpenAIClient
    │       └─> QdrantCoreClient
    │
    └─> SearchCommand
            ├─> Workspace
            ├─> OpenAIClient
            └─> QdrantCoreClient
```

## 核心模块

### 1. 配置管理 (ConfigContainer)

**职责**:
- 从 VSCode 设置读取配置
- 提供统一的配置访问接口
- 管理敏感信息（API Key）

**关键方法**:
```typescript
class ConfigContainer {
  public config: SmartAntConfig;
  constructor() {
    // 从 VSCode 设置读取配置
  }
}
```

### 2. 工作区管理 (Workspace)

**职责**:
- 文件系统遍历
- `.gitignore` 解析
- 代码文件过滤
- Merkle 树构建
- 代码块管理
- Git 仓库信息获取

**关键方法**:
```typescript
class Workspace {
  initialize(path: string, codeOnly: boolean): void
  buildCodeIndex(config?: ChunkConfig): MerkleTreeStats
  verifyCodeIndex(): boolean
  getAllCodeChunks(): CodeChunk[]
  getRepoHash(): Promise<string>
}
```

### 3. Merkle 树 (Merkle)

**职责**:
- 代码分块（CodeChunker）
- 哈希计算
- 树结构构建
- 完整性验证

**组件**:
- `CodeChunker`: 将代码文件分割成块
- `MerkleNode`: Merkle 树节点
- `Merkle`: Merkle 树核心逻辑

**关键特性**:
- SHA256 哈希
- 可配置的块大小
- 行重叠支持
- 树结构验证

### 4. OpenAI 集成 (OpenAIClient)

**职责**:
- 文本嵌入生成
- 批量处理
- 进度回调
- 错误处理

**关键方法**:
```typescript
class OpenAIClient {
  initialize(config?: OpenAIConfig): OpenAIClient
  createEmbedding(text: string): Promise<number[]>
  createEmbeddings(
    texts: string[],
    batchSize: number,
    onProgress?: ProgressCallback
  ): Promise<number[][]>
}
```

**特性**:
- 懒加载初始化
- 批量处理（默认 100 个/批）
- 进度回调支持
- 自动重试机制

### 5. Qdrant 集成 (QdrantCoreClient)

**职责**:
- 向量数据库连接
- 集合管理
- 批量插入
- 向量搜索

**关键方法**:
```typescript
class QdrantCoreClient {
  initialize(): Promise<void>
  setCollectionName(name: string): void
  batchInsertChunks(chunks: CodeChunk[]): Promise<BatchInsertResult>
  searchByText(query: string, limit: number): Promise<SearchResult[]>
  searchSimilar(embedding: number[], limit: number): Promise<CodeChunk[]>
  hybridSearch(query: string, filters: Filters): Promise<SearchResult[]>
}
```

**特性**:
- 动态集合命名（基于仓库哈希）
- 批量插入（默认 100 个/批）
- 多种搜索模式（文本、向量、混合）
- 自动集合创建

### 6. 命令层 (Commands)

**职责**:
- VSCode 命令注册
- 用户交互
- 进度显示
- 错误处理

**命令**:
- `CodeIndexingCommand`: 构建代码索引
- `SearchCommand`: 搜索代码

**基类**:
```typescript
abstract class BaseCommand {
  abstract command: string;
  abstract execute(): vscode.Disposable;
}
```

## 数据流

### 代码索引流程

```
1. 用户触发命令
   └─> smart-ant.codeIndexing

2. 获取工作区信息
   └─> Workspace.getRepoHash()
   └─> 设置 Qdrant 集合名称

3. 构建代码索引
   └─> Workspace.buildCodeIndex()
       ├─> 遍历代码文件
       ├─> CodeChunker.chunkFile()
       │   └─> 生成 CodeChunk[]
       └─> Merkle.buildTree()
           └─> 计算哈希树

4. 生成嵌入向量
   └─> OpenAIClient.createEmbeddings()
       ├─> 批量处理（100个/批）
       ├─> 调用 OpenAI API
       └─> 返回 number[][]

5. 存储到 Qdrant
   └─> QdrantCoreClient.batchInsertChunks()
       ├─> 批量插入（100个/批）
       └─> 返回插入结果

6. 显示结果
   └─> vscode.window.showInformationMessage()
```

### 代码搜索流程

```
1. 用户输入查询
   └─> vscode.window.showInputBox()

2. 生成查询嵌入
   └─> OpenAIClient.createEmbedding(query)

3. 向量搜索
   └─> QdrantCoreClient.searchByText()
       ├─> 生成查询向量
       ├─> Qdrant 相似度搜索
       └─> 返回 SearchResult[]

4. 格式化结果
   └─> 生成 Markdown 文档

5. 显示结果
   └─> vscode.workspace.openTextDocument()
   └─> vscode.window.showTextDocument()
```

## 设计模式

### 1. 依赖注入 (Dependency Injection)

使用 InversifyJS 实现：
- **优势**: 松耦合、可测试、易维护
- **应用**: 所有核心服务都通过 DI 容器管理
- **生命周期**: 默认单例模式

### 2. 两阶段初始化 (Two-Phase Initialization)

用于需要参数的服务：
```typescript
// 阶段 1: 构造（由 DI 容器）
const workspace = container.get(Workspace);

// 阶段 2: 初始化（由应用代码）
workspace.initialize(path, codeOnly);
```

### 3. 懒加载 (Lazy Loading)

用于重量级资源：
```typescript
private ensureClient(): void {
  if (!this.client) {
    this.client = new QdrantClient({...});
  }
}
```

### 4. 命令模式 (Command Pattern)

所有 VSCode 命令都继承自 `BaseCommand`：
```typescript
abstract class BaseCommand {
  abstract command: string;
  abstract execute(): vscode.Disposable;
}
```

### 5. 策略模式 (Strategy Pattern)

代码分块策略可配置：
```typescript
interface ChunkConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapLines?: number;
}
```

## 性能优化

### 1. 批量处理

**OpenAI 嵌入生成**:
- 批量大小: 100 个文本/批
- 并发控制: 顺序处理批次
- 错误处理: 批次失败时降级为单个处理

**Qdrant 插入**:
- 批量大小: 100 个点/批
- 使用 `upsert` 支持更新
- 等待确认: `wait: true`

### 2. 懒加载

- OpenAI 客户端在首次使用时初始化
- Qdrant 客户端在首次使用时初始化
- Merkle 树按需构建

### 3. 增量更新（未来）

- 文件变更检测
- 只更新变更的代码块
- Merkle 树增量更新

### 4. 缓存（未来）

- 嵌入向量缓存
- Merkle 树缓存
- 搜索结果缓存

## 安全性

### 1. 敏感信息管理

- API Key 不存储在代码中
- 使用 VSCode 设置或环境变量
- `.gitignore` 排除配置文件

### 2. 输入验证

- 用户输入清理
- 文件路径验证
- API 响应验证

### 3. 错误处理

- 捕获所有异常
- 用户友好的错误消息
- 详细的日志记录

## 可扩展性

### 1. 模块化设计

- 每个功能独立模块
- 清晰的接口定义
- 低耦合高内聚

### 2. 插件化架构

- 命令可独立添加
- 服务可替换实现
- 配置可扩展

### 3. 未来扩展方向

- 支持更多嵌入模型
- 支持更多向量数据库
- 增量索引
- 实时搜索
- 代码推荐
- 智能补全

## 测试策略

### 1. 单元测试

- 每个模块独立测试
- Mock 外部依赖
- 覆盖核心逻辑

### 2. 集成测试

- 测试模块间交互
- 测试外部服务集成
- 端到端测试

### 3. 手动测试

- VSCode 插件调试
- 实际项目测试
- 性能测试

## 构建和部署

### 1. 开发环境

```bash
# 安装依赖
make install

# 开发模式（监听）
make dev

# 运行测试
make test
```

### 2. 构建

```bash
# 完整构建
make build

# 类型检查
make check-types

# 代码检查
make lint

# 代码格式化
make format
```

### 3. 打包

```bash
# 打包插件
make package

# 快速打包（跳过清理和安装）
make quick-package
```

### 4. 发布准备

```bash
# 完整发布流程
make release
```

## 相关文档

- [配置指南](./CONFIGURATION.md)
- [依赖注入架构](./DEPENDENCY_INJECTION.md)
- [Workspace API](./WORKSPACE_API.md)
- [Merkle 树实现](./MERKLE_TREE.md)
- [Qdrant 集成](./QDRANT_INTEGRATION.md)
- [代码搜索](./CODE_SEARCH.md)
- [批量嵌入优化](./BATCH_EMBEDDING.md)
- [Makefile 使用](./MAKEFILE.md)

## 更新日志

- **v0.0.1**: 初始架构设计
- **v0.0.2**: 引入依赖注入
- **v0.0.3**: 批量处理优化
- **v0.0.4**: 添加代码格式化

