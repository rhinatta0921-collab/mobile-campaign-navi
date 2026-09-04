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

Codexを使わずに日常確認、`pending`判定、台帳編集、手動実行、障害対応を行う場合は、[キャンペーン自動運用 操作者向け完全マニュアル](docs/campaign-automation-operator-manual.md)を参照してください。

同期は閲覧者のアクセス時には動きません。`.github/workflows/campaign-sync.yml`が毎日6:17 JSTに`main`をチェックアウトし、同時実行を禁止して候補を検証します。手動実行では`report`または`apply`を選択できます。

```sh
npm run sync:campaigns:auto -- --checked-at=YYYY-MM-DD --write
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --check
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --write
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --check
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
npm run optimize:png -- --write
npm run check:assets
```

自動同期は公式一覧と詳細ページを正規化・ハッシュ化し、新規、内容変更、終了、一覧からの消失を判定します。内容が変わらない個別JSONは維持し、正常比較できた日も`lastSuccessfulCheckAt`だけを進めます。一覧消失は実行回数ではなく確認日で数え、同日再実行では増やしません。異なる2日で連続して消失した場合、終了表記、3回確認後の404/410、過去キャンペーンページへの移動で`archive/`へ移します。前日比が10件超かつ20%超、一覧解析不能、URL由来コード衝突の場合は全体を反映しません。

検証をすべて通過した候補は、診断用成果物とは別の`campaign-baseline-v1-<run-id>` Artifactとして30日保存します。次回は、この基準の確認日が`main`より新しい場合だけ生成JSONとアーカイブを比較基準として復元します。同日または古ければ`main`を使い、対応形式のArtifactが破損・不整合なら安全のため全体停止します。画像はArtifactから復元せず、現在の公開画像を基準に毎回同期します。

新規・変更ページはルール抽出後に、選択したAI APIの厳格なJSON Schemaで構造化します。`CAMPAIGN_AI_PROVIDER`を`openai`または`anthropic`へ変更するだけで切り替えられ、自動フォールバックはしません。既定はOpenAI Responses APIの`gpt-5.6-terra`で、`store: false`です。AnthropicではMessages APIの`claude-sonnet-5`を使用します。ポイントは公式本文の根拠と内訳を検証してコードで再計算し、不足があれば`pending`として非掲載にします。内容が変わっていない`pending`は定時実行でAIへ再送せず、人が`published`または`excluded`を`data/campaigns/curated-overrides.json`へ登録するまで非掲載で保持します。編集記事、固定記事、専用申込URL、広告属性、手動補正は同ファイルを常に優先します。

AIへ渡すのは公式詳細ページの`main`本文だけで、1ページ80,000文字、出力4,000トークン、1実行10回、推定費用2 USDを既定上限とします。同じ公式URL・本文ハッシュは1回だけ処理し、利用トークンと推定費用をレポートおよびSlackへ記録します。既定単価はOpenAI `gpt-5.6-terra`を入力2 USD／出力12 USD、Anthropic `claude-sonnet-5`を安全側に入力3 USD／出力15 USD（各100万トークン）として計算します。モデルを変更する場合は単価Variablesも必ず設定します。

GitHub Actionsには次を設定します。

- Secrets: `OPENAI_API_KEY`、`SLACK_WEBHOOK_URL`。Anthropicを使う場合だけ`ANTHROPIC_API_KEY`
- Variables: `CAMPAIGN_AUTOMATION_MODE`（未設定時は`report`）、`CAMPAIGN_AI_PROVIDER`（未設定時は`openai`）
- モデルVariables: `OPENAI_CAMPAIGN_MODEL`または`ANTHROPIC_CAMPAIGN_MODEL`
- 安全上限Variables: `CAMPAIGN_AI_MAX_INPUT_CHARS`、`CAMPAIGN_AI_MAX_OUTPUT_TOKENS`、`CAMPAIGN_AI_MAX_CALLS`、`CAMPAIGN_AI_MAX_BUDGET_USD`
- 未登録モデル用単価Variables: `CAMPAIGN_AI_INPUT_USD_PER_MILLION`、`CAMPAIGN_AI_OUTPUT_USD_PER_MILLION`

`report`では`main`を変更しませんが、検証済み基準Artifactを次回へ引き継ぐため、同じ公式差分を毎日新規変更として数え直しません。`apply`では画像、スキーマ、lint、build、全テスト、安全判定を通過した生成物だけを日付付きコミットとして`main`へpushし、本番HTMLのカタログバージョンと最終確認日まで照合します。

試運転中は変更なしを含む実行結果を毎日Slackへ通知します。`apply`移行後は、安全な内容変更、保留、異常差分、取得、AI、画像、検証、公開の失敗、障害からの復旧を通知し、正常終了かつ変更なしでは通知しません。通知本文には対象URLとGitHub Actionsの実行URLを含め、詳細レポートは30日間の成果物として保存します。
