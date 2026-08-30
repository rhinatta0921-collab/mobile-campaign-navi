# 楽天モバイル キャンペーン比較ナビ

端末・ルーター購入が不要で、楽天モバイル回線または対象モバイルプランの申し込み・利用開始が特典の直接条件となるキャンペーンを、MNP・新規番号別の獲得ポイント順で比較するNext.jsサイトです。閲覧時に外部APIへ接続せず、検証済みのJSONと公式画像をビルドへ含めて配信します。

## 開発と検証

```sh
npm run dev
npm run lint
npm run build
npm test
```

`npm run build`は、Cloudflare Workers Static Assetsへ配置する静的ファイルを`out/`へ生成します。リクエストはWorkerコードを経由せず、Cloudflareが`out/`の静的ファイルを直接配信します。

## Cloudflare Workers Builds

正式URLは`https://r-mobile.kuraberaku.com`です。`wrangler.jsonc`ではこのホストだけを既存WorkerのCustom Domainとして宣言します。以前の正式URL`https://rmobile.kuraberaku.com`は停止し、転送しません。

`workers_dev`とVersion Preview URLsは無効にし、Pagesプロジェクトも使用しません。正式URL以外に本番コンテンツを配信・転送する公開経路は設けません。Cloudflare Zero Trust / Accessは有効化しません。

Workers Buildsは次の設定を使用します。

- Production branch: `main`
- Root directory: リポジトリルート
- Build command: `npm run build`
- Production deploy command: `npx wrangler deploy`
- Non-production deploy command: `npx wrangler versions upload`
- Non-production branch builds: 全ブランチで有効

`main`のビルドだけをActive Deploymentへ反映し、非本番ブランチはWorkerバージョンの保存までに留めます。バージョン固有の公開プレビューURLは生成しません。設定の事前検証は次のコマンドで実行できます。

```sh
npx wrangler deploy --dry-run
```

## アクセス解析

Google Analytics 4は正式ホスト`r-mobile.kuraberaku.com`と完全一致する場合だけ読み込みます。Cloudflareのブランチ・バージョンプレビュー、旧ホスト、ローカル環境からは計測データを送信しません。

全キャンペーン公式リンクを`official_link_click`として記録し、社員紹介の申込リンクは追加で`employee_referral_click`として記録します。公開前のプレビューではテスト用の受信関数を使い、Googleへ送信せずイベント内容を確認します。

## Search Console

所有権確認には、トップページの`google-site-verification`メタタグを使用します。CloudflareのHTML URL正規化によるリダイレクトを避けるため、確認HTMLファイルは配信しません。canonical、Open Graph、X、JSON-LD、robots.txt、sitemap.xmlは正式URLへ統一します。

## データ更新

同期は閲覧者のアクセス時には動きません。`.github/workflows/campaign-sync.yml`が毎日6:07 JSTに`main`をチェックアウトし、同時実行を禁止して候補を検証します。手動実行では`report`または`apply`を選択できます。

```sh
npm run sync:campaigns:auto -- --checked-at=YYYY-MM-DD --write
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --check
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --write
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --check
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
npm run optimize:png -- --write
npm run check:assets
```

自動同期は公式一覧と詳細ページを正規化・ハッシュ化し、新規、内容変更、終了、一覧からの消失を判定します。内容が変わらない個別JSONは維持し、正常比較できた日も`lastSuccessfulCheckAt`だけを進めます。1回だけの一覧消失は掲載を維持し、2回連続の消失、終了表記、3回確認後の404/410、過去キャンペーンページへの移動で`archive/`へ移します。前日比が10件超かつ20%超、一覧解析不能、URL由来コード衝突の場合は全体を反映しません。

新規・変更ページはルール抽出後にOpenAI Responses APIの厳格なJSON Schemaで構造化します。既定モデルは`gpt-5.6-terra`、保存は`store: false`です。ポイントは公式本文の根拠と内訳を検証してコードで再計算し、不足があれば`pending`として非掲載にします。編集記事、固定記事、専用申込URL、広告属性、手動補正は`data/campaigns/curated-overrides.json`を常に優先します。

GitHub Actionsには次を設定します。

- Secrets: `OPENAI_API_KEY`、`SLACK_WEBHOOK_URL`
- Variables: `CAMPAIGN_AUTOMATION_MODE`（未設定時は`report`）、任意で`OPENAI_CAMPAIGN_MODEL`

導入後3日間は`CAMPAIGN_AUTOMATION_MODE=report`のままにし、Actionsの`campaign-sync-YYYY-MM-DD`成果物と現在の手動結果を照合します。3日連続で一致したらCloudflare Workers BuildsのProduction deploy commandを`npx wrangler deploy`に設定し、`CAMPAIGN_AUTOMATION_MODE=apply`へ変更します。`apply`では画像、スキーマ、lint、build、全テスト、安全判定を通過した生成物だけを日付付きコミットとして`main`へpushし、本番HTMLのカタログバージョンと最終確認日まで照合します。

試運転中は変更なしを含む実行結果を毎日Slackへ通知します。`apply`移行後は、安全な内容変更、保留、異常差分、取得、AI、画像、検証、公開の失敗、障害からの復旧を通知し、正常終了かつ変更なしでは通知しません。通知本文には対象URLとGitHub Actionsの実行URLを含め、詳細レポートは30日間の成果物として保存します。
