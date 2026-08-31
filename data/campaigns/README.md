# Campaigns

楽天モバイル公式の[キャンペーン一覧](https://network.mobile.rakuten.co.jp/campaign/)に掲載された情報を管理します。

- `generated/*.campaign.json`: 公式一覧から生成した個別キャンペーン
- `generated/index.json`: 取得日、公式一覧のカード件数、生成ファイル一覧
- `archive/*.ended.json`: 終了判定済みキャンペーンの監査用スナップショット
- `curated-overrides.json`: 編集記事、ポイント補正、専用申込URLなどの編集者管理データ
- `images.json`: 現在の2ランキングで表示する公式画像だけを記録した生成マニフェスト
- `index.ts`: JSONの実行時検証、対象判定、MNP・新規番号の順位計算を提供

各キャンペーンの`publicationStatus`は次の4状態です。

- `published`: 開催中かつ根拠・画像が揃い、ランキングと記事へ掲載
- `excluded`: 既知だが端末購入必須、間接特典などの理由で非掲載
- `pending`: 新規・変更内容の根拠不足、AI拒否などで確認待ちの非掲載
- `ended`: 終了判定後に`archive/`で保持

`listingPresence`は公式一覧上の`listed`、既知の一覧外URLを監視する`supplemental`、1回だけ一覧から消えた`missing`を表します。`eligibility`で初回、追加回線・再契約、MNP、新規番号を管理し、`provenance`へ公式本文・一覧カードのハッシュ、AIプロバイダー、使用モデル、固定プロンプト版を記録します。

公式一覧には掲載されていないものの個別の公式ページが存在するキャンペーンは、補足キャンペーンとしてJSONと`index.json`へ追加します。この場合、`sourceCards[].listingIndex`は`null`とし、一覧カード由来ではないことを明示します。

同じコードが複数の掲載カードに現れた場合は、1つのJSONの`sourceCards`へ統合します。1枚の掲載カードが複数コードの合算特典を案内している場合は、コードごとのJSONへ分割します。

公式ページにキャンペーンコードがない掲載カードは、URL由来の`NO-CODE-*`を補助コードとして使い、`codeType`を`generated`にします。公式に「施策コード」として案内されるものは、`codeType`を`initiative`にします。

`rankingEligible`は回線または対象モバイルプランの申し込み・利用開始が特典の直接条件となるキャンペーンに設定し、画面ではさらに`requiresDevicePurchase: false`のものだけをランキングへ掲載します。したがって、端末・ルーター購入が不要な直接申込キャンペーンだけが表示対象です。申込者本人の固定ポイントがない対象データは0ポイントとして掲載します。値引き、特価、無料期間、倍率、抽選などは`benefit`へ保存しますが、順位には混ぜません。

公式一覧の全キャンペーンは`curated-overrides.json`で人が分類します。オプション単体、光回線・ホームルーター、既存契約者向けサービス、紹介者向け抽選などは公式データへ保存してもランキングには掲載しません。

`officialUrl`はキャンペーン情報と画像出典の公式ページを表します。紹介者固有URLなど、申し込みに別のURLを使うキャンペーンは`applicationUrl`へ保存し、サイト上の申込導線だけを切り替えます。`applicationUrl`がない場合は`officialUrl`を申込先として使用します。

## 更新

同期は閲覧時には実行されません。日次自動同期または運用者が確認日と書込指示を明示して実行します。

```sh
npm run sync:campaigns:auto -- --checked-at=YYYY-MM-DD --write
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --check
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --write
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --check
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
```

自動同期は公式一覧と詳細本文を比較し、変更ページだけをAI構造化します。AIは`CAMPAIGN_AI_PROVIDER=openai|anthropic`で切り替え、同じ公式URL・本文ハッシュの重複呼び出しを行いません。非掲載案件は公式内容が変わった時だけ再判定します。`curated-overrides.json`は再生成しないため、`editorial`、`applicationUrl`、手動補正値が同期で消えることはありません。画像同期は新規・変更対象だけを取得し、候補領域へ必要な掲載画像だけを集めるため、終了案件の孤立画像を残しません。

AIは掲載可否、終了判定、順位を決定しません。終了と分類はコードで判定し、数値は公式本文の根拠確認後にコードで合計します。根拠不足、API拒否、呼び出し回数または費用上限超過は`pending`として非掲載にします。

`generated/index.json`の`lastSuccessfulCheckAt`は正常比較日、`lastContentChangeAt`は実内容の最終変更日、`catalogVersion`は本番照合用の決定的なバージョンです。ページのH1、SEO年月、JSON-LDの`dateModified`、サイトマップ日付は`lastSuccessfulCheckAt`から生成します。
