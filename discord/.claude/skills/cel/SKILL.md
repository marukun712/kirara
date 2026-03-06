---
name: cel
description: CELの文法・型システム・組み込み関数の完全リファレンス
---

# CEL（Common Expression Language）スキル

## 言語の特性（重要）

CELを使う上で必ず意識すべき特性:

- **副作用なし**: CEL式は入力から出力を計算するだけ。変数の変更・I/O不可
- **終了保証**: 無限ループなし（ループ構文自体が存在しない）
- **強い型付け + 動的型付け**: 値に型が紐づく。型チェックはランタイムで行われる（静的チェックはオプション）
- **エラーは伝播する**: ランタイムエラーは基本的に式全体を失敗させる（論理演算子・マクロの短絡評価を除く）
- **評価順序は未定義**: 副作用がないため、部分式の評価順は実装依存

---

## 型システム

| 型 | 説明 | リテラル例 |
|---|---|---|
| `int` | 64ビット符号付き整数 | `42`, `-7` |
| `uint` | 64ビット符号なし整数 | `42u`, `0u` |
| `double` | 64ビット IEEE 754 浮動小数点 | `3.14`, `7e0`, `.7e1` |
| `bool` | 真偽値 | `true`, `false` |
| `string` | Unicodeコードポイント列 | `"hello"`, `'world'` |
| `bytes` | バイト列 | `b"abc"`, `b'\xff'` |
| `list` | 値の順序付きリスト | `[1, 2, 3]` |
| `map` | 連想配列（キー: int/uint/bool/string） | `{"key": 1}` |
| `null_type` | null値 | `null` |
| message名 | Protocol Bufferメッセージ | `MyMsg{field: val}` |
| `type` | 型そのものを表す値 | `type(1)` → `int` |

### 数値型の注意点

```
// 型が違うとそのままでは演算できない → エラー
1 + 1u  // NG: no_matching_overload

// 明示的な型変換が必要
uint(1) + 1u  // OK: 2u
```

- 負の整数リテラルは存在しない。`-7` は単項否定演算子 `-` を `7` に適用したもの
- `int` と `uint` と `double` の混在演算は**自動変換されない**
- ただし**比較演算子とイコール**は実行時に数値型をまたいで比較できる（JSON対応のため）

```
dyn(3.0) == 3     // true（実行時の数値等価）
-1 < dyn(1u)      // true
```

### 文字列リテラル

```
"hello"           // ダブルクォート
'hello'           // シングルクォート
"""複数行
文字列"""          // トリプルクォート（改行可）
r"raw\nstring"    // rawプレフィックス: エスケープ処理しない → \nは改行でなく\n
b"bytes"          // バイトリテラル
```

エスケープシーケンス（rawでない場合のみ）:
- `\n` 改行, `\t` タブ, `\\` バックスラッシュ, `\"` ダブルクォート
- `\uXXXX` Unicode（BMP）, `\UXXXXXXXX` Unicode（全平面）
- `\xXX` 16進, `\OOO` 8進

---

## 演算子一覧（優先度順）

| 優先度 | 演算子 | 説明 | 結合 |
|---|---|---|---|
| 1（高） | `()` `.` `[]` `{}` | 関数呼び出し・フィールドアクセス・インデックス | 左→右 |
| 2 | `-`（単項）`!` | 否定・論理NOT | 右→左 |
| 3 | `*` `/` `%` | 乗除余 | 左→右 |
| 4 | `+` `-`（二項） | 加減 | 左→右 |
| 5 | `==` `!=` `<` `>` `<=` `>=` `in` | 比較・包含 | 左→右 |
| 6 | `&&` | 論理AND | 左→右 |
| 7 | `\|\|` | 論理OR | 左→右 |
| 8（低） | `?:` | 三項条件 | 右→左 |

### 論理演算子の特殊動作（重要）

CELの `&&` と `||` は**可換（commutative）**で、エラーを吸収できる。

```
false && error  // false（errorを無視）
true  || error  // true（errorを無視）
error && false  // false（errorを無視）
error || true   // true（errorを無視）

error && true   // error（決定できないのでerrorが残る）
error || false  // error（決定できないのでerrorが残る）
```

