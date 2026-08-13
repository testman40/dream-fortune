# 夢占い Ver1.0

スマートフォンで夢のキーワードをすぐに調べられる、外部API・ログイン不要の静的PWAです。夢辞書、文章内の複数キーワード検索、カテゴリ／あいうえお順表示、履歴、お気に入りを備えています。入力内容や保存データを外部へ送信しません。

> 本アプリの夢占いは一般的な夢占い・象徴的解釈を参考にした娯楽コンテンツです。医学的・心理学的診断を行うものではありません。

## ファイル構成

```text
dream-fortune/
├─ index.html              # SPAの画面構造
├─ css/style.css           # モバイル優先の表示
├─ js/
│  ├─ app.js               # 画面制御と描画
│  ├─ search.js            # 検索・並び替え
│  ├─ storage.js           # 履歴・お気に入り
│  └─ pwa.js               # SW登録・インストール導線
├─ data/dreams.json        # 夢占い辞書
├─ assets/icons/icon.svg   # 差し替え可能な仮アイコン
├─ manifest.json
├─ sw.js
└─ README.md
```

## ローカル実行

ES Modules、JSON取得、Service Workerを使うため、`index.html`を直接開かずHTTPサーバーを利用してください。

```powershell
cd D:\CodexWork\dream-fortune
python -m http.server 8080
```

ブラウザで `http://localhost:8080/` を開きます。Pythonがない場合は、任意の静的HTTPサーバーでも構いません。依存パッケージやビルドは不要です。

## PWA確認

1. localhostまたはHTTPS環境で開く。
2. DevToolsのApplicationでManifestとService Workerの登録を確認する。
3. 一度オンラインで読み込み、Service Workerが有効になった後にOfflineへ切り替えて再読み込みする。
4. ホーム、辞典、履歴、お気に入りと辞書検索が使えることを確認する。
5. 対応ブラウザでは、ブラウザメニューまたは画面上部の「アプリを追加」からホーム画面へ追加する。

Service Workerを更新した場合は、`sw.js` の `CACHE_NAME` を変更してください。

## 夢占いデータの追加方法

`data/dreams.json` の配列に、既存項目と同じ構造で追加します。

```json
{
  "id": "unique-id",
  "keyword": "夢の語句",
  "reading": "よみがな",
  "category": "動物",
  "aliases": ["別名", "関連検索語"],
  "summary": "一般的な夢占いでは〜と解釈されることがあります。",
  "positive": "良い意味としての説明",
  "caution": "注意する意味としての説明",
  "patterns": [{"title": "状況名", "text": "状況別の説明"}],
  "related": ["other-id"]
}
```

- `id` は半角英数字とアンダースコアで一意にします。
- `reading` はあいうえお順の分類に使うため、ひらがなで記述します。
- `aliases` も検索対象です。入力文に含まれそうな自然な別表現を登録します。
- `category` は既存9カテゴリのいずれかを推奨します。カテゴリを増やす場合は `js/app.js` のカテゴリ定義も追加します。
- `related` には存在する項目の `id` を指定します。
- 断定的な診断を避け、象徴的な娯楽解釈であることが伝わる文章にします。

## 公開方法

このフォルダの内容をそのままHTTPS対応の静的ホスティングへ配置できます。GitHub Pagesでサブディレクトリ公開しても動くよう、URLは相対パスで記述しています。公開前にホスティング先でManifest、Service Workerのscope、アイコン、オフライン動作を再確認してください。

本作業では公開、Git操作、デプロイは行っていません。

## 今後拡張する場合の注意点

- 辞書が300〜500件を超えても、データはJSONに保ち、UIコードへ直接埋め込まないでください。
- データ形式を変える場合は、互換性や移行方法を決めてから更新してください。
- localStorageのキー末尾はデータ形式の版です。保存形式の破壊的変更時は移行処理を用意してください。
- API、アカウント、クラウド同期、個人情報取得を追加する場合は、プライバシー設計とユーザー同意を別工程で検討してください。
- 正式アイコンへ差し替える場合はManifestとService Workerのキャッシュ一覧も更新してください。
