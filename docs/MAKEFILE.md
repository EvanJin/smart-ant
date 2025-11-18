# Makefile 使用指南

## 概述

项目根目录的 `Makefile` 提供了一系列便捷的命令，用于简化开发、构建和打包流程。

## 前置要求

- **Make**: macOS/Linux 系统自带，Windows 需要安装 [Make for Windows](http://gnuwin32.sourceforge.net/packages/make.htm)
- **pnpm**: 项目使用 pnpm 作为包管理器
- **Node.js**: 版本 >= 18.x

## 可用命令

### 查看帮助

```bash
make help
# 或直接运行
make
```

显示所有可用命令及其说明。

### 安装依赖

```bash
make install
```

使用 pnpm 安装项目依赖。

**等价于**:
```bash
pnpm install
```

### 编译项目

```bash
make build
```

编译 TypeScript 代码并进行类型检查和 lint 检查。

**等价于**:
```bash
pnpm run compile
```

### 监听模式

```bash
make watch
```

启动监听模式，自动编译代码变更。适合开发时使用。

**等价于**:
```bash
pnpm run watch
```

### 打包插件 ⭐

```bash
make package
```

将插件打包为 `.vsix` 文件，输出到 `build/` 目录。

**执行流程**:
1. 创建 `build/` 目录（如果不存在）
2. 运行 `pnpm run vsce:package`
3. 生成 `build/smart-ant-0.0.1.vsix`

**等价于**:
```bash
mkdir -p build
pnpm run vsce:package
```

### 清理构建产物

```bash
make clean
```

删除所有构建产物和缓存文件。

**清理内容**:
- `dist/` - 编译输出目录
- `out/` - 测试编译输出
- `build/` - 打包输出目录
- `node_modules/.cache` - 缓存文件

### 运行测试

```bash
make test
```

运行项目测试套件。

**等价于**:
```bash
pnpm run test
```

### 代码检查

```bash
make lint
```

运行 ESLint 代码检查。

**等价于**:
```bash
pnpm run lint
```

### 类型检查

```bash
make check-types
```

运行 TypeScript 类型检查（不生成输出文件）。

**等价于**:
```bash
pnpm run check-types
```

## 组合命令

### 完整构建流程

```bash
make all
```

执行完整的构建流程，适合首次构建或发布前使用。

**执行顺序**:
1. `make clean` - 清理旧文件
2. `make install` - 安装依赖
3. `make build` - 编译项目
4. `make package` - 打包插件

**使用场景**:
- 首次克隆项目后
- 准备发布新版本
- 清理重建项目

### 快速打包

```bash
make quick-package
```

快速打包，跳过清理和依赖安装步骤。

**执行顺序**:
1. `make build` - 编译项目
2. `make package` - 打包插件

**使用场景**:
- 代码已编译，只需重新打包
- 快速迭代测试

### 开发模式

```bash
make dev
```

启动开发模式，清理并安装依赖后进入监听模式。

**执行顺序**:
1. `make clean` - 清理旧文件
2. `make install` - 安装依赖
3. `make watch` - 启动监听模式

**使用场景**:
- 开始新的开发会话
- 切换分支后重新开始

### 发布准备

```bash
make release
```

完整的发布前检查和打包流程。

**执行顺序**:
1. `make clean` - 清理旧文件
2. `make install` - 安装依赖
3. `make check-types` - 类型检查
4. `make lint` - 代码检查
5. `make test` - 运行测试
6. `make build` - 编译项目
7. `make package` - 打包插件

**使用场景**:
- 准备发布新版本
- 提交 PR 前的完整检查

## 常见使用场景

### 场景 1: 首次使用项目

```bash
# 克隆项目
git clone https://github.com/EvanJin/smart-ant.git
cd smart-ant

# 完整构建
make all
```

### 场景 2: 日常开发

```bash
# 启动开发模式
make dev

# 在另一个终端运行 VSCode 调试
# 按 F5 启动调试
```

### 场景 3: 打包测试

```bash
# 修改代码后快速打包
make quick-package

# 安装测试
code --install-extension build/smart-ant-0.0.1.vsix
```

### 场景 4: 发布新版本

```bash
# 1. 更新版本号
# 编辑 package.json 中的 version 字段

# 2. 完整检查和打包
make release

# 3. 提交代码
git add .
git commit -m "chore: release v0.0.2"
git tag v0.0.2
git push origin main --tags

# 4. 发布到 VSCode Marketplace（可选）
pnpm run vsce:publish
```

### 场景 5: 清理重建

```bash
# 遇到奇怪的编译问题时
make clean
make all
```

## 输出示例

### make package

```bash
$ make package
正在打包插件...
mkdir -p build

> smart-ant@0.0.1 vsce:package
> pnpm run package && vsce package --no-dependencies --out build/

> smart-ant@0.0.1 package
> pnpm run check-types && pnpm run lint && node esbuild.js --production

✓ 类型检查通过
✓ 代码检查通过
✓ 编译完成

Executing prepublish script 'pnpm run vscode:prepublish'...
✓ 打包完成: build/smart-ant-0.0.1.vsix

打包完成！文件位于 build/ 目录
```

### make all

```bash
$ make all
正在清理构建产物...
清理完成！
正在安装依赖...
✓ 依赖安装完成
正在编译项目...
✓ 编译完成
正在打包插件...
✓ 打包完成: build/smart-ant-0.0.1.vsix
完整构建流程完成！
```

## 技巧和最佳实践

### 1. 使用 Tab 补全

在终端中输入 `make` 后按 Tab 键可以自动补全命令。

### 2. 并行执行

Make 支持并行执行，但本项目的命令大多有依赖关系，不建议使用 `-j` 参数。

### 3. 查看执行的命令

如果想看到 Make 执行的具体命令，可以移除 `@` 前缀：

```makefile
# 修改前（静默执行）
package:
	@echo "正在打包插件..."
	@mkdir -p build

# 修改后（显示命令）
package:
	echo "正在打包插件..."
	mkdir -p build
```

### 4. 自定义命令

可以根据需要在 `Makefile` 中添加自定义命令：

```makefile
# 部署到测试环境
deploy-test: package
	@echo "部署到测试环境..."
	scp build/*.vsix user@test-server:/path/to/extensions/
```

## 故障排查

### 问题 1: make: command not found

**原因**: 系统未安装 Make

**解决方案**:
- **macOS**: 安装 Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- **Linux**: 安装 build-essential
  ```bash
  sudo apt-get install build-essential
  ```
- **Windows**: 安装 Make for Windows 或使用 WSL

### 问题 2: pnpm: command not found

**原因**: 未安装 pnpm

**解决方案**:
```bash
npm install -g pnpm
```

### 问题 3: 打包失败

**原因**: 可能是依赖未安装或代码有错误

**解决方案**:
```bash
# 清理并重新构建
make clean
make all
```

### 问题 4: 权限错误

**原因**: 没有写入权限

**解决方案**:
```bash
# 检查目录权限
ls -la

# 如果需要，修改权限
chmod +x Makefile
```

## 与 npm scripts 的对比

| Makefile | npm scripts | 说明 |
|----------|-------------|------|
| `make package` | `pnpm run vsce:package` | Makefile 更简洁 |
| `make all` | 需要手动执行多个命令 | Makefile 自动化流程 |
| `make clean` | 需要手动删除 | Makefile 提供清理功能 |
| `make help` | 需要查看 package.json | Makefile 提供帮助信息 |

**优势**:
- ✅ 命令更简短（`make package` vs `pnpm run vsce:package`）
- ✅ 支持命令组合和依赖关系
- ✅ 跨平台一致性
- ✅ 标准化的开发流程

## 相关文件

- `Makefile` - Make 配置文件
- `package.json` - npm scripts 定义
- `docs/BUILD.md` - 构建和打包文档
- `.vscode/tasks.json` - VSCode 任务配置

## 更新日志

- **v0.0.1**: 初始版本，添加基本的构建和打包命令

