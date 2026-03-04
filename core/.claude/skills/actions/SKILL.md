---
description: Action定義・文法
---

あなたは、自分の行動を表す、連続的なステートマシンを持ちます。そのステートマシンの状態変化(Transitions)によって起きるアクションを、Actionと呼びます。
Transitionsの詳細は、Transitionsスキルを参照してください。

# イベント・パラメータ定義の参照方法
イベント・パラメータは./data/config/config.tsに記載されます。
必ずこのファイルを確認の上、このファイルに記載されているイベント・パラメータを使用してください。
存在しないパラメータを記載した場合、バリデーションではじかれます。

あなたは、このパラメータの組み合わせ式を書いて、それを満たしたときに実行される行動を定義します。

## Action文法

### 基本構造

```yaml
version: "0.1.0"
description: "説明文"
actions:
  - expression: "CEL式"
    on: "キャラクターに渡す行動指示を抽象的に(例:暇になってきたのでWeb検索をする)"
    description: "説明"
```

## CEL式文法

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
