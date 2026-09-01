# キャンペーン自動運用 操作者向け完全マニュアル

この文書は、Codexを使わずに楽天モバイルのキャンペーン監視・判定・公開を運用する担当者向けです。通常の確認、`pending`の処理、掲載・非掲載判断、手動補正、GitHub Actionsの実行、障害対応、緊急停止、復旧までを対象にします。

## 1. 最初に覚える原則

1. 人が管理する正本は`data/campaigns/curated-overrides.json`です。
2. `data/campaigns/generated/`、`data/campaigns/archive/`、`data/campaigns/images.json`、`public/assets/campaigns/official/`はプログラムが生成します。通常は直接編集しません。
3. `pending`は非掲載です。人が`published`または`excluded`と判断するまで公開されません。
4. 内容が変わっていない`pending`を定時実行でAIへ再送しません。
5. 公式本文が変わった`pending`はAIで再解析される場合がありますが、解析成功後も人が判断するまで`pending`です。
6. ランキング、結論、詳細、除外理由、掲載件数、最終確認日は生成済みキャンペーンJSONから自動構築されます。画面の文章を直接直すのではなく、台帳を直します。
7. 変更は原則として作業ブランチとPull Requestで行い、検証後に`main`へマージします。
8. APIキー、Slack Webhook、トークンをJSON、Markdown、コミット、Issueへ記載してはいけません。

## 2. 本番構成

| 項目 | 現在の設定 |
| --- | --- |
| GitHub Repository | `rhinatta0921-collab/mobile-campaign-navi` |
| Production branch | `main` |
| 定時実行 | 毎日6:17 JST |
| GitHub Actions cron | `17 21 * * *`（21:17 UTC） |
| 本番URL | `https://r-mobile.kuraberaku.com` |
| Cloudflare Worker | `rakuten-mobile-campaign-navi` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node.js | 22.13.0以上（GitHub Actionsは22.13.0） |

GitHub Actionsの定時実行はクラウド上で動きます。Macの電源、スリープ、Chromeの起動状態には依存しません。GitHub側の混雑により開始が数分以上遅れることはあります。

## 3. ファイルの役割と編集可否

| ファイル／ディレクトリ | 役割 | 人が直接編集するか |
| --- | --- | --- |
| `data/campaigns/curated-overrides.json` | 掲載判断、記事、ポイント、条件、専用URL、補足監視URL | はい。日常運用の主な編集先 |
| `data/campaigns/generated/*.campaign.json` | 公式情報と台帳を統合した公開候補 | 原則いいえ |
| `data/campaigns/generated/index.json` | 件数、確認日、内容変更日、カタログ版 | いいえ |
| `data/campaigns/archive/*.ended.json` | 終了キャンペーンの監査記録 | いいえ |
| `data/campaigns/images.json` | 掲載画像マニフェスト | いいえ |
| `public/assets/campaigns/official/` | 取得済み公式画像 | いいえ |
| `.github/workflows/campaign-sync.yml` | 定時実行、手動実行、検証、通知、コミット | 時刻や処理を変更するときだけ |
| `scripts/automate-campaigns.mjs` | 差分判定、終了判定、候補作成、安全停止 | 通常運用では編集しない |
| `scripts/lib/campaign-automation.mjs` | ハッシュ、分類、AI Schema、根拠検証 | 通常運用では編集しない |
| `scripts/lib/campaign-ai.mjs` | OpenAI／Anthropic切替、回数・費用上限 | 通常運用では編集しない |
| `scripts/sync-campaign-images.mjs` | 公式画像の選定、取得、不要画像除去 | 通常運用では編集しない |
| `scripts/notify-campaign-sync.mjs` | Slack通知条件と通知文 | 通知仕様を変えるときだけ |
| `scripts/verify-campaign-production.mjs` | 本番のカタログ版・確認日照合 | 通常運用では編集しない |
| `data/campaigns/index.ts` | JSON検証、ランキング、結論選定 | 順位ルールを変えるときだけ |
| `app/site-config.ts` | 本番URL、GA4、特別扱いするコード | サイト全体設定を変えるときだけ |

### 直接編集してはいけない理由

`generated`配下を手で直しても、次回同期で`curated-overrides.json`と公式情報から再生成され、変更が消える可能性があります。また、`index.json`の件数、ハッシュ、カタログ版との不整合でbuildや本番照合が失敗します。

