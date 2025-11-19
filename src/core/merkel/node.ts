import crypto from "crypto";
import { CodeChunk, MerkleNodeData, MerkleNodeType } from "@/core/merkel/types";

/**
 * MerkleNode 类 - 表示 Merkle 树的节点
 */
export class MerkleNode {
  public hash: string;
  public type: MerkleNodeType;
  public path?: string;
  public chunk?: CodeChunk;
  public children: MerkleNode[];
  public parent?: MerkleNode;

  constructor(
    type: MerkleNodeType,
    children: MerkleNode[] = [],
    chunk?: CodeChunk,
    path?: string
  ) {
    this.type = type;
    this.children = children;
    this.chunk = chunk;
    this.path = path;
    this.hash = this.calculateHash();

    // 设置父节点引用
    children.forEach((child) => {
      child.parent = this;
    });
  }

  /**
   * 计算节点的哈希值
   */
  private calculateHash(): string {
    if (this.type === "chunk" && this.chunk) {
      // chunk 节点直接使用 chunk 的哈希
      return this.chunk.hash;
    } else if (this.type === "file" && this.children.length > 0) {
      // 文件节点：组合所有 chunk 的哈希
      const combinedHash = this.children.map((c) => c.hash).join("");
      return crypto
        .createHash("sha256")
        .update(combinedHash, "utf-8")
        .digest("hex");
    } else if (this.type === "root" && this.children.length > 0) {
      // 根节点：组合所有文件的哈希
      const combinedHash = this.children.map((c) => c.hash).join("");
      return crypto
        .createHash("sha256")
        .update(combinedHash, "utf-8")
        .digest("hex");
    } else {
      // 空节点
      return crypto.createHash("sha256").update("", "utf-8").digest("hex");
    }
  }

  /**
   * 重新计算哈希（当子节点变化时）
   */
  public recalculateHash(): void {
    this.hash = this.calculateHash();
    // 递归更新父节点
    if (this.parent) {
      this.parent.recalculateHash();
    }
  }

  /**
   * 添加子节点
   */
  public addChild(child: MerkleNode): void {
    this.children.push(child);
    child.parent = this;
    this.recalculateHash();
  }

  /**
   * 移除子节点
   */
  public removeChild(child: MerkleNode): boolean {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parent = undefined;
      this.recalculateHash();
      return true;
    }
    return false;
  }

  /**
   * 查找节点
   */
  public findNode(predicate: (node: MerkleNode) => boolean): MerkleNode | null {
    if (predicate(this)) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findNode(predicate);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * 获取所有叶子节点（chunk 节点）
   */
  public getLeafNodes(): MerkleNode[] {
    if (this.type === "chunk") {
      return [this];
    }

    const leaves: MerkleNode[] = [];
    for (const child of this.children) {
      leaves.push(...child.getLeafNodes());
    }
    return leaves;
  }

  /**
   * 获取树的深度
   */
  public getDepth(): number {
    if (this.children.length === 0) {
      return 1;
    }
    return 1 + Math.max(...this.children.map((c) => c.getDepth()));
  }

  /**
   * 获取节点数量
   */
  public getNodeCount(): number {
    return (
      1 + this.children.reduce((sum, child) => sum + child.getNodeCount(), 0)
    );
  }

  /**
   * 验证节点哈希
   */
  public verify(): boolean {
    const calculatedHash = this.calculateHash();
    if (calculatedHash !== this.hash) {
      return false;
    }

    // 递归验证子节点
    for (const child of this.children) {
      if (!child.verify()) {
        return false;
      }
    }

    return true;
  }

  /**
   * 转换为 JSON 数据
   */
  public toJSON(): MerkleNodeData {
    return {
      hash: this.hash,
      type: this.type,
      path: this.path,
      chunk: this.chunk,
      children: this.children.map((c) => c.toJSON()),
    };
  }

  /**
   * 从 JSON 数据创建节点
   */
  public static fromJSON(data: MerkleNodeData): MerkleNode {
    const children = data.children?.map((c) => MerkleNode.fromJSON(c)) || [];
    const node = new MerkleNode(data.type, children, data.chunk, data.path);
    node.hash = data.hash;
    return node;
  }

  /**
   * 打印树结构
   */
  public printTree(indent: string = "", isLast: boolean = true): void {
    const prefix = isLast ? "└── " : "├── ";
    const nodeInfo =
      this.type === "chunk"
        ? `[CHUNK] ${this.chunk?.id} (${this.chunk?.size}B)`
        : this.type === "file"
        ? `[FILE] ${this.path}`
        : `[ROOT] ${this.hash.substring(0, 8)}...`;

    console.log(indent + prefix + nodeInfo);

    const childIndent = indent + (isLast ? "    " : "│   ");
    this.children.forEach((child, index) => {
      child.printTree(childIndent, index === this.children.length - 1);
    });
  }
}
