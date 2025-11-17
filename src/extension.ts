// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Workspace from "@/core/workspace";
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "smart-ant" is now active!');

  // 读取当前工程目录
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspace: Workspace | null = null;

  if (workspaceFolders && workspaceFolders.length > 0) {
    // 默认只遍历代码文件
    workspace = new Workspace(workspaceFolders[0].uri.fsPath, true);

    // 显示通知消息
    vscode.window.showInformationMessage(
      `Smart Ant 已启动 - 工程: ${workspace.getWorkspaceName()}`
    );
  } else {
    console.log("未检测到工作区文件夹");
    vscode.window.showWarningMessage("Smart Ant: 未检测到打开的工作区");
  }

  // 添加命令：构建代码索引
  const codeIndexingDisposable = vscode.commands.registerCommand(
    "smart-ant.codeIndexing",
    async () => {
      if (!workspace) {
        vscode.window.showErrorMessage("未检测到工作区");
        return;
      }

      try {
        // 显示进度提示
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Smart Ant",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "正在构建代码索引..." });

            // 构建代码索引
            const stats = workspace.buildCodeIndex({
              maxChunkSize: 4096,
              minChunkSize: 512,
              overlapLines: 2,
            });

            // 显示统计信息
            console.log("\n=== 代码索引统计 ===");
            console.log(`总文件数: ${stats.totalFiles}`);
            console.log(`总 chunk 数: ${stats.totalChunks}`);
            console.log(`总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
            console.log(`根哈希: ${stats.rootHash.substring(0, 16)}...`);
            console.log(`构建时间: ${stats.buildTime}ms`);

            // 验证索引
            const isValid = workspace.verifyCodeIndex();
            console.log(`索引验证: ${isValid ? "✓ 通过" : "✗ 失败"}`);

            // 获取所有 chunks
            const allChunks = workspace.getAllCodeChunks();
            console.log(
              `\n总共生成的 chunks 数: ${allChunks.length}, 以及 chunks 详情\n`
            );
            console.log(allChunks);

            // 创建文本嵌入
            progress.report({ message: "正在生成文本嵌入..." });
            console.log("\n=== 生成文本嵌入 ===");

            for (let i = 0; i < allChunks.length; i++) {
              const chunk = allChunks[i];
              try {
                const embedding =
                  await OpenAIClient.initialize().createEmbedding(
                    chunk.content
                  );
                if (embedding) {
                  chunk.embedding = embedding;
                  console.log(
                    `  [${i + 1}/${allChunks.length}] ${chunk.id} 嵌入生成成功`
                  );
                }
              } catch (error) {
                console.error(
                  `  [${i + 1}/${allChunks.length}] ${chunk.id} 嵌入生成失败:`,
                  error
                );
              }
            }

            // 批量插入到 Qdrant
            progress.report({ message: "正在插入向量数据库..." });
            console.log("\n=== 插入向量数据库 ===");

            const insertResult = await QdrantClient.batchInsertChunks(
              allChunks
            );

            console.log("\n=== 插入结果 ===");
            console.log(`成功: ${insertResult.success} 个`);
            console.log(`失败: ${insertResult.failed} 个`);

            if (insertResult.errors.length > 0) {
              console.log("\n错误详情:");
              insertResult.errors.slice(0, 10).forEach((err) => {
                console.log(`  ${err.chunkId}: ${err.error}`);
              });
              if (insertResult.errors.length > 10) {
                console.log(
                  `  ... 还有 ${insertResult.errors.length - 10} 个错误`
                );
              }
            }

            progress.report({ message: "代码索引构建完成！" });

            return stats;
          }
        );

        // 显示成功消息
        const stats = workspace.getCodeIndexStats();
        if (stats) {
          vscode.window.showInformationMessage(
            `代码索引构建完成！共 ${stats.totalFiles} 个文件，${stats.totalChunks} 个代码块`
          );
        }
      } catch (error) {
        console.error("构建代码索引失败:", error);
        vscode.window.showErrorMessage(
          `构建代码索引失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  // 添加命令：搜索代码
  const searchCodeDisposable = vscode.commands.registerCommand(
    "smart-ant.searchCode",
    async () => {
      try {
        // 1. 获取用户输入的搜索查询
        const query = await vscode.window.showInputBox({
          prompt: "请输入搜索内容（描述你想找的代码功能）",
          placeHolder: "例如：文件上传功能、数据库连接、API 请求等",
        });

        if (!query) {
          return;
        }

        // 2. 显示进度
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Smart Ant",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "正在搜索代码..." });

            // 3. 使用 Qdrant 搜索
            const results = await QdrantClient.searchByText(
              query,
              10,
              async (text) => {
                return await OpenAIClient.initialize().createEmbedding(text);
              }
            );

            if (results.length === 0) {
              vscode.window.showInformationMessage(
                "未找到相关代码，请尝试其他关键词"
              );
              return;
            }

            // 4. 在控制台显示结果
            console.log(`\n=== 搜索结果: "${query}" ===`);
            console.log(`找到 ${results.length} 个相关代码块:\n`);

            results.forEach((result, idx) => {
              const { chunk, score } = result;
              console.log(`[${idx + 1}] 相似度: ${(score * 100).toFixed(2)}%`);
              console.log(`    文件: ${chunk.relativePath}`);
              console.log(`    位置: 行 ${chunk.startLine}-${chunk.endLine}`);
              console.log(`    大小: ${chunk.size}B`);
              console.log(`    内容预览:`);
              const preview = chunk.content
                .split("\n")
                .slice(0, 3)
                .map((line) => `      ${line}`)
                .join("\n");
              console.log(preview);
              console.log("");
            });

            // 5. 创建结果文档
            const resultContent = [
              `# 代码搜索结果`,
              ``,
              `**查询**: ${query}`,
              `**找到**: ${results.length} 个相关代码块`,
              ``,
              ...results.map((result, idx) => {
                const { chunk, score } = result;
                return [
                  `## ${idx + 1}. ${chunk.relativePath} (相似度: ${(
                    score * 100
                  ).toFixed(2)}%)`,
                  ``,
                  `- **位置**: 行 ${chunk.startLine}-${chunk.endLine}`,
                  `- **大小**: ${chunk.size} 字节`,
                  `- **哈希**: ${chunk.hash.substring(0, 16)}...`,
                  ``,
                  `### 代码内容`,
                  ``,
                  "```" + (chunk.relativePath.split(".").pop() || "text"),
                  chunk.content,
                  "```",
                  ``,
                ].join("\n");
              }),
            ].join("\n");

            // 6. 在新编辑器中显示结果
            const doc = await vscode.workspace.openTextDocument({
              content: resultContent,
              language: "markdown",
            });
            await vscode.window.showTextDocument(doc);

            // 7. 显示成功消息
            vscode.window.showInformationMessage(
              `找到 ${results.length} 个相关代码块`
            );
          }
        );
      } catch (error) {
        console.error("搜索代码失败:", error);
        vscode.window.showErrorMessage(
          `搜索代码失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  context.subscriptions.push(codeIndexingDisposable, searchCodeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