緊急修正でも、先に`curated-overrides.json`を直し、その後に自動同期コマンドで生成物を更新してください。

## 4. 状態の意味

| 状態 | 意味 | ランキング・結論・詳細への表示 |
| --- | --- | --- |
| `published` | 根拠、記事、条件、画像が揃い、掲載を人が承認 | 表示対象 |
| `excluded` | 既知だがサイトの掲載基準外 | 非表示。除外理由一覧には利用される場合がある |
| `pending` | 情報不足、AI失敗、人の判断待ち | 非表示 |
| `ended` | 終了を確認しアーカイブ済み | 非表示 |

ランキングへ入るには、少なくとも次のすべてが必要です。

- `publicationStatus: "published"`
- `rankingEligible: true`
- `requiresDevicePurchase: false`
- MNPまたは新規番号の対象として判定できること
- 必要な公式画像が取得できること

## 5. 毎日の自動処理

```text
[毎日6:17 JST]
       |
       v
[楽天モバイル公式一覧を取得]
       |
       v
[既知の補足URLと各詳細ページを取得]
       |
       v
[前回カタログとハッシュ比較]
       |
       +-- 差分なし -----------------------------+
       |                                          |
       |                                  [確認日だけ候補更新]
       |                                          |
       |                                  report: 保存せず終了
       |                                  apply : mainへ反映
       |
       +-- 新規／本文変更あり
       |          |
       |          v
       |   [ルール抽出・必要な場合だけAI構造化]
       |          |
       |          +-- 根拠十分な新規 --> 公開候補
       |          +-- 根拠不足 -------> pending
       |          +-- 既存pending ----> 人の判断までpending維持
       |
       +-- 終了明記／404・410／過去ページ移動 --> ended
       |
       +-- 一覧から1回消失 --> missingとして掲載維持・警告
       +-- 一覧から2回連続消失 --> ended
       |
       v
[画像同期]
       |
       v
[JSON検証 -> lint -> build -> 全テスト -> 安全判定]
       |
       +-- 失敗 --> 反映停止・Slack通知
       |
       +-- 成功
              |
              +-- report --> 成果物だけ30日保存・Slack通知
              +-- apply  --> mainへcommit・Cloudflare公開・本番照合
```

AIは新規または公式本文が変わった対象の情報整理にだけ使います。AIは掲載可否、終了、順位を決めません。

## 6. 毎朝の確認手順

### 6.1 Slackを見る

通知タイトルと意味は次のとおりです。

| 通知 | 意味 | 必要な対応 |
| --- | --- | --- |
| `ℹ️ 変更なし` | 正常比較でき、差分なし | report試運転中は記録。通常applyでは通知されない |
| `✅ 更新を確認` | 安全な追加・変更・終了あり | 対象URLと順位・結論を確認 |
| `⚠️ 要確認` | pendingまたは警告あり | GitHub Actionsと成果物を確認 |
| `🚨 失敗` | 取得・AI・画像・検証・公開などが失敗 | 反映されていない前提で原因確認 |
| `🟢 復旧` | 前回失敗から正常へ復帰 | 本番と確認日を確認 |

Slackには、公式一覧件数、追加・変更・終了・保留件数、AI呼び出し回数、推定費用、GitHub Actionsへのリンクが表示されます。

### 6.2 GitHub Actionsを見る

1. GitHubでリポジトリを開きます。
2. `Actions`を開きます。
3. 左側の`Daily campaign catalog sync`を選びます。
4. 当日の実行を開きます。
5. 上部の結果が緑色か確認します。
6. `Summary`で確認日、追加、変更、終了、保留、安全判定を確認します。
7. 必要な場合だけ`sync`ジョブを開き、失敗したステップのログを確認します。

### 6.3 成果物ZIPを見る

1. Actions実行ページ下部の`Artifacts`を開きます。
2. `campaign-sync-YYYY-MM-DD`をクリックします。
3. `campaign-sync-YYYY-MM-DD.zip`がダウンロードされます。これはGitHub Actionsが作成した正常な検証成果物です。
4. ZIPを展開します。
5. `.campaign-sync/report.json`を確認します。
6. 必要に応じて`data/campaigns/generated/`の対象JSONを確認します。

