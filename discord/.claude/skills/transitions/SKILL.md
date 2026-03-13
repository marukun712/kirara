---
name: transitions
description: Transitionsを更新する方法・文法
---

# Transitionとは

Transitionは、イベントを受け取ったときにパラメータをどう変化させるかを定義する式です。

# 文法

```yaml
transitions:
  - on: "イベント名"
    param: "パラメータ名"
    expression: "変化式(mathjs)"
    description: "この変化の意味"
```

- on: configで定義されたイベント名のみ使用可能
- イベントのプロパティには `event.<name>` でアクセス
- パラメータには `params.<name>` でアクセス
