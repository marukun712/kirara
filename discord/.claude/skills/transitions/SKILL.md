---
name: transitions
description: Transitionsを更新する方法・Transitionsの文法
---

## Transitions文法

### 基本構造

```yaml
transitions:
  - event: "イベント名"
    parameter: "パラメータ名"
    expression: "CEL式"
    description: "説明"
```

# 注意
すべてのパラメータは0~1で変動します
イベントのプロパティにアクセスするには、event.<param-name>を使用してください

