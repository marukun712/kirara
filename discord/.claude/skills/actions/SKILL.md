---
name: actions 
description: Actions定義の方法・文法
---

# Actions文法

## 基本構造

```yaml
actions:
  - name: "Action名"
    expression: "Actionスコア式(mathjs)"
```

## 用途
あなたが設計するUtility AIは、tickごとにこのすべてのActionに対するAction式を計算し、スコアを算出して、最も高いものを行動として決定します。

# 注意
すべてのパラメータは0~1の数値型で変動します
アクション名は必ずconfigファイルで定義されているもののみを使用してください。
パラメータには、params.<param-name>でアクセスしてください

