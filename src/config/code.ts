// 常见的代码文件扩展名
export const CODE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  // Python
  ".py",
  ".pyw",
  ".pyx",
  // Java/Kotlin
  ".java",
  ".kt",
  ".kts",
  // C/C++
  ".c",
  ".cpp",
  ".cc",
  ".cxx",
  ".h",
  ".hpp",
  ".hxx",
  // C#
  ".cs",
  ".csx",
  // Go
  ".go",
  // Rust
  ".rs",
  // PHP
  ".php",
  ".phtml",
  // Ruby
  ".rb",
  ".rake",
  // Swift
  ".swift",
  // Objective-C
  ".m",
  ".mm",
  // Shell
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  // Web
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  // 配置文件
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".ini",
  ".conf",
  // SQL
  ".sql",
  // R
  ".r",
  ".R",
  // Dart
  ".dart",
  // Scala
  ".scala",
  // Lua
  ".lua",
  // Perl
  ".pl",
  ".pm",
  // Elixir
  ".ex",
  ".exs",
  // Haskell
  ".hs",
  // Clojure
  ".clj",
  ".cljs",
  // Markdown/文档
  ".md",
  ".markdown",
  ".rst",
  ".txt",
  // 其他
  ".graphql",
  ".proto",
  ".thrift",
]);

/**
 * 默认忽略的文件和目录列表
 * 这些文件/目录在遍历工作区时会被自动跳过
 * 包括：
 * - 版本控制目录（.git, .svn, .hg, .bzr）
 * - IDE 配置目录（.idea, .vscode）
 * - 系统文件（.DS_Store）
 * - 环境变量文件（.env*）
 * - 依赖锁文件（yarn.lock, package-lock.json, pnpm-lock.yaml, bun.lockb）
 */
export const DEFAULT_IGNORE_FILES = new Set([
  ".git",
  ".svn",
  ".hg",
  ".bzr",
  ".idea",
  ".vscode",
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.development.local",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lockb",
]);
