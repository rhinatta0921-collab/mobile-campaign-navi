# 楽天モバイル キャンペーン比較ナビ

端末・ルーター購入が不要で、楽天モバイル回線または対象モバイルプランの申し込み・利用開始が特典の直接条件となるキャンペーンを、MNP・新規番号別の獲得ポイント順で比較するNext.jsサイトです。閲覧時に外部APIへ接続せず、検証済みのJSONと公式画像をビルドへ含めて配信します。

## 開発と検証

```sh
npm run dev
npm run lint
npm run build
npm test
```

`npm run build`は、Cloudflare Workers Static Assetsへ配置する静的ファイルを`out/`へ生成します。Workerエントリーポイントは、ホスト別の転送とプレビュー向け`noindex`を処理してから`ASSETS` bindingへ配信を委譲します。

## Cloudflare Workers Builds

正式URLは`https://r-mobile.kuraberaku.com`です。`wrangler.jsonc`ではこのホストを既存WorkerのCustom Domainとして宣言します。以前の正式URL`https://rmobile.kuraberaku.com`は停止し、転送しません。旧Workers本番URLを301転送するため`workers_dev`は維持し、外部公開が不要なVersion Preview URLsは無効にします。

旧Workers本番URL`https://rakuten-mobile-campaign-navi.r-hinatta0921.workers.dev`は、パスとクエリを保持して正式URLへ301転送します。Pagesの通常URL`https://rakuten-mobile-campaign-navi.pages.dev`はCloudflare Bulk Redirectsで正式URLへ301転送し、`Include subdomains`を有効にしてハッシュ・ブランチプレビューも転送対象に含めます。いずれもサブパスとクエリを保持します。

Cloudflare Zero Trust / Accessは有効化しません。WorkersプレビューはURL自体を無効化し、Pagesプレビューは正式URLへ転送することで、別内容を一般公開しない構成にします。将来プレビューを再び有効にした場合の防御として、Workerエントリーポイントと`public/_headers`の`X-Robots-Tag: noindex`は維持します。既存のWorkerバージョン、Pagesプロジェクト、Pagesデプロイは削除しません。

Workers Buildsは次の設定を使用します。

- Production branch: `main`
- Root directory: リポジトリルート
- Build command: `npm run build`
- Production deploy command: `npx wrangler versions upload`
- Non-production deploy command: `npx wrangler versions upload`
- Non-production branch builds: 全ブランチで有効

Productionを含むすべてのビルドはまずWorkerバージョンとして保存し、確認後に対象バージョンをActive Deploymentへ昇格します。バージョン固有の公開プレビューURLは生成しません。設定の事前検証は次のコマンドで実行できます。

```sh
npx wrangler versions upload --dry-run
```

## アクセス解析

Google Analytics 4は正式ホスト`r-mobile.kuraberaku.com`と完全一致する場合だけ読み込みます。Cloudflareのブランチ・バージョンプレビュー、旧ホスト、ローカル環境からは計測データを送信しません。

全キャンペーン公式リンクを`official_link_click`として記録し、社員紹介の申込リンクは追加で`employee_referral_click`として記録します。公開前のプレビューではテスト用の受信関数を使い、Googleへ送信せずイベント内容を確認します。

## Search Console

所有権確認には、トップページの`google-site-verification`メタタグを使用します。CloudflareのHTML URL正規化によるリダイレクトを避けるため、確認HTMLファイルは配信しません。canonical、Open Graph、X、JSON-LD、robots.txt、sitemap.xmlは正式URLへ統一します。

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
