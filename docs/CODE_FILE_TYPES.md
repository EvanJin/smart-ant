# 支持的代码文件类型

Smart Ant 插件会自动识别以下代码文件类型：

## 编程语言

### JavaScript / TypeScript
- `.js` - JavaScript
- `.jsx` - React JSX
- `.ts` - TypeScript
- `.tsx` - React TypeScript
- `.mjs` - ES Module JavaScript
- `.cjs` - CommonJS JavaScript

### Python
- `.py` - Python
- `.pyw` - Python Windows
- `.pyx` - Cython

### Java / Kotlin
- `.java` - Java
- `.kt` - Kotlin
- `.kts` - Kotlin Script

### C / C++
- `.c` - C
- `.cpp` - C++
- `.cc` - C++
- `.cxx` - C++
- `.h` - C/C++ Header
- `.hpp` - C++ Header
- `.hxx` - C++ Header

### C#
- `.cs` - C#
- `.csx` - C# Script

### Go
- `.go` - Go

### Rust
- `.rs` - Rust

### PHP
- `.php` - PHP
- `.phtml` - PHP HTML

### Ruby
- `.rb` - Ruby
- `.rake` - Rake

### Swift
- `.swift` - Swift

### Objective-C
- `.m` - Objective-C
- `.mm` - Objective-C++

### Shell
- `.sh` - Shell Script
- `.bash` - Bash Script
- `.zsh` - Zsh Script
- `.fish` - Fish Script

### SQL
- `.sql` - SQL

### R
- `.r` - R
- `.R` - R

### Dart
- `.dart` - Dart

### Scala
- `.scala` - Scala

### Lua
- `.lua` - Lua

### Perl
- `.pl` - Perl
- `.pm` - Perl Module

### Elixir
- `.ex` - Elixir
- `.exs` - Elixir Script

### Haskell
- `.hs` - Haskell

### Clojure
- `.clj` - Clojure
- `.cljs` - ClojureScript

## Web 开发

### HTML
- `.html` - HTML
- `.htm` - HTML

### CSS
- `.css` - CSS
- `.scss` - Sass
- `.sass` - Sass
- `.less` - Less

### 前端框架
- `.vue` - Vue.js
- `.svelte` - Svelte

## 配置文件

- `.json` - JSON
- `.yaml` - YAML
- `.yml` - YAML
- `.toml` - TOML
- `.xml` - XML
- `.ini` - INI
- `.conf` - Configuration

## 文档

- `.md` - Markdown
- `.markdown` - Markdown
- `.rst` - reStructuredText
- `.txt` - Text

## 其他

- `.graphql` - GraphQL
- `.proto` - Protocol Buffers
- `.thrift` - Apache Thrift

## 自定义扩展

如果需要添加更多文件类型，可以修改 `src/workspace/index.ts` 中的 `CODE_EXTENSIONS` 常量。

```typescript
const CODE_EXTENSIONS = new Set([
  // 在这里添加新的扩展名
  '.your_extension',
  // ...
]);
```

