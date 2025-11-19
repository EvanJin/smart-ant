# 依赖注入架构

## 概述

Smart Ant 使用 [InversifyJS](https://inversify.io/) 作为依赖注入（DI）框架，实现了松耦合、可测试的架构设计。

## 为什么使用依赖注入？

### 优势

1. **松耦合**: 组件之间通过接口依赖，而非具体实现
2. **可测试性**: 可以轻松注入 Mock 对象进行单元测试
3. **可维护性**: 依赖关系清晰，易于理解和修改
4. **单例管理**: 自动管理单例生命周期
5. **类型安全**: TypeScript 装饰器提供编译时类型检查

## 核心概念

### 容器 (Container)

容器是依赖注入的核心，负责创建和管理所有服务实例。

```typescript
// src/core/index.ts
import { Container } from "inversify";

const container = new Container({
  defaultScope: "Singleton", // 默认单例模式
});

export default container;
```

### 装饰器

#### @injectable

标记一个类可以被容器管理：

```typescript
import { injectable } from "inversify";

@injectable()
export class Workspace {
  constructor() {
    // 无参数构造函数
  }
}
```

#### @inject

注入依赖到构造函数：

```typescript
import { inject, injectable } from "inversify";

@injectable()
export class CodeIndexingCommand {
  constructor(
    @inject(Workspace) private readonly workspace: Workspace,
    @inject(OpenAIClient) private readonly openaiClient: OpenAIClient,
    @inject(QdrantCoreClient) private readonly qdrantClient: QdrantCoreClient
  ) {}
}
```

## 项目架构

### 依赖关系图

```
Container
  ├─ ConfigContainer (配置管理)
  ├─ OpenAIClient (OpenAI 客户端)
  │   └─ depends on: ConfigContainer
  ├─ QdrantCoreClient (Qdrant 客户端)
  │   └─ depends on: ConfigContainer
  ├─ Workspace (工作区管理)
  ├─ CodeIndexingCommand (代码索引命令)
  │   ├─ depends on: Workspace
  │   ├─ depends on: OpenAIClient
  │   └─ depends on: QdrantCoreClient
  └─ SearchCommand (搜索命令)
      ├─ depends on: Workspace
      ├─ depends on: OpenAIClient
      └─ depends on: QdrantCoreClient
```

### 容器配置

```typescript
// src/core/index.ts
import { Container } from "inversify";
import { ConfigContainer } from "@/core/config";
import { OpenAIClient } from "@/core/openai";
import { QdrantCoreClient } from "@/core/qdrant";
import { Workspace } from "@/core/workspace";
import { CodeIndexingCommand } from "@/core/commands/code-indexing";
import { SearchCommand } from "@/core/commands/search";

const container = new Container({
  defaultScope: "Singleton",
});

// 绑定核心组件
container.bind(ConfigContainer).toSelf();
container.bind(OpenAIClient).toSelf();
container.bind(QdrantCoreClient).toSelf();
container.bind(Workspace).toSelf();

// 绑定命令
container.bind(CodeIndexingCommand).toSelf();
container.bind(SearchCommand).toSelf();

export default container;
```

## 核心组件

### ConfigContainer

配置管理容器，负责从 VSCode 设置读取配置。

```typescript
@injectable()
export class ConfigContainer {
  public config: SmartAntConfig;

  constructor() {
    const configure = vscode.workspace.getConfiguration("smart-ant");
    this.config = {
      openaiApiKey: configure.get("openaiApiKey") || "",
      openaiBaseURL: configure.get("openaiBaseURL") || "",
      openaiModel: configure.get("openaiModel") || "",
      qdrantUrl: configure.get("qdrantUrl") || "",
      qdrantApiKey: configure.get("qdrantApiKey") || "",
    };
  }
}
```

### Workspace

工作区管理类，负责文件遍历和代码索引。

```typescript
@injectable()
export class Workspace {
  private path: string = "";
  private ig: ReturnType<typeof ignore> | null = null;
  private codeOnly: boolean = false;
  private merkle: Merkle | null = null;

  constructor() {
    // 构造函数为空，使用 initialize 方法初始化
  }

  initialize(path: string, codeOnly: boolean = false) {
    this.path = path;
    this.codeOnly = codeOnly;
    this.loadGitignore();
  }

  // ... 其他方法
}
```

**注意**: `Workspace` 使用两阶段初始化：
1. 构造函数：由 DI 容器调用，无参数
2. `initialize()`: 由应用代码调用，传入实际参数

### OpenAIClient

OpenAI 客户端，负责生成文本嵌入。

```typescript
@injectable()
export class OpenAIClient {
  private client: OpenAI | null = null;
  private config: OpenAIConfig = {
    model: "text-embedding-3-small",
    temperature: 0.7,
    maxTokens: 2000,
  };

  public initialize(config?: OpenAIConfig): OpenAIClient {
    // 初始化逻辑
    return this;
  }

  private ensureInitialized(): void {
    if (!this.client) {
      this.initialize();
    }
  }

  // ... 其他方法
}
```

### QdrantCoreClient

Qdrant 客户端，负责向量数据库操作。

```typescript
@injectable()
export class QdrantCoreClient {
  private client: QdrantClient;
  private collectionName: string = "smart-ant-code-chunks";
  private isInitialized: boolean = false;

  @inject(ConfigContainer) 
  private readonly configContainer!: ConfigContainer;

  constructor() {
    // 客户端将在第一次使用时初始化
    this.client = null as any;
  }

  private ensureClient(): void {
    if (!this.client) {
      this.client = new QdrantClient({
        url: this.configContainer.config.qdrantUrl,
        apiKey: this.configContainer.config.qdrantApiKey,
      });
    }
  }

  // ... 其他方法
}
```

**注意**: 使用懒加载模式，只在需要时才初始化客户端。

### 命令类

所有命令都继承自 `BaseCommand`：

```typescript
export abstract class BaseCommand {
  abstract command: string;
  abstract execute(): vscode.Disposable;
}
```

示例：

```typescript
@injectable()
export class CodeIndexingCommand extends BaseCommand {
  command = "smart-ant.codeIndexing";

  constructor(
    @inject(Workspace) private readonly workspace: Workspace,
    @inject(QdrantCoreClient) private readonly qdrantClient: QdrantCoreClient,
    @inject(OpenAIClient) private readonly openaiClient: OpenAIClient
  ) {
    super();
  }

  execute() {
    return vscode.commands.registerCommand(this.command, async () => {
      // 命令逻辑
    });
  }
}
```

## 使用方式

### 在 extension.ts 中使用

```typescript
import "reflect-metadata"; // 必须在最顶部导入
import * as vscode from "vscode";
import container from "@/core";
import { Workspace } from "@/core/workspace";
import { CodeIndexingCommand } from "@/core/commands/code-indexing";
import { SearchCommand } from "@/core/commands/search";

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("Smart Ant: 未检测到打开的工作区");
    return;
  }

  // 初始化 Workspace
  container.get(Workspace).initialize(workspaceFolders[0].uri.fsPath, true);

  // 注册命令
  const codeIndexingCommand = container.get<CodeIndexingCommand>(CodeIndexingCommand);
  context.subscriptions.push(codeIndexingCommand.execute());

  const searchCodeCommand = container.get<SearchCommand>(SearchCommand);
  context.subscriptions.push(searchCodeCommand.execute());
}
```

### 获取服务实例

```typescript
// 从容器获取单例
const workspace = container.get(Workspace);
const openaiClient = container.get(OpenAIClient);
const qdrantClient = container.get(QdrantCoreClient);
```

## TypeScript 配置

### tsconfig.json

必须启用装饰器支持：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### esbuild 配置

使用 `esbuild-plugin-tsc` 来支持装饰器元数据：

```javascript
const esbuild = require("esbuild");
const esbuildPluginTsc = require("esbuild-plugin-tsc");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    target: "es2020",
    plugins: [
      esbuildPluginTsc({
        force: true,
      }),
      // ... 其他插件
    ],
  });
  // ...
}
```

## 常见问题

### 1. 找不到装饰器元数据

**错误**:
```
Found unexpected missing metadata on type "Workspace"
```

**原因**: 
- 未导入 `reflect-metadata`
- TypeScript 配置未启用装饰器
- esbuild 未配置装饰器支持

**解决方案**:
1. 在 `extension.ts` 顶部导入: `import "reflect-metadata";`
2. 检查 `tsconfig.json` 配置
3. 确认 `esbuild.js` 使用了 `esbuild-plugin-tsc`

### 2. 构造函数参数错误

**错误**:
```
constructor requires at least 1 arguments, found 0 instead
```

**原因**: 
构造函数有必需参数，但 DI 容器无法提供。

**解决方案**:
使用两阶段初始化：
```typescript
@injectable()
export class MyService {
  constructor() {
    // 无参数构造函数
  }

  initialize(param: string) {
    // 实际初始化逻辑
  }
}

// 使用
const service = container.get(MyService);
service.initialize("value");
```

### 3. 循环依赖

**错误**:
```
Circular dependency detected
```

**解决方案**:
1. 重新设计依赖关系
2. 使用懒加载
3. 引入中介者模式

### 4. 命令未注册

**错误**:
```
command 'smart-ant.codeIndexing' not found
```

**原因**:
- `execute()` 方法未返回 `Disposable`
- 命令未添加到 `context.subscriptions`

**解决方案**:
```typescript
execute() {
  return vscode.commands.registerCommand(this.command, async () => {
    // 命令逻辑
  });
}

// 在 activate 中
const disposable = command.execute();
context.subscriptions.push(disposable);
```

## 最佳实践

### 1. 单一职责

每个服务只负责一个明确的功能：
- `ConfigContainer`: 配置管理
- `OpenAIClient`: OpenAI API 交互
- `QdrantCoreClient`: Qdrant 数据库操作
- `Workspace`: 工作区文件管理

### 2. 依赖最小化

只注入真正需要的依赖：

```typescript
// ❌ 不好
@injectable()
export class MyCommand {
  constructor(
    @inject(Workspace) private workspace: Workspace,
    @inject(OpenAIClient) private openai: OpenAIClient,
    @inject(QdrantCoreClient) private qdrant: QdrantCoreClient,
    @inject(ConfigContainer) private config: ConfigContainer // 不需要
  ) {}
}

// ✅ 好
@injectable()
export class MyCommand {
  constructor(
    @inject(Workspace) private workspace: Workspace,
    @inject(OpenAIClient) private openai: OpenAIClient
  ) {}
}
```

### 3. 懒加载

对于重量级资源，使用懒加载：

```typescript
@injectable()
export class HeavyService {
  private resource: HeavyResource | null = null;

  private ensureResource(): void {
    if (!this.resource) {
      this.resource = new HeavyResource();
    }
  }

  public doSomething(): void {
    this.ensureResource();
    this.resource!.process();
  }
}
```

### 4. 接口隔离

使用接口定义依赖：

```typescript
// types.ts
export interface IEmbeddingService {
  createEmbedding(text: string): Promise<number[]>;
}

// openai.ts
@injectable()
export class OpenAIClient implements IEmbeddingService {
  async createEmbedding(text: string): Promise<number[]> {
    // 实现
  }
}

// 使用
constructor(
  @inject(OpenAIClient) private embedder: IEmbeddingService
) {}
```

### 5. 测试友好

为测试提供 Mock 实现：

```typescript
// test/mocks.ts
@injectable()
export class MockOpenAIClient extends OpenAIClient {
  async createEmbedding(text: string): Promise<number[]> {
    return new Array(1536).fill(0);
  }
}

// test/setup.ts
const testContainer = new Container();
testContainer.bind(OpenAIClient).to(MockOpenAIClient);
```

## 相关文档

- [配置指南](./CONFIGURATION.md)
- [Makefile 使用](./MAKEFILE.md)
- [InversifyJS 官方文档](https://inversify.io/)

## 更新日志

- **v0.0.1**: 引入 InversifyJS 依赖注入框架
- **v0.0.2**: 优化懒加载和两阶段初始化