成果物は30日で削除されます。判断記録として残す必要がある内容は、`curated-overrides.json`の`notes`とPull Requestの説明へ記録してください。

### 6.4 `report.json`の主な項目

| 項目 | 意味 |
| --- | --- |
| `safeToPublish` | 全体を反映可能か |
| `requiresAttention` | pendingまたは警告があるか |
| `additions` | 新規候補 |
| `changes` | 既存情報の変更 |
| `ended` | 終了候補 |
| `pending` | 人の判断待ち |
| `warnings` | 単発の一覧消失など |
| `errors` | 全体停止理由 |
| `contentChanged` | カタログ内容が変わったか |
| `catalogVersion` | 本番照合用の版 |
| `ai.calls` | AI APIを実際に呼んだ回数 |
| `ai.estimatedCostUsd` | その実行の推定費用 |

## 7. 手作業を始める共通手順

### 7.1 初回だけ行う準備

Terminalで次を実行します。

```sh
git clone https://github.com/rhinatta0921-collab/mobile-campaign-navi.git
cd mobile-campaign-navi
npm ci
```

Node.jsは22.13.0以上を使用してください。

### 7.2 毎回、最新の`main`から作業ブランチを作る

作業中の変更がないことを確認します。

```sh
git status
```

次に最新化します。

```sh
git switch main
git pull --ff-only origin main
git switch -c ops/campaign-review-YYYY-MM-DD
```

`git status`に自分が作った覚えのない変更がある場合は、削除や上書きをせず作業を止めてください。

### 7.3 ファイルを編集する

VS Codeの場合は次で開けます。

```sh
code data/campaigns/curated-overrides.json
```

JSONではコメント、末尾カンマ、全角の引用符を使用できません。既存のキャンペーンコードを検索し、そのオブジェクトだけを編集します。

### 7.4 JSONの構文を確認する

```sh
jq empty data/campaigns/curated-overrides.json
```

何も表示されず終了すれば構文は正常です。

### 7.5 公式情報と台帳から生成物を更新する

当日の日付を指定します。

```sh
npm run sync:campaigns:auto -- --checked-at=YYYY-MM-DD --write
```

このコマンドは公式サイトへ接続します。新規・変更対象があり、対応するAPIキーが環境に設定されていればAI APIを呼ぶ場合があります。APIキーが未設定なら、AIが必要な対象は誤掲載せず`pending`になります。

### 7.6 画像とサイトを検証する

以下を上から順番に実行します。

```sh
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
npm run check:assets
npm run lint
npm test
git diff --check
```

`npm test`にはproduction buildと全テストが含まれます。

### 7.7 差分を確認する

```sh
git status --short
git diff --stat
git diff -- data/campaigns/curated-overrides.json
git diff -- data/campaigns/generated/index.json
```

意図していないアプリコード、設定、キャンペーンが変わっていないか確認します。

### 7.8 コミット、push、Pull Request

```sh
git add data/campaigns/curated-overrides.json
git add data/campaigns/generated data/campaigns/archive
git add data/campaigns/images.json public/assets/campaigns/official
git commit -m "chore(campaigns): review campaign status YYYY-MM-DD"
git push -u origin ops/campaign-review-YYYY-MM-DD
```

GitHubで表示された`Compare & pull request`を開き、次を記載します。

- 対象キャンペーンコードと公式URL
- `published`／`excluded`の判断
- 判断理由と公式根拠
- ポイント内訳
- 実行したテスト
- ランキング1位または結論が変わるか

差分とテストを再確認してから`main`へマージします。`main`更新後、Cloudflare Workers Buildsが本番を公開します。

## 8. `pending`を処理する

### 8.1 対象を確認する

Slackまたは`report.json`から次を確認します。

- `campaignCode`
- `title`
- `officialUrl`
- `reason`
- AI呼び出し回数と失敗理由

公式ページを開き、少なくとも次を確認します。

- 開催中であること
- キャンペーンコード
- MNP／新規番号のポイント
- ポイントの内訳と合計
- 初回、追加回線、再契約の対象区分
- 申込経路
- 端末購入が必須か
- Rakuten Link、買い物、エントリーなどの追加条件
- 期間
- 申込URL

### 8.2 `excluded`にする

`curated-overrides.json`へ、対象コードの項目を追加または更新します。

