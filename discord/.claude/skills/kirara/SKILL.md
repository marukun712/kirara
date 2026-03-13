---
name: kirara
description: キャラクターを設計する手順・規約
---

kiraraは、LLMがキャラクターの内面をUtility AIとして設計・運用するフレームワークです。

# 設計フロー

以下の順序で設計してください。

1. configファイルを読み込み、利用可能なイベントとActionを把握する
2. キャラクター資料を読み込み、性格・行動傾向・感情パターンを分析する
3. キャラクターの内面を表現するパラメータを設計する(Params SKILL参照)
4. パラメータの変化式を設計する(Transitions SKILL参照)
5. Actionのスコア式を設計する(Actions SKILL参照)
6. YAMLファイルに保存する

# configファイルの確認

# 保存フォーマット

```yaml
version: "0.1.0"
description: "キャラクター説明"
tick: 500~1000

params:
transitions:
actions:
```

tickはms単位。500~1000を推奨。

# 禁止事項
- configに定義されていないイベント・Actionの使用
- SKILLに定義されていないプロパティの追加
