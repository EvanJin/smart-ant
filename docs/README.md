# Smart Ant 文档索引

欢迎查阅 Smart Ant 的完整文档！

## 📚 文档导航

### 🏗️ 核心文档

#### [架构设计](./ARCHITECTURE.md)
项目的整体架构设计，包括技术栈、模块划分、数据流、设计模式等。

**适合人群**: 想要深入了解项目架构的开发者

**主要内容**:
- 技术栈介绍
- 项目结构
- 架构图和依赖关系
- 核心模块详解
- 数据流程
- 设计模式
- 性能优化策略

#### [配置指南](./CONFIGURATION.md)
OpenAI 和 Qdrant 的配置说明，包括如何获取 API Key、配置方法、安全建议等。

**适合人群**: 首次使用插件的用户

**主要内容**:
- 必需配置项
- 配置方法（VSCode 设置、环境变量）
- 如何获取 API Key
- 安全建议
- 故障排查

#### [依赖注入](./DEPENDENCY_INJECTION.md)
InversifyJS 依赖注入框架的使用指南，包括核心概念、项目架构、最佳实践等。

**适合人群**: 想要理解或扩展项目的开发者

**主要内容**:
- 为什么使用依赖注入
- 核心概念（容器、装饰器）
- 项目架构和依赖关系
- 核心组件详解
- TypeScript 和 esbuild 配置
- 常见问题和最佳实践

---

### 📖 API 文档

#### [Workspace API](./WORKSPACE_API.md)
工作区管理 API 的完整文档，包括文件遍历、代码索引、Merkle 树构建等。

**适合人群**: 想要使用 Workspace API 的开发者

**主要内容**:
- 依赖注入使用
- API 方法详解
- 数据类型定义
- 使用示例
- VSCode 命令
- 注意事项和错误处理

#### [Merkle 树](./MERKLE_TREE.md)
Merkle 树的实现详解，包括代码分块、哈希计算、树结构构建等。

**适合人群**: 想要了解 Merkle 树实现的开发者

**主要内容**:
- Merkle 树原理
- 代码分块策略
- 哈希计算
- 树结构构建
- 完整性验证
- 使用示例

#### [Qdrant 集成](./QDRANT_INTEGRATION.md)
Qdrant 向量数据库的集成文档，包括集合管理、批量插入、搜索功能等。

**适合人群**: 想要使用 Qdrant 功能的开发者

**主要内容**:
- Qdrant 客户端初始化
- 集合管理
- 批量插入
- 搜索方法（文本、向量、混合）
- 配置和优化
- 使用示例

#### [代码搜索](./CODE_SEARCH.md)
代码搜索功能的文档，包括语义搜索、搜索结果展示等。

**适合人群**: 想要使用或扩展搜索功能的用户和开发者

**主要内容**:
- 搜索功能介绍
- 使用方法
- 搜索原理
- 搜索结果格式
- 使用示例

---

### ⚡ 优化文档

#### [批量嵌入](./BATCH_EMBEDDING.md)
批量处理优化文档，包括性能对比、实现细节、错误处理等。

**适合人群**: 关注性能优化的开发者

**主要内容**:
- 优化背景
- 性能对比
- 实现细节
- 批量处理策略
- 错误处理
- 使用示例

#### [Makefile 使用](./MAKEFILE.md)
Makefile 构建脚本的使用文档，包括所有命令、使用场景、最佳实践等。

**适合人群**: 所有开发者

**主要内容**:
- 可用命令列表
- 命令详解
- 使用场景
- 工作流程
- 最佳实践

---

### 📝 其他文档

#### [实现总结](./IMPLEMENTATION_SUMMARY.md)
功能实现的总结文档，包括已实现功能、技术细节、未来规划等。

**适合人群**: 想要快速了解项目的开发者

**主要内容**:
- 已实现功能列表
- 技术实现细节
- 项目结构
- 未来规划

---

## 🚀 快速开始

### 新用户

1. 阅读 [配置指南](./CONFIGURATION.md) 配置 OpenAI 和 Qdrant
2. 查看 [README](../README.md) 了解基本使用
3. 尝试运行 "Smart Ant: 代码索引" 命令

### 开发者

1. 阅读 [架构设计](./ARCHITECTURE.md) 了解项目结构
2. 查看 [依赖注入](./DEPENDENCY_INJECTION.md) 理解 DI 模式
3. 参考 [Workspace API](./WORKSPACE_API.md) 使用核心 API
4. 使用 [Makefile 使用](./MAKEFILE.md) 进行开发

### 贡献者

1. 阅读所有核心文档
2. 遵循 [架构设计](./ARCHITECTURE.md) 中的设计模式
3. 使用 [Makefile](./MAKEFILE.md) 进行构建和测试
4. 提交前运行 `make release` 确保代码质量

---

## 📊 文档结构

```
docs/
├── README.md                    # 文档索引（本文档）
├── ARCHITECTURE.md              # 架构设计
├── CONFIGURATION.md             # 配置指南
├── DEPENDENCY_INJECTION.md      # 依赖注入
├── WORKSPACE_API.md             # Workspace API
├── MERKLE_TREE.md               # Merkle 树
├── QDRANT_INTEGRATION.md        # Qdrant 集成
├── CODE_SEARCH.md               # 代码搜索
├── BATCH_EMBEDDING.md           # 批量嵌入
├── MAKEFILE.md                  # Makefile 使用
└── IMPLEMENTATION_SUMMARY.md    # 实现总结
```

---

## 🔍 按主题查找

### 配置和安装
- [配置指南](./CONFIGURATION.md)
- [Makefile 使用](./MAKEFILE.md)

### 核心功能
- [Workspace API](./WORKSPACE_API.md)
- [Merkle 树](./MERKLE_TREE.md)
- [代码搜索](./CODE_SEARCH.md)

### 数据库集成
- [Qdrant 集成](./QDRANT_INTEGRATION.md)
- [批量嵌入](./BATCH_EMBEDDING.md)

### 架构和设计
- [架构设计](./ARCHITECTURE.md)
- [依赖注入](./DEPENDENCY_INJECTION.md)

### 开发和构建
- [Makefile 使用](./MAKEFILE.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)

---

## 💡 常见问题

### 如何配置 API Key？
查看 [配置指南](./CONFIGURATION.md#必需配置)

### 如何使用 Workspace API？
查看 [Workspace API](./WORKSPACE_API.md#使用示例)

### 如何进行代码搜索？
查看 [代码搜索](./CODE_SEARCH.md#使用方法)

### 如何构建和打包插件？
查看 [Makefile 使用](./MAKEFILE.md#打包相关)

### 如何理解依赖注入？
查看 [依赖注入](./DEPENDENCY_INJECTION.md#核心概念)

### 如何优化性能？
查看 [批量嵌入](./BATCH_EMBEDDING.md) 和 [架构设计](./ARCHITECTURE.md#性能优化)

---

## 📮 反馈

如果您发现文档有任何问题或需要改进的地方，欢迎：

1. 提交 Issue
2. 提交 Pull Request
3. 联系作者

---

## 📜 许可证

MIT License

---

**Happy Reading! 📖**