```json
"NO-CODE-EXAMPLE": {
  "codeType": "generated",
  "publicationStatus": "excluded",
  "category": "other",
  "notes": [
    "回線申し込みの直接特典ではないため編集判断で非掲載です。"
  ],
  "requiresDevicePurchase": false,
  "rankingEligible": false
}
```

判断理由は、後から別の担当者が読んでも分かる文章にします。端末購入必須なら`requiresDevicePurchase`を`true`、`category`を`device`にします。

編集後は「7.5 公式情報と台帳から生成物を更新する」以降を実行します。

### 8.3 `published`にする

`published`はステータスだけを変更してはいけません。掲載に必要な全項目を公式ページから確認し、台帳へ登録します。

```json
"9999": {
  "codeType": "campaign",
  "publicationStatus": "published",
  "title": "公式キャンペーン名",
  "editorial": {
    "headline": "どの利用者に向くキャンペーンかを一文で記載",
    "paragraphs": [
      "対象者、ポイント、申込方法を説明します。",
      "期限と重要な追加条件を説明します。"
    ],
    "goodPoints": [
      "具体的な利点"
    ],
    "concerns": [
      "見落としやすい条件"
    ]
  },
  "summary": "一覧と詳細で使う短い要約",
  "benefit": {
    "type": "points",
    "amount": 10000,
    "unit": "ポイント",
    "description": "申込者本人へ最大10,000ポイントを進呈します。"
  },
  "points": {
    "newNumber": 6000,
    "mnp": 10000
  },
  "breakdown": {
    "newNumber": [
      "条件A：6,000ポイント"
    ],
    "mnp": [
      "条件A：6,000ポイント",
      "条件B：4,000ポイント"
    ]
  },
  "target": "公式条件を満たす対象者",
  "conditions": [
    "対象プランの申し込み・利用開始",
    "Rakuten Link利用"
  ],
  "channel": "Web",
  "category": "simOnly",
  "audience": "applicant",
  "period": "YYYY年M月D日 - 終了日未定",
  "notes": [
    "ポイントと条件を確認した公式根拠の説明"
  ],
  "requiresDevicePurchase": false,
  "rankingEligible": true
}
```

値のルールは次のとおりです。

- 対象外の申込方法は`points`を`null`にします。
- `benefit.amount`は申込者本人が受け取る最大値です。
- `breakdown`の数値合計と`points`を一致させます。
- 紹介者側のポイント、抽選、端末値引きは回線申込者の固定ポイントへ合算しません。
- `audience`は`applicant`、`member`、`both`のいずれかです。
- `category`は`simOnly`、`device`、`service`、`homeInternet`、`memberBenefit`、`option`、`other`のいずれかです。
- `applicationUrl`は公式情報ページと申込先が異なる場合だけ追加します。

生成と画像同期の後、対象が`published`になり、必要画像が取得できたことを確認します。

```sh
jq -r 'select(.campaignCode == "9999") | {campaignCode, publicationStatus, rankingEligible, requiresDevicePurchase, points}' data/campaigns/generated/*.campaign.json
```

### 8.4 人が`pending`を台帳へ固定しない

`pending`は自動処理が作る確認待ち状態です。通常、`curated-overrides.json`へ`publicationStatus: "pending"`を追加しないでください。手動overrideを追加すると、そのキャンペーンはAI再解析の対象外になります。調査が終わるまで確実に非掲載にしたい場合は、理由を付けて`excluded`にし、後日再判定します。

## 9. 掲載中キャンペーンを修正する

### 9.1 ポイント、条件、期間、記事を修正する

1. `curated-overrides.json`でキャンペーンコードを検索します。
2. 公式ページと照合します。
3. `points`、`breakdown`、`benefit`を同時に直します。
4. `summary`、`editorial`、`target`、`conditions`、`period`も必要に応じて直します。
5. 生成、画像同期、全テストを実行します。
6. MNPと新規番号の順位、結論、詳細をローカル画面で確認します。

```sh
npm run dev
```

ブラウザで`http://127.0.0.1:3000/`を開きます。

ポイントだけを直し、`breakdown`や説明を古いまま残さないでください。

### 9.2 掲載中から`excluded`へ変える

対象overrideへ次を設定します。

