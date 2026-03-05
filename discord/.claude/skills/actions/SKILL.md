---
name: actions
description: Action定義を更新する方法・Actions文法
---

## Action文法

### 基本構造

```yaml
actions:
  - expression: "CEL式"
    on: "キャラクターの行動"
    description: "説明"
```

# 注意
すべてのパラメータは0~1で変動します
パラメータにアクセスするときは必ずparams.<param-name>を使用してください。
