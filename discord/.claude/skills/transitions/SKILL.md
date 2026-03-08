---
name: transitions
description: Transitionsを更新する方法・Transitionsの文法
---

# Transitions文法

## 基本構造

```yaml
transitions:
  - on: "イベント名"
    param: "パラメータ名"
    expression: "パラメータ変化式(mathjs)"
    description: "説明"
```

## 用途
このTransitionsは、あなたの内部パラメータを時間変化や外界からの刺激で変化させるために使用されます。

# 注意
すべてのパラメータは0~1の数値型で変動します
イベントのプロパティにアクセスするには、event.<param-name>を使用してください
パラメータには、params.<param-name>でアクセスしてください。