```json
"publicationStatus": "excluded",
"rankingEligible": false
```

あわせて`notes`へ理由を追加します。生成後、ランキング、結論、詳細、画像から除外されます。1位だったキャンペーンを除外すると、次点が結論へ自動選定されます。

### 9.3 `excluded`から掲載へ戻す

公式情報を最初から再確認し、「8.3 `published`にする」の全項目を満たしてください。`publicationStatus`だけを変えないでください。

## 10. 公式一覧外の既知キャンペーンを追加する

公式一覧にはないが、楽天モバイル公式の個別ページを監視する場合は`curated-overrides.json`へ完全な項目を追加します。

```json
"9999": {
  "supplemental": true,
  "officialUrl": "https://network.mobile.rakuten.co.jp/campaign/example/",
  "codeType": "campaign",
  "publicationStatus": "published",
  "title": "公式キャンペーン名",
  "editorial": {
    "headline": "見出し",
    "paragraphs": ["本文"],
    "goodPoints": ["利点"],
    "concerns": ["注意点"]
  },
  "summary": "要約",
  "benefit": {
    "type": "points",
    "amount": 10000,
    "unit": "ポイント",
    "description": "最大10,000ポイント"
  },
  "points": {
    "newNumber": 6000,
    "mnp": 10000
  },
  "breakdown": {
    "newNumber": ["6,000ポイント"],
    "mnp": ["6,000ポイント", "4,000ポイント"]
  },
  "target": "対象者",
  "conditions": ["申込条件"],
  "channel": "Web",
  "category": "simOnly",
  "audience": "both",
  "period": "終了日未定",
  "notes": ["公式一覧外のため個別公式ページを監視"],
  "requiresDevicePurchase": false,
  "rankingEligible": true
}
```

`supplemental: true`には`officialUrl`が必須です。公式一覧と同じコードが見つかると重複エラーで全体が停止します。その場合は`supplemental`を外し、公式一覧側のデータへoverrideを適用します。

## 11. 専用申込URLを設定する

情報の出典URLは`officialUrl`、申込先は`applicationUrl`です。

```json
"applicationUrl": "https://example.com/verified-application-url"
```

次を確認してください。

- 楽天モバイルまたは承認済みの正しい申込URLであること
- URL短縮先を実際に開き、意図したページへ遷移すること
- 個人固有URL、広告URLの場合は管理者の承認があること
- URLに秘密情報や一時トークンが含まれないこと

現在、ランキングと詳細で広告属性を特別扱いするキャンペーンコードは`app/site-config.ts`の`CAMPAIGN_CODES.employeeReferral`です。別キャンペーンへ広告・紹介URLを追加する場合、`applicationUrl`の追加だけでは広告属性や分析イベントが意図どおりにならない可能性があります。この変更は通常の台帳更新ではなく、アプリコードと回帰テストを伴う開発変更として扱ってください。

## 12. ランキングと結論の確認

ランキングは次の順で決まります。

1. 申込者本人のポイントが多い
2. 条件数が少ない
3. 店舗対応を含むか
4. 対象者の広さ
5. キャンペーンコード

結論は次の最上位から自動生成されます。

- 初回MNP
- 初回新規番号
- 追加回線・再契約

1位が変わる更新では、次を必ず目視します。

- MNPランキング
- 新規番号ランキング
- 結論の3区分
- 結論画像
- 詳細記事
- 申込リンク
- ポイント内訳
- 主要条件

ローカル確認は次で行います。

```sh
npm run dev
```

## 13. GitHub Actionsを手動実行する

1. GitHubで`Actions`を開きます。
2. `Daily campaign catalog sync`を選びます。
3. `Run workflow`を押します。
4. Branchは`main`を選びます。
5. Modeを選びます。
6. `Run workflow`を押します。

### `report`を選ぶ場合

- 公式取得、AI、画像、build、テスト、安全判定まで実行します。
- `main`へコミットしません。
- 本番を変更しません。
- 成果物ZIPを30日保存します。
- 変更なしを含めSlack通知します。

### `apply`を選ぶ場合

- 全検証に成功し、安全判定を通過した生成物だけを`main`へコミットします。
- Cloudflareが本番へ公開します。
- 本番HTMLのカタログ版と最終確認日を照合します。
- 新規・変更が同時に見つかる可能性があるため、試運転中や障害調査中は使用しないでください。

