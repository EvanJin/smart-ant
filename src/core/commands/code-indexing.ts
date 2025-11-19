import * as vscode from "vscode";
import { Workspace } from "@/core/workspace";
import { OpenAIClient } from "@/core/openai";
import { QdrantCoreClient } from "@/core/qdrant";
import { BaseCommand } from "./base";
import { inject, injectable } from "inversify";

@injectable()
export class CodeIndexingCommand extends BaseCommand {
  command = "smart-ant.codeIndexing";

  constructor(
    @inject(Workspace) private readonly workspace: Workspace,
    @inject(QdrantCoreClient) private readonly qdrantClient: QdrantCoreClient,
    @inject(OpenAIClient) private readonly openaiClient: OpenAIClient
  ) {
    super();
    console.log("code indexing command constructor", this.workspace);
  }

  execute() {
    return vscode.commands.registerCommand(this.command, async () => {
      if (!this.workspace) {
        vscode.window.showErrorMessage("未检测到工作区");
        return;
      }

      const repo = await this.workspace.getRepoHash();

      console.log(`Git 仓库信息获取成功: ${repo}`);

      // 设置集合名称
      this.qdrantClient.setCollectionName(repo);

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
            const stats = this.workspace.buildCodeIndex({
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
            const isValid = this.workspace.verifyCodeIndex();
            console.log(`索引验证: ${isValid ? "✓ 通过" : "✗ 失败"}`);

            // 获取所有 chunks
            const allChunks = this.workspace.getAllCodeChunks();
            console.log(
              `\n总共生成的 chunks 数: ${allChunks.length}, 以及 chunks 详情\n`
            );
            console.log(allChunks);

            // 批量创建文本嵌入
            progress.report({ message: "正在批量生成文本向量..." });
            console.log("\n=== 批量生成文本向量 ===");

            try {
              // 提取所有 chunk 的内容
              const contents = allChunks.map((chunk) => chunk.content);

              // 批量生成 embeddings（每批 100 个）
              const embeddings = await this.openaiClient.createEmbeddings(
                contents,
                100,
                (batchIndex, totalBatches, current, total) => {
                  progress.report({
                    message: `第 ${batchIndex}/${totalBatches} 批处理完成，已生成 ${current}/${total} 个 embedding`,
                  });
                }
              );

              // 将 embeddings 分配给对应的 chunks
              let successCount = 0;
              let failCount = 0;

              for (let i = 0; i < allChunks.length; i++) {
                if (embeddings[i] && embeddings[i].length > 0) {
                  allChunks[i].embedding = embeddings[i];
                  successCount++;
                } else {
                  console.error(`Chunk ${allChunks[i].id} 的 embedding 为空`);
                  failCount++;
                }
              }

              console.log(
                `\n批量 embedding 生成完成: 成功 ${successCount} 个，失败 ${failCount} 个`
              );
            } catch (error) {
              console.error("批量生成 embedding 失败:", error);
              throw error;
            }

            // 批量插入到 Qdrant
            progress.report({ message: "正在更新向量数据..." });
            console.log("\n=== 插入向量数据库 ===");

            const insertResult =
              await this.qdrantClient.batchInsertChunks(allChunks);

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
        const stats = this.workspace.getCodeIndexStats();
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
    });
  }
}
