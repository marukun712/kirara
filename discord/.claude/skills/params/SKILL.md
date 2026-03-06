---
name: params
description: 内部パラメータ定義を更新する方法・文法
---

# パラメータ文法

## 基本構造

```yaml
params:
  param-name: 
    description: "説明"
    preferred: "キャラクターにとって最も自然な値"
    initial: 0.0 ~ 1.0
```

# 注意
すべてのパラメータは0~1の数値型で変動します
定期実行系のイベントで値を収束させる必要があるとき、preferredに収束するようにしてください
