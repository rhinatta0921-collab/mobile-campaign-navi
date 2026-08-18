# 楽天モバイル キャンペーン比較ナビ

楽天モバイルの申込キャンペーンを、MNP・新規番号別の獲得ポイント順で比較するNext.jsサイトです。閲覧時に外部APIへ接続せず、検証済みのJSONと公式画像をビルドへ含めて配信します。

## 開発と検証

```sh
npm run dev
npm run lint
npm run build
npm test
```

`npm run build`は、Cloudflare Workers Static Assetsへそのまま配置できる静的ファイルを`out/`へ生成します。

## データ更新

同期は閲覧者のアクセス時には動きません。運用者が明示的に実行し、確認後にビルド・公開したときだけサイトへ反映されます。

```sh
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --check
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --write
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --check
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
npm run optimize:png -- --write
npm run check:assets
```

`--write`がない同期はファイルを変更しません。キャンペーン同期は一時ディレクトリで全件を生成・検証した後に切り替え、記事、申込URL、手動補正は`data/campaigns/curated-overrides.json`から再結合します。
