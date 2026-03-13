---
name: actions
description: Actions定義を更新する方法・文法
---

# Actionとは

Actionはキャラクターが取りうる行動です。
tickごとに全Actionのスコアを計算し、最も高いものが実行されます。

# 文法

```yaml
actions:
  - name: "Action名"
    expression: "スコア式(mathjs)"
```

- nameはconfigで定義されたAction名のみ使用可能
- パラメータには `params.<n>` でアクセス
- スコアは大きいほど選ばれやすくなります