C言語的な左→右の短絡評価が必要な場合は三項演算子で代替:
```
// e1 && e2 の左→右短絡評価
e1 ? e2 : false

// e1 || e2 の左→右短絡評価
e1 ? true : e2
```

### 三項演算子

```
condition ? value_if_true : value_if_false

true  ? 1 : 2             // 1
false ? "a" : "b"         // "b"
true  ? error : value     // error（trueブランチが評価される）
false ? error : value     // value（falseブランチのみ評価）
(2 < 5) ? 'yes' : 'no'   // 'yes'
```

---

## 組み込み関数・演算子リファレンス

### 算術

```
// 整数
5 + 3   // 8
5 - 3   // 2
5 * 3   // 15
7 / 2   // 3（整数除算、切り捨て）
7 % 2   // 1
-(5)    // -5

// 浮動小数点
3.14 + 1.59  // 4.73
7.0 / 2.0    // 3.5
-(3.14)      // -3.14

// 符号なし整数
6u % 3u   // 0u
13u * 3u  // 39u

// 文字列・バイト・リスト の連結
"Hello, " + "world!"  // "Hello, world!"
b"abc" + b"def"       // b"abcdef"
[1] + [2, 3]          // [1, 2, 3]

// 時間演算
duration('1m') + duration('1s')                          // duration('1m1s')
timestamp('2023-01-01T00:00:00Z') + duration('24h')      // timestamp('2023-01-02T00:00:00Z')
timestamp('2023-01-10T12:00:00Z') - timestamp('2023-01-10T00:00:00Z')  // duration('12h')
duration('1m') - duration('1s')                          // duration('59s')
```

> オーバーフロー時はエラー（int/uint/timestamp/duration のみ。doubleはIEEE754に従いInf/NaNになる）

### 比較

```
1 == 1          // true
"a" != "b"      // true
2 < 3           // true
3 >= 3          // true
'a' <= 'b'      // true（辞書順）

// NaN の比較（IEEE 754）
// NaN == NaN → false
// NaN != NaN → true
```

### in 演算子

```
// リスト内包チェック（O(n)）
2 in [1, 2, 3]        // true
"a" in ["b", "c"]     // false

// マップキー存在チェック（期待値O(1)）
'key1' in {'key1': 'value1', 'key2': 'value2'}  // true
3 in {1: "one", 2: "two"}                        // false
```

### size()

```
"hello".size()            // 5（Unicodeコードポイント数）
size("world!")            // 6
b'hello'.size()           // 5（バイト数）
size(b'\xF0\x9F\xA4\xAA') // 4
['a', 'b', 'c'].size()    // 3
size([1, 2])              // 2
{'a': 1}.size()           // 1
size({1: true, 2: false}) // 2
```

### 文字列関数

```
// 部分文字列チェック（O(|s| * |sub|)）
"hello world".contains("world")   // true
"foobar".contains("baz")          // false

// 前方・後方一致
"hello world".startsWith("hello") // true
"foobar".endsWith("bar")          // true

// 正規表現マッチ（RE2構文、部分一致）
matches("foobar", "foo.*")        // true
"foobar".matches("foo.*")         // true
// 完全一致にする場合はアンカーを使う
"foobar".matches("^foobar$")      // true

// 大文字・小文字変換（拡張関数として実装依存の場合あり）
'apple'.upperAscii()   // 'APPLE'
```

### 型変換関数

```
// bool
bool(true)     // true
bool("true")   // true
bool("FALSE")  // false

// int
int(3.14)    // 3（ゼロ方向に丸め）
int("123")   // 123
int(123u)    // 123
// int(google.protobuf.Timestamp) → Unix秒

// uint
uint(3.14)   // 3u
uint("123")  // 123u
uint(-1)     // エラー（範囲外）

// double
double(10)      // 10.0
double("3.14")  // 3.14

// string
string(123)           // "123"
string(123u)          // "123"（実装依存で"123u"の場合も）
string(3.14)          // "3.14"
string(b'hello')      // "hello"
string(true)          // "true"
string(duration('1m1ms'))  // "60.001s"
// string(timestamp) → RFC3339形式

// bytes
bytes("hello")  // b'hello'

// duration
duration("1h30m")   // 1時間30分
duration("0")       // ゼロ duration
duration("-1.5h")   // -90分
// サフィックス: h, m, s, ms, us, ns
// 日・週は未サポート（ロケール依存のため）

// timestamp
timestamp("2023-08-26T12:39:00-07:00")  // RFC3339形式で変換

// dyn（型チェッカーへのヒント、実行時は無効）
dyn(123)     // 型チェック時にdynとして扱う
```

