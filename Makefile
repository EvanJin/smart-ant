.PHONY: help install build watch package clean test lint

# 默认目标
help:
	@echo "Smart Ant VSCode Extension - Makefile"
	@echo ""
	@echo "可用命令:"
	@echo "  make install    - 安装依赖"
	@echo "  make build      - 编译项目"
	@echo "  make watch      - 监听模式编译"
	@echo "  make package    - 打包插件为 .vsix 文件"
	@echo "  make clean      - 清理构建产物"
	@echo "  make test       - 运行测试"
	@echo "  make lint       - 运行代码检查"
	@echo "  make all        - 完整构建流程（安装 + 编译 + 打包）"

# 安装依赖
install:
	@echo "正在安装依赖..."
	pnpm install

# 编译项目
build:
	@echo "正在编译项目..."
	pnpm run compile

# 监听模式
watch:
	@echo "启动监听模式..."
	pnpm run watch

# 打包插件
package:
	@echo "正在打包插件..."
	@mkdir -p build
	pnpm run vsce:package
	@echo "打包完成！文件位于 build/ 目录"

# 清理构建产物
clean:
	@echo "正在清理构建产物..."
	@rm -rf dist
	@rm -rf out
	@rm -rf build
	@rm -rf node_modules/.cache
	@echo "清理完成！"

# 运行测试
test:
	@echo "正在运行测试..."
	pnpm run test

# 代码检查
lint:
	@echo "正在运行代码检查..."
	pnpm run lint

# 类型检查
check-types:
	@echo "正在进行类型检查..."
	pnpm run check-types

# 完整构建流程
all: clean install build package
	@echo "完整构建流程完成！"

# 快速打包（不清理，不重新安装）
quick-package: build package
	@echo "快速打包完成！"

# 开发模式（清理 + 安装 + 监听）
dev: clean install watch

# 发布准备（完整检查 + 打包）
release: clean install check-types lint test build package
	@echo "发布准备完成！请检查 build/ 目录中的 .vsix 文件"

