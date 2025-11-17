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

  // 添加命令：修复代码
  context.subscriptions.push(codeIndexingDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