## 14. 定時実行モードを変更する

1. GitHubの`Settings`を開きます。
2. `Secrets and variables`を開きます。
3. `Actions`を開きます。
4. `Variables`タブを開きます。
5. `CAMPAIGN_AUTOMATION_MODE`を編集します。
6. 試運転・障害調査は`report`、自動公開は`apply`にします。

未設定時は`report`です。

## 15. 実行時刻を変更する

編集するファイルは`.github/workflows/campaign-sync.yml`です。

```yaml
on:
  schedule:
    - cron: "17 21 * * *"
```

GitHub ActionsのcronはUTCです。JSTから9時間引いて設定します。

例：毎日7:30 JSTなら、前日の22:30 UTCなので次のようになります。

```yaml
- cron: "30 22 * * *"
```

コメントのUTC／JST表記、README、本ワークフローを検査するテストも更新し、`npm test`を実行します。定時ワークフローはデフォルトブランチの設定で動くため、変更を`main`へマージする必要があります。

## 16. AIプロバイダーを切り替える

GitHubの`Settings` → `Secrets and variables` → `Actions`で設定します。

### OpenAIを使う

- Variable `CAMPAIGN_AI_PROVIDER`: `openai`
- Secret `OPENAI_API_KEY`: OpenAI APIキー
- Variable `OPENAI_CAMPAIGN_MODEL`: 使用モデル

### Anthropicを使う

- Variable `CAMPAIGN_AI_PROVIDER`: `anthropic`
- Secret `ANTHROPIC_API_KEY`: Anthropic APIキー
- Variable `ANTHROPIC_CAMPAIGN_MODEL`: 使用モデル

自動フォールバックはありません。選択したプロバイダーのキーがなければ、AIが必要な対象は`pending`になります。

モデルを既定値以外へ変える場合、費用推定のため次も設定します。

- `CAMPAIGN_AI_INPUT_USD_PER_MILLION`
- `CAMPAIGN_AI_OUTPUT_USD_PER_MILLION`

安全上限は次のVariablesです。

- `CAMPAIGN_AI_MAX_INPUT_CHARS`
- `CAMPAIGN_AI_MAX_OUTPUT_TOKENS`
- `CAMPAIGN_AI_MAX_CALLS`
- `CAMPAIGN_AI_MAX_BUDGET_USD`

上限を引き上げる前に、直近の`report.json`で呼び出し対象と推定費用を確認してください。

## 17. Secretsを更新する

SecretsはGitHubの`Settings` → `Secrets and variables` → `Actions` → `Secrets`で管理します。

| Secret | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI Responses API |
| `ANTHROPIC_API_KEY` | Anthropic Messages APIを使う場合だけ |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook |

Secret値は登録後にGitHub画面から再表示できません。更新後は`report`を手動実行して動作確認します。

キー漏えいが疑われる場合は、先に提供元でキーを無効化・再発行し、その後GitHub Secretを更新します。漏えいした値をGit履歴から消すだけでは無効化になりません。

## 18. Slack通知を保守する

現在のSlack連携はIncoming Webhookによる通知専用です。Slackから`published`／`excluded`を操作する機能はありません。

通知が来ない場合は次を確認します。

1. Actions実行の`Prepare Slack notification`が成功しているか。
2. `Send Slack notification`が成功しているか。
3. Secret名が`SLACK_WEBHOOK_URL`か。
4. Slack Appが通知先チャンネルへ追加されているか。
5. Incoming Webhookが削除・無効化されていないか。

Webhookを再発行した場合はGitHub Secretを上書きし、`report`を手動実行します。Webhook URLをチャット、Issue、ログ、ソースコードへ貼らないでください。

## 19. 安全停止が発生する条件

| 状態 | 自動処理 |
| --- | --- |
| 一覧解析不能 | 全体停止 |
| 一覧件数が前回比10件超かつ20%超変化 | 全体停止 |
| URL由来コード衝突 | 全体停止 |
| 詳細ページ取得失敗 | 全体停止 |
| 公式の終了表記 | 即時`ended` |
| 過去キャンペーンページへ移動 | 即時`ended` |
| 404／410 | 再試行後に`ended` |
| 一覧から1回だけ消失 | `missing`、掲載維持、警告 |
| 一覧から2回連続消失 | `ended` |
| AIキーなし、AI拒否、根拠不足、予算超過 | 対象を`pending`、非掲載 |
| 掲載に必要な画像なし | 公開停止 |
| JSON、lint、build、test失敗 | 公開停止 |
| 本番カタログ版または確認日が不一致 | ワークフロー失敗 |

