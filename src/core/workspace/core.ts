import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import ignore from "ignore";
import { CODE_EXTENSIONS, DEFAULT_IGNORE_FILES } from "@/config/code";
import {
  FileInfo,
  FileChange,
  FileChangeType,
  IndexState,
} from "@/core/workspace/types";
import Merkle from "@/core/merkel/core";
import { ChunkConfig } from "@/types/global";
import { CodeChunk, MerkleTreeStats } from "@/core/merkel/types";
import { inject, injectable } from "inversify";
import { IncrementalUpdateManager } from "./incremental";
import { MAX_CHANGED_FILES } from "@/config/chunk";

@injectable()
export class Workspace {
  private path: string = "";

  private ig: ReturnType<typeof ignore> | null = null;

  private codeOnly: boolean = false;

  private merkle: Merkle | null = null;

  /** 增量更新管理器 */
  private incrementalManager: IncrementalUpdateManager;

  constructor(
    @inject(IncrementalUpdateManager)
    incrementalManager: IncrementalUpdateManager
  ) {
    this.incrementalManager = incrementalManager;
  }

  /**
   * 初始化工作区
   * @param context VSCode 扩展上下文
   * @param path 工作区路径
   * @param codeOnly 是否只遍历代码文件
   */
  initialize(
    context: vscode.ExtensionContext,
    path: string,
    codeOnly: boolean = false
  ) {
    this.path = path;
    this.codeOnly = codeOnly;
    this.loadGitignore();

    // 初始化增量更新管理器
    this.incrementalManager.initialize(context, path);
  }

  getWorkspaceName() {
    return this.path.split("/").pop();
  }

  /**
   * 获取当前工作目录的 git remote 地址
   * 如果 remote 不存在，则返回当前工作目录的根路径
   */
  private async getRepo(): Promise<string> {
    try {
      const gitExtension = vscode.extensions.getExtension("vscode.git");

      if (!gitExtension) {
        console.warn("Git extension not found, returning workspace path");
        return this.getWorkspaceName()!;
      }

      const git = gitExtension.isActive
        ? gitExtension.exports.getAPI(1)
        : (await gitExtension.activate()).getAPI(1);

      const repos = git.repositories;

      if (!repos || repos.length === 0) {
        console.warn("No git repositories found, returning workspace path");
        return this.getWorkspaceName()!;
      }

      // 查找匹配当前工作区路径的仓库
      const currentRepo = repos.find((repo: any) => {
        return repo.rootUri.fsPath === this.path;
      });

      const targetRepo = currentRepo || repos[0];

      // 获取 remote URL
      if (targetRepo.state.remotes && targetRepo.state.remotes.length > 0) {
        // 优先使用 origin remote
        const originRemote = targetRepo.state.remotes.find(
          (r: any) => r.name === "origin"
        );
        const remote = originRemote || targetRepo.state.remotes[0];

        const remoteUrl = remote.fetchUrl || remote.pushUrl;

        if (remoteUrl) {
          console.log(`Found git remote: ${remoteUrl}`);
          return remoteUrl;
        }
      }

      console.warn("No remote URL found, returning workspace path");
      return this.getWorkspaceName()!;
    } catch (error) {
      console.error("Error getting git repo:", error);
      return this.getWorkspaceName()!;
    }
  }

  async getRepoHash(): Promise<string> {
    const repo = await this.getRepo();
    return repo.split("/").pop()!;
  }

