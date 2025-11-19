# Smart Ant

代码索引 VSCode 插件 - 基于 Merkle 树的代码分块和索引系统

## 简介

Smart Ant 是一个 VSCode 插件，基于 OpenAI 的 text-embedding-3-small 模型和 Qdrant 向量数据库, 提供基于 Merkle 树的代码索引功能。它可以将代码库智能分割成可管理的代码块（chunks），并通过 Merkle 树进行组织和验证，为代码搜索、分析和 AI 辅助编程提供基础设施。

## 核心功能
- **代码分块**：自动将代码文件分割成合适大小的代码块
- **Merkle 树**：使用哈希树结构组织和验证代码完整性
- **向量数据库**：使用 Qdrant 存储代码块的向量数据
- **快速搜索**：在代码块级别进行内容搜索
- **完整性验证**：通过 SHA256 哈希确保代码完整性

## 快速开始

### 安装

1. 克隆仓库：
```bash
git clone https://github.com/EvanJin/smart-ant.git
cd smart-ant
```

2. 安装依赖：
```bash
pnpm install
```

3. 启动调试：
- 按 `F5` 启动插件开发模式

### 使用

1. 打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）
2. 输入 "Smart Ant: 代码索引"
3. 查看调试控制台的输出

## 命令

- **Smart Ant: 代码索引** - 构建当前工作区的代码索引
- **Smart Ant: 搜索代码** - 搜索当前工作区的代码块

## 编程接口

```typescript
import Workspace from "@/core/workspace";

// 创建工作区实例
const workspace = new Workspace(projectPath, true);

// 构建代码索引
const stats = workspace.buildCodeIndex({
  maxChunkSize: 4096,  // 最大块大小
  minChunkSize: 512,   // 最小块大小
  overlapLines: 2,     // 重叠行数
});

// 搜索代码块
const results = workspace.searchCodeChunks("import");

// 验证索引完整性
const isValid = workspace.verifyCodeIndex();
```

## 技术架构

```
┌─────────────────────────────────────────┐
│           Workspace                     │
│  ┌───────────────────────────────────┐  │
│  │         Merkle Tree               │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │      Root Node              │  │  │
│  │  │   (整个代码库的哈希)         │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  │             │                      │  │
│  │    ┌────────┴────────┐            │  │
│  │    ▼                 ▼            │  │
│  │  File Node       File Node        │  │
│  │    │                 │            │  │
│  │  ┌─┴─┐             ┌─┴─┐          │  │
│  │  ▼   ▼             ▼   ▼          │  │
│  │ Chunk Chunk       Chunk Chunk     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 支持的语言

支持 60+ 种编程语言，包括：
- JavaScript/TypeScript
- Python
- Java/Kotlin
- C/C++/C#
- Go, Rust, PHP, Ruby
- Swift, Objective-C
- Shell, SQL
- HTML, CSS, Vue, Svelte
- 配置文件（JSON, YAML, XML 等）
- 以及更多...

## 配置

### 分块配置

```typescript
{
  maxChunkSize: 4096,    // 最大块大小（字节）
  minChunkSize: 512,     // 最小块大小（字节）
  overlapLines: 2,       // 重叠行数
}
```

## 应用场景

1. **代码搜索** - 快速定位包含特定内容的代码块
2. **增量分析** - 通过哈希比对检测代码变化
3. **AI 辅助编程** - 将代码块作为 AI 模型的输入
4. **代码审查** - 按代码块进行审查和注释
5. **版本控制** - 跟踪代码块级别的变更
6. **代码分析** - 对代码块进行静态分析

## 文档

- [Merkle 树技术文档](./docs/MERKLE_TREE.md)
- [使用示例](./docs/USAGE_EXAMPLE.md)
- [实现总结](./docs/IMPLEMENTATION_SUMMARY.md)
- [工作区 API](./docs/WORKSPACE_API.md)
- [支持的文件类型](./docs/CODE_FILE_TYPES.md)

## 开发

### 使用 Makefile（推荐）

```bash
# 查看所有可用命令
make help

# 安装依赖
make install

# 编译项目
make build

# 监听模式
make watch

# 打包插件
make package

# 完整构建流程
make all

# 清理构建产物
make clean
```

详细说明请查看 [Makefile 使用指南](./docs/MAKEFILE.md)

### 使用 npm scripts

```bash
# 安装依赖
pnpm install

# 编译
pnpm run compile

# 监听模式
pnpm run watch

# 运行测试
pnpm run test

# 打包
pnpm run vsce:package
```

## 技术栈

- **TypeScript** - 类型安全的开发
- **VSCode Extension API** - 插件开发
- **Node.js** - 运行时环境
- **crypto** - SHA256 哈希计算
- **ignore** - gitignore 规则解析

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

EvanJin

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md)

---

**Enjoy coding with Smart Ant! 🐜**
