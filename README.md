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

## Cloudflare Workers Builds

CloudflareではWorkerスクリプトを使わず、`wrangler.jsonc`の`assets.directory`に指定した`out/`だけをWorkers Static Assetsとして配信します。

本番URLは`https://rakuten-mobile-campaign-navi.r-hinatta0921.workers.dev`です。ブランチ・バージョンのプレビューURLには`public/_headers`から`X-Robots-Tag: noindex`を付与し、本番URLだけを対象外にします。

Workers Buildsは次の設定を使用します。

- Production branch: `main`
- Root directory: リポジトリルート
- Build command: `npm run build`
- Production deploy command: `npx wrangler versions upload`
- Non-production deploy command: `npx wrangler versions upload`
- Non-production branch builds: 全ブランチで有効

フェーズ6で一般公開するまでは、Productionを含むすべてのビルドをVersion previewとして保存し、Active Deploymentへ昇格させません。設定の事前検証は次のコマンドで実行できます。

```sh
npx wrangler versions upload --dry-run
```

## アクセス解析

Google Analytics 4は本番workers.devホストと完全一致する場合だけ読み込みます。Cloudflareのブランチ・バージョンプレビューとローカル環境からは計測データを送信しません。

全キャンペーン公式リンクを`official_link_click`として記録し、社員紹介の申込リンクは追加で`employee_referral_click`として記録します。公開前のプレビューではテスト用の受信関数を使い、Googleへ送信せずイベント内容を確認します。

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