  /**
   * 加载 .gitignore 文件
   */
  private loadGitignore(): void {
    const gitignorePath = path.join(this.path, ".gitignore");
    this.ig = ignore();

    // 默认忽略 .git 目录
    this.ig.add(".git");

    try {
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
        this.ig.add(gitignoreContent);
        console.log(`已加载 .gitignore 文件: ${gitignorePath}`);
      } else {
        console.log("未找到 .gitignore 文件，将使用默认规则");
      }
    } catch (error) {
      console.error("读取 .gitignore 文件失败:", error);
    }
  }

  /**
   * 检查路径是否应该被忽略
   */
  private shouldIgnore(relativePath: string): boolean {
    if (!this.ig) {
      return false;
    }
    return (
      this.ig.ignores(relativePath) || DEFAULT_IGNORE_FILES.has(relativePath)
    );
  }

  /**
   * 检查文件是否为代码文件
   */
  private isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return CODE_EXTENSIONS.has(ext);
  }

  /**
   * 递归遍历目录，获取所有文件
   * @param dirPath 要遍历的目录路径（默认为工作区根目录）
   * @returns 文件信息数组
   */
  public getAllFiles(dirPath?: string): FileInfo[] {
    const targetPath = dirPath || this.path;
    const files: FileInfo[] = [];

    const traverse = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(this.path, fullPath);

          // 检查是否应该忽略
          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const fileInfo: FileInfo = {
            filePath: fullPath,
            relativePath,
            isDirectory: entry.isDirectory(),
          };

          // 如果设置了只遍历代码文件，且当前是文件（非目录），则检查是否为代码文件
          if (
            this.codeOnly &&
            !entry.isDirectory() &&
            !this.isCodeFile(fullPath)
          ) {
            continue;
          }

          files.push(fileInfo);

          // 如果是目录，递归遍历
          if (entry.isDirectory()) {
            traverse(fullPath);
          }
        }
      } catch (error) {
        console.error(`读取目录失败 ${currentPath}:`, error);
      }
    };

    traverse(targetPath);
    return files;
  }

  /**
   * 获取所有文件（不包括目录）
   */
  public getFilesOnly(): FileInfo[] {
    return this.getAllFiles().filter((file) => !file.isDirectory);
  }

  /**
   * 获取所有目录（不包括文件）
   */
  public getDirectoriesOnly(): FileInfo[] {
    return this.getAllFiles().filter((file) => file.isDirectory);
  }

  /**
   * 获取所有代码文件
   */
  public getCodeFiles(): FileInfo[] {
    return this.getFilesOnly().filter((file) => this.isCodeFile(file.filePath));
  }

  /**
   * 设置是否只遍历代码文件
   */
  public setCodeOnly(codeOnly: boolean): void {
    this.codeOnly = codeOnly;
  }

  /**
   * 获取 Merkle 树实例
   */
  public getMerkle(): Merkle | null {
    return this.merkle;
  }

  /**
   * 获取所有代码块
   */
  public getAllCodeChunks(): CodeChunk[] {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.getAllChunks();
  }

  /**
   * 根据文件路径获取代码块
   */
  public getCodeChunksByFile(relativePath: string): CodeChunk[] | undefined {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.getChunksByFile(relativePath);
  }

  /**
   * 搜索代码块
   */
  public searchCodeChunks(
    query: string,
    caseSensitive: boolean = false
  ): CodeChunk[] {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.searchChunks(query, caseSensitive);
  }

  /**
   * 验证代码索引的完整性
   */
  public verifyCodeIndex(): boolean {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.verify();
  }

  /**
   * 获取代码索引统计信息
   */
  public getCodeIndexStats(): MerkleTreeStats | null {
    if (!this.merkle) {
      return null;
    }
    return this.merkle.getStats();
  }

  /**
   * 增量构建代码索引
   * @param config 分块配置
   * @param forceFullRebuild 是否强制全量重建
   * @returns Merkle 树统计信息和变更信息
   */
  buildCodeIndexIncremental(
    config?: ChunkConfig,
    forceFullRebuild: boolean = false
  ): { stats: MerkleTreeStats; changes: FileChange[]; isIncremental: boolean } {
    console.log(
      `开始${forceFullRebuild ? "全量" : "增量"}构建代码索引，工作区: ${this.path}`
    );
    const startTime = process.hrtime.bigint();

    // 获取当前所有文件
    const codeFiles = this.getCodeFiles();

    // 检测文件变更
    let changes: FileChange[] = [];
    let isIncremental = false;

    if (!forceFullRebuild && this.incrementalManager.hasState()) {
      changes = this.incrementalManager.detectChanges(codeFiles);
      isIncremental = changes.length > 0 && changes.length < codeFiles.length;

      // 如果变更太多（超过 MAX_CHANGED_FILES 比例），执行全量重建
      if (changes.length > codeFiles.length * MAX_CHANGED_FILES) {
        console.log(
          `变更文件过多 (${changes.length}/${codeFiles.length})，执行全量重建`
        );
        isIncremental = false;
      }
    }

    let stats: MerkleTreeStats;

    if (isIncremental && changes.length > 0) {
      // 增量更新
      stats = this.performIncrementalUpdate(changes, codeFiles, config);
    } else {
      // 全量构建
      stats = this.performFullBuild(codeFiles, config);
      changes = codeFiles.map((file: FileInfo) => ({
        filePath: file.filePath,
        relativePath: file.relativePath,
        changeType: FileChangeType.ADDED,
      }));
    }

    const endTime = process.hrtime.bigint();
    stats.buildTime = Number(endTime - startTime) / 1_000_000;

    // 保存索引状态
    this.saveIndexState(codeFiles, stats);

    console.log(`代码索引构建完成，耗时: ${stats.buildTime}ms`);
    console.log(`模式: ${isIncremental ? "增量更新" : "全量构建"}`);

    return { stats, changes, isIncremental };
  }

  /**
   * 执行全量构建
   */
  private performFullBuild(
    files: FileInfo[],
    config?: ChunkConfig
  ): MerkleTreeStats {
    console.log(`执行全量构建: ${files.length} 个文件`);
    this.merkle = new Merkle(this.path, config);
    return this.merkle.build(files);
  }

  /**
   * 执行增量更新
   */
  private performIncrementalUpdate(
    changes: FileChange[],
    allFiles: FileInfo[],
    config?: ChunkConfig
  ): MerkleTreeStats {
    console.log(`执行增量更新: ${changes.length} 个变更`);

    // 如果 Merkle 树不存在，执行全量构建
    if (!this.merkle) {
      return this.performFullBuild(allFiles, config);
    }

    // 处理每个变更
    for (const change of changes) {
      switch (change.changeType) {
        case FileChangeType.ADDED:
        case FileChangeType.MODIFIED:
          // 重新处理文件
          const file = allFiles.find(
            (f) => f.relativePath === change.relativePath
          );
          if (file) {
            this.merkle.updateFile(file);
          }
          break;

        case FileChangeType.DELETED:
          // 删除文件的所有 chunks
          this.merkle.removeFile(change.relativePath);
          break;
      }
    }

    // 重新计算根哈希
    this.merkle.recalculateRootHash();

    return this.merkle.getStats()!;
  }

  /**
   * 保存索引状态
   */
  private saveIndexState(files: FileInfo[], stats: MerkleTreeStats): void {
    const fileHashes: Record<string, string> = {};

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.filePath, "utf-8");
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        fileHashes[file.relativePath] = hash;
      } catch (error) {
        console.error(`计算文件哈希失败: ${file.relativePath}`, error);
      }
    }

    const state: IndexState = {
      rootHash: stats.rootHash,
      fileHashes,
      lastUpdated: Date.now(),
      totalFiles: stats.totalFiles,
      totalChunks: stats.totalChunks,
    };

    this.incrementalManager.saveState(state);
  }

  /**
   * 清除索引状态（强制下次全量更新）
   */
  clearIndexState(): void {
    this.incrementalManager.clearState();
  }

  /**
   * 获取路径
   */
  getPath(): string {
    return this.path;
  }
}
