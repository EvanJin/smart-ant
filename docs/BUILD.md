# 构建和打包指南

## 打包插件

### 使用 npm script 打包

运行以下命令来打包插件：

```bash
pnpm run vsce:package
```

这个命令会：
1. 运行类型检查 (`tsc --noEmit`)
2. 运行 ESLint 检查
3. 使用 esbuild 构建生产版本
4. 使用 vsce 打包成 `.vsix` 文件
5. 将打包文件输出到 `build/` 目录

### 输出位置

打包后的 `.vsix` 文件会保存在：
```
build/smart-ant-<version>.vsix
```

例如：`build/smart-ant-0.0.1.vsix`

### 安装打包的插件

有两种方式安装打包好的插件：

#### 方式 1: 通过 VSCode 界面安装

1. 打开 VSCode
2. 进入扩展视图 (Cmd+Shift+X / Ctrl+Shift+X)
3. 点击右上角的 "..." 菜单
4. 选择 "从 VSIX 安装..."
5. 选择 `build/smart-ant-0.0.1.vsix` 文件

#### 方式 2: 通过命令行安装

```bash
code --install-extension build/smart-ant-0.0.1.vsix
```

### 发布插件

如果需要发布到 VSCode Marketplace，运行：

```bash
pnpm run vsce:publish
```

**注意**: 发布前需要：
1. 在 [Visual Studio Marketplace](https://marketplace.visualstudio.com/) 创建发布者账号
2. 获取 Personal Access Token (PAT)
3. 使用 `vsce login <publisher>` 登录

## 目录说明

- `build/` - 打包输出目录（已添加到 `.gitignore`）
- `dist/` - esbuild 编译输出目录
- `src/` - 源代码目录

## 相关命令

```bash
# 开发模式编译
pnpm run compile

# 监听模式（自动重新编译）
pnpm run watch

# 生产模式构建（不打包）
pnpm run package

# 完整打包（类型检查 + lint + 构建 + 打包）
pnpm run vsce:package
```

## 故障排查

### 问题: 打包失败，提示依赖错误

**解决方案**: 确保 `package.json` 中的打包命令使用了 `--no-dependencies` 标志：
```json
"vsce:package": "pnpm run package && vsce package --no-dependencies --out build/"
```

### 问题: 类型检查失败

**解决方案**: 运行以下命令检查具体错误：
```bash
pnpm run check-types
```

### 问题: ESLint 检查失败

**解决方案**: 运行以下命令查看 lint 错误：
```bash
pnpm run lint
```