安全停止時に「とりあえず件数やハッシュを書き換えて通す」ことは禁止です。公式ページ、Actionsログ、前回成果物を確認し、原因を説明できる状態にしてから修正します。

## 20. 失敗ステップ別の対応

### `Install dependencies`

- `package-lock.json`と`package.json`の不整合を確認します。
- ローカルで`npm ci`を実行します。
- Node.jsのバージョンを確認します。

### `Build candidate campaign catalog`

- `report.json`の`errors`を確認します。
- 公式一覧件数の異常、取得失敗、コード衝突、AI設定を確認します。
- APIキー不足だけなら対象は通常`pending`ですが、初期化前の失敗では全体停止する場合があります。

### `Synchronize required official images`

- 対象の公式ページに画像があるか確認します。
- 画像URLが楽天モバイル公式ホストか確認します。
- 手動で代替画像を作らず、公式掲載画像を使います。

### `Validate generated site`

- `npm run check:assets`
- `npm run lint`
- `npm test`

をローカルで個別に実行し、最初のエラーから直します。

### `Commit validated catalog to main`

- Branch rules、Actionsの`contents: write`権限、同時更新を確認します。
- `main`が別のコミットで進んでいる場合は、最新`main`で再実行します。
- force pushはしません。

### `Verify production deployment`

- Cloudflare Workers Buildsの該当デプロイを確認します。
- Build commandとDeploy commandを確認します。
- 本番URLを開き、最終確認日を確認します。
- キャッシュ反映待ちの場合は時間を置いて再実行します。

### `Send Slack notification`

- キャンペーン更新自体が成功していても、通知失敗によりワークフロー全体は赤になります。
- `SLACK_WEBHOOK_URL`とチャンネルへのApp追加を確認します。

## 21. 緊急停止

### 自動公開だけ止める

GitHub Variable `CAMPAIGN_AUTOMATION_MODE`を`report`へ変更します。監視、AI、安全検証、Slack通知は継続しますが、`main`へ自動コミットしません。

### 監視とAPI呼び出しも止める

1. GitHubの`Actions`を開きます。
2. `Daily campaign catalog sync`を選びます。
3. 右上のメニューから`Disable workflow`を選びます。

復旧時は`Enable workflow`へ戻し、最初は`report`で実行します。

## 22. 誤掲載を緊急で外す

1. `CAMPAIGN_AUTOMATION_MODE`を`report`へ変更します。
2. 最新`main`から緊急ブランチを作ります。
3. `curated-overrides.json`で対象を`excluded`、`rankingEligible: false`にします。
4. 当日の日付で`sync:campaigns:auto --write`を実行します。
5. 画像同期、全テストを実行します。
6. Pull Requestを作成して優先レビューします。
7. `main`へマージします。
8. Cloudflare公開後、本番から消えたことを確認します。
9. 原因と再発防止をPull Requestへ追記します。

生成JSONだけを削除すると`index.json`や画像との不整合が起きるため、行わないでください。

## 23. ロールバック

誤った自動同期コミットを戻す場合、履歴を書き換える`git reset --hard`やforce pushは使いません。

1. 自動公開を`report`へ変更します。
2. 戻したいコミットIDをGitHubで確認します。
3. 最新`main`から修正ブランチを作ります。
4. 次を実行します。

```sh
git revert COMMIT_ID
```

5. buildと全テストを実行します。
6. Pull Requestで差分を確認してマージします。
7. 本番を確認します。

公式側に同じ差分が残っていると、次回同期で再度候補になります。必要に応じて`curated-overrides.json`へ正しい人判断も追加してください。

## 24. 本番確認

`main`反映後は次を確認します。

```sh
npm run verify:campaign-production
```

このコマンドはローカルの`generated/index.json`にある`catalogVersion`と`lastSuccessfulCheckAt`が本番HTMLへ反映されたかを確認します。

画面では次も目視します。