### 型確認

```
type(1)          // int
type("hello")    // string
type(true)       // bool
type(null)       // null_type
type(type(1))    // type
type(1) == int   // true（型値との比較）
```

### 日時関数（google.protobuf.Timestamp）

タイムゾーン引数省略時はUTC。引数はJoda形式（`"America/Los_Angeles"`, `"UTC"`, `"+09:00"` など）

```
timestamp("2023-12-25T00:00:00Z").getFullYear()          // 2023
timestamp("2023-12-25T00:00:00Z").getMonth()             // 11（0始まり、11=12月）
timestamp("2023-12-25T00:00:00Z").getDate()              // 25（1始まり）
timestamp("2023-12-25T00:00:00Z").getDayOfMonth()        // 24（0始まり）
timestamp("2023-12-25T12:00:00Z").getDayOfWeek()         // 1（0=日曜）
timestamp("2023-12-25T12:00:00Z").getDayOfYear()         // 358（0始まり）
timestamp("2023-12-25T12:30:00Z").getHours()             // 12
timestamp("2023-12-25T12:30:00Z").getMinutes()           // 30
timestamp("2023-12-25T12:30:30Z").getSeconds()           // 30
timestamp("2023-12-25T12:00:00.500Z").getMilliseconds()  // 500

// タイムゾーン指定例
timestamp("2023-12-25T00:00:00Z").getDate("America/Los_Angeles")  // 24（日付がずれる）
```

### 日時関数（google.protobuf.Duration）

```
duration("3h").getHours()       // 3（durationを時間に変換）
duration("1h30m").getMinutes()  // 90（durationを分に変換）
duration("1m30s").getSeconds()  // 90（durationを秒に変換）
duration("1.234s").getMilliseconds()  // 234（秒未満のms部分のみ、他と異なる挙動に注意）
```

---

## マクロ（Macros）

マクロは関数呼び出しと同じ構文だが、通常の関数と異なる型チェック・評価セマンティクスを持つ。

### has() — フィールド存在確認

```
// Protocol Bufferメッセージのフィールドが設定されているか
has(user.address)      // addressフィールドが設定されていればtrue
has(order.items)       // itemsフィールドが空でなければtrue

// マップのキー存在確認
has(m.key_name)        // マップmに"key_name"キーがあればtrue（値がnullでもtrue）
has(sessions.user_id)  // sessionsマップに"user_id"キーがあるか
```

**proto3での`has()`の挙動**:
- repeated/mapフィールド: 非空かどうか
- oneofまたはメッセージフィールド: setされているか
- その他のスカラーフィールド: デフォルト値（0, false, ""等）でないか

### all() — 全要素が条件を満たすか

```
[1, 2, 3].all(x, x > 0)                               // true
[1, 2, 0].all(x, x > 0)                               // false
['apple', 'banana', 'cherry'].all(fruit, fruit.size() > 3)  // true
{'a': 1, 'b': 2}.all(key, key != 'b')                 // false（キーに対して評価）
```

`&&` と同じく、`false`が確定した時点で他の要素のエラーを無視する。

### exists() — いずれかの要素が条件を満たすか

```
[1, 2, 3].exists(i, i % 2 != 0)                     // true
[].exists(i, i > 0)                                  // false
{'x': 'foo', 'y': 'bar'}.exists(key, key.startsWith('z'))  // false（キーに対して評価）
```

`||` と同じく、`true`が確定した時点で他の要素のエラーを無視する。

### exists_one() — 条件を満たす要素がちょうど1つか

```
[1, 2, 2].exists_one(i, i < 2)                                    // true（1のみ）
[1, 2, 3, 4].exists_one(num, num % 2 == 0)                        // false（2と4の2つ）
{'a': 'hello', 'aa': 'hellohello'}.exists_one(k, k.startsWith('a'))  // false（2つ）
```

**注意**: `exists_one` は短絡評価しない。途中でエラーが発生するとマクロ全体がエラー。

### map() — 要素を変換してリストを返す

