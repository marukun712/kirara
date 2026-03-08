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
    initial: 0.0 ~ 1.0
```

## 用途
このパラメータは、Utility AIの基本となるパラメータで、Transitionsで変化し、Actionsで行動決定の計算に用いられます。

# 注意
すべてのパラメータは0~1の数値型で変動します
