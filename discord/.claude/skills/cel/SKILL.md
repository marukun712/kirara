---
name: cel
description: CELの文法・用法
---

### 利用可能な関数・演算子

**文字列操作**:
- `size(str)`: 文字列長
- `str.contains(substr)`: 部分文字列チェック
- `str.startsWith(prefix)`, `str.endsWith(suffix)`
- `str.matches(regex)`: 正規表現マッチ

**算術演算**: `+`, `-`, `*`, `/`, `%`

**比較演算**: `<`, `<=`, `>`, `>=`, `==`, `!=`

**論理演算**: `&&`, `||`, `!`

**三項演算子**: `condition ? true_value : false_value`