```
// 2引数形式: 全要素を変換
[1, 2, 3].map(x, x * 2)          // [2, 4, 6]
[5, 10, 15].map(x, x / 5)        // [1, 2, 3]
['apple', 'banana'].map(fruit, fruit.upperAscii())  // ['APPLE', 'BANANA']

// マップのキーを変換
{'one': 1, 'two': 2}.map(k, k)   // ['one', 'two']（キーのリストを返す）

// 3引数形式: 条件に合う要素だけ変換（filter + mapの省略形）
[1, 2, 3, 4].map(num, num % 2 == 0, num * 2)  // [4, 8]（偶数のみ2倍）
```

### filter() — 条件を満たす要素のみ返す

```
// リストのフィルタリング
[1, 2, 3].filter(x, x > 1)                              // [2, 3]
['cat', 'dog', 'bird'].filter(pet, pet.size() == 3)      // ['cat', 'dog']

// マップのフィルタリング（キーのリストを返す）
{'one': 1, 'two': 2}.filter(k, k == 'one')              // ['one']

// ネスト例
[{'a': 10, 'b': 5, 'c': 20}].map(m, m.filter(key, m[key] > 10))  // [['c']]
```

### マクロの計算量に注意

マクロはネストすると指数的に計算量が増える場合がある:

```
// 指数的な時間計算量（絶対に書かない）
[0,1].all(x, [0,1].all(x, [0,1].all(x, 1/0)))

// 指数的な時間・空間計算量
["foo","bar"].map(x, [x+x, x+x]).map(x, [x+x, x+x])
```

---

## フィールドアクセス

```
// メッセージのフィールドアクセス
msg.field_name

// 未定義フィールドアクセス → no_such_field エラー
// 未設定フィールドアクセス → デフォルト値（数値は0、stringは""、メッセージはnull）

// マップのフィールドアクセス（文字列キーと等価）
m.key_name   // m["key_name"] と同じ
m["key"]     // 明示的なインデックスアクセス

// リストのインデックスアクセス（0始まり、O(1)）
[10, 20, 30][1]  // 20
```

---

## 名前解決

スコープ `A.B` 内での `a.b` の解決順:
1. `A.B.a.b`
2. `A.a.b`
3. `a.b`

ルートスコープを強制したい場合は先頭に `.` をつける: `.a.b`

コンプリヘンション（マクロ）内では、ループ変数が外側のスコープより優先される:
```
[1].exists(x, x == 1)   // x はローカル変数
[1].exists(x, .x == 1)  // .x はグローバル変数 x
```

---

## ランタイムエラー

| エラー | 発生条件 |
|---|---|
| `no_matching_overload` | 引数の型に合うオーバーロードが存在しない |
| `no_such_field` | マップやメッセージに指定フィールドが存在しない |
| オーバーフロー | int/uint/timestamp/durationの演算結果が範囲外 |
| ゼロ除算 | 整数の0除算（doubleは±Infを返す） |

エラーはキャッチできない。ただし:
- `&&` は `false` が確定すればエラーを無視
- `||` は `true` が確定すればエラーを無視
- `?:` は未評価ブランチのエラーを無視

---

## 注意事項まとめ

1. **コメントは使用しない**（`//` はCELの構文にない）
2. **整数と浮動小数点の混在演算は明示的変換が必要**: `int(3.14) + 1` は OK、`3.14 + 1` は NG
3. **`||`・`&&` はC言語と異なり可換**: エラーを吸収するため評価順に依存したコードは書かない
4. **マクロは指数的コストになりうる**: 深いネストや長いチェーンは避ける
5. **`+` による文字列・リスト連結はスペースコストが線形増加**: `x + x + ... + x` は `O(B * P²)`
6. **`string`のsizeはUnicodeコードポイント数**: バイト数ではない
7. **`duration` に日・週はない**: 秒・分・時間・ミリ秒・マイクロ秒・ナノ秒のみ
8. **`getMonth()` は0始まり**（0=1月、11=12月）、**`getDayOfMonth()` も0始まり**だが **`getDate()` は1始まり**
9. **`NaN == NaN` は `false`**（IEEE 754準拠）
10. **`exists_one` は短絡評価しない**: エラーが伝播する点で `all`/`exists` と異なる