- H1の最終確認日
- MNPランキング
- 新規番号ランキング
- 結論
- 対象キャンペーンの詳細
- 画像
- 公式／申込リンク
- モバイル表示

## 25. GitHub画面だけで台帳を編集する場合

ローカル環境を使えない場合はGitHub画面でも`curated-overrides.json`を編集できます。

1. Repositoryの`Code`を開きます。
2. `data/campaigns/curated-overrides.json`を開きます。
3. 鉛筆アイコンを押します。
4. 対象コードを検索し、必要箇所だけ編集します。
5. `Commit changes...`を押します。
6. 新しいブランチを作る選択肢を選びます。
7. Pull Requestを作成します。

ただしGitHub画面だけではローカルのJSON生成、画像同期、全テストを実行できません。overrideを`main`へマージした後、Actionsからまず`report`を手動実行して結果を確認し、問題がなければ`apply`を実行してください。緊急時以外はローカル検証を推奨します。

## 26. やってはいけない操作

- `generated/index.json`の日付や`catalogVersion`だけを手で変更する
- 個別生成JSONだけを削除する
- 公式根拠のないポイントを入力する
- 紹介者ポイントや抽選最大値を申込者固定ポイントへ合算する
- `published`へステータスだけ変更する
- 画像取得失敗を無視して公開する
- Secretsをコードへ書く
- `main`へforce pushする
- 大量差分の安全停止を無効化してそのまま公開する
- 失敗中に`apply`を繰り返す

## 27. 日常運用チェックリスト

### 変更なし

- [ ] Actionsが成功
- [ ] report試運転中はSlackの変更なし通知を確認
- [ ] AI呼び出し回数が想定どおり
- [ ] 警告、エラー、pendingがない

### `pending`あり

- [ ] 公式URLを確認
- [ ] ポイント、対象者、条件、期間を確認
- [ ] `published`または`excluded`を判断
- [ ] `curated-overrides.json`を編集
- [ ] JSON構文確認
- [ ] 生成・画像同期
- [ ] lint、build、全テスト
- [ ] Pull Requestレビュー
- [ ] 本番確認

### 更新あり

- [ ] 公式本文と差分内容が一致
- [ ] MNP／新規ポイント内訳が正しい
- [ ] ランキング順位を確認
- [ ] 1位変更時は結論と画像を確認
- [ ] 詳細記事とリンクを確認
- [ ] 本番の最終確認日を確認

### 失敗あり

- [ ] 自動公開を`report`へ変更
- [ ] 失敗ステップを確認
- [ ] `report.json`の`errors`を確認
- [ ] 前回正常成果物と比較
- [ ] 原因を修正してreport再実行
- [ ] 正常一致後にapplyへ戻す

## 28. よく使う確認コマンド

現在の状態件数を確認します。

```sh
jq '.statusCounts' data/campaigns/generated/index.json
```

`pending`一覧を確認します。

```sh
jq -r 'select(.publicationStatus == "pending") | [.campaignCode, .title, .officialUrl] | @tsv' data/campaigns/generated/*.campaign.json
```

`excluded`一覧を確認します。

```sh
jq -r 'select(.publicationStatus == "excluded") | [.campaignCode, .title] | @tsv' data/campaigns/generated/*.campaign.json
```

特定コードを確認します。

```sh
jq 'select(.campaignCode == "2162")' data/campaigns/generated/*.campaign.json
```

カタログ版と確認日を確認します。

```sh
jq '{lastSuccessfulCheckAt, lastContentChangeAt, catalogVersion, statusCounts}' data/campaigns/generated/index.json
```

変更前の最終検証です。

```sh
jq empty data/campaigns/curated-overrides.json
npm run check:assets
npm run lint
npm test
git diff --check
git status --short
```

## 29. 判断に迷った場合

次のどれかに該当する場合は公開せず、`excluded`または自動生成された`pending`のままにします。

- 申込者本人のポイントが公式本文で確認できない
- 合計ポイントの内訳が一致しない
- 初回／追加回線／再契約の対象が不明
- 端末購入が必須か不明
- 公式申込URLか確認できない
- 画像の出典が公式か確認できない
- 公式ページ間で条件が矛盾している

公開を急ぐことより、誤掲載を防ぐことを優先します。判断内容と根拠は`notes`とPull Requestへ残してください。
