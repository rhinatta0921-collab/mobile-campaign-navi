# Campaigns

楽天モバイル公式の[キャンペーン一覧](https://network.mobile.rakuten.co.jp/campaign/)に掲載された情報を管理します。

- `*.campaign.json`: 個別キャンペーン。1キャンペーンコードにつき1JSON
- `index.json`: 取得日、公式一覧のカード件数、JSONファイル一覧
- `index.ts`: `*.campaign.json`を一括で読み込み、ランキング用の型と関数を提供
- `banners/`: キャンペーンバナー画像

同じコードが複数の掲載カードに現れた場合は、1つのJSONの`sourceCards`へ統合します。1枚の掲載カードが複数コードの合算特典を案内している場合は、コードごとのJSONへ分割します。

公式ページにキャンペーンコードがない掲載カードは、URL由来の`NO-CODE-*`を補助コードとして使い、`codeType`を`generated`にします。公式に「施策コード」として案内されるものは、`codeType`を`initiative`にします。

固定ポイント額を持つデータだけがランキング対象です。値引き、特価、無料期間、倍率、抽選などは`benefit`へ保存し、ポイントランキングには混ぜません。

## 更新

```sh
node scripts/sync-rakuten-campaigns.mjs
```

同期スクリプトは公式一覧が52枚であることを確認し、現在のコード対応表を使ってJSONを再生成します。公式一覧の構成が変わった場合は、安全のため件数エラーで停止します。
