# Campaigns

楽天モバイル公式の[キャンペーン一覧](https://network.mobile.rakuten.co.jp/campaign/)に掲載された情報を管理します。

- `generated/*.campaign.json`: 公式一覧から生成した個別キャンペーン
- `generated/index.json`: 取得日、公式一覧のカード件数、生成ファイル一覧
- `curated-overrides.json`: 編集記事、ポイント補正、専用申込URLなどの編集者管理データ
- `images.json`: 現在の2ランキングで表示する公式画像だけを記録した生成マニフェスト
- `index.ts`: JSONの実行時検証、対象判定、MNP・新規番号の順位計算を提供

公式一覧には掲載されていないものの個別の公式ページが存在するキャンペーンは、補足キャンペーンとしてJSONと`index.json`へ追加します。この場合、`sourceCards[].listingIndex`は`null`とし、一覧カード由来ではないことを明示します。

同じコードが複数の掲載カードに現れた場合は、1つのJSONの`sourceCards`へ統合します。1枚の掲載カードが複数コードの合算特典を案内している場合は、コードごとのJSONへ分割します。

公式ページにキャンペーンコードがない掲載カードは、URL由来の`NO-CODE-*`を補助コードとして使い、`codeType`を`generated`にします。公式に「施策コード」として案内されるものは、`codeType`を`initiative`にします。

`rankingEligible`で明示したデータをランキング対象とし、申込者本人の固定ポイントがない対象データは0ポイントとして掲載します。値引き、特価、無料期間、倍率、抽選などは`benefit`へ保存しますが、順位には混ぜません。

`officialUrl`はキャンペーン情報と画像出典の公式ページを表します。紹介者固有URLなど、申し込みに別のURLを使うキャンペーンは`applicationUrl`へ保存し、サイト上の申込導線だけを切り替えます。`applicationUrl`がない場合は`officialUrl`を申込先として使用します。

## 更新

同期は閲覧時には実行されません。運用者が確認日と書込指示を明示して実行します。

```sh
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --check
npm run sync:campaigns -- --checked-at=YYYY-MM-DD --write
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --check
npm run sync:campaign-images -- --checked-at=YYYY-MM-DD --write
```

キャンペーン同期は公式一覧の件数を確認し、一時領域で全JSONを検証してから`generated/`を置換します。`curated-overrides.json`は再生成しないため、`editorial`、`applicationUrl`、手動補正値が同期で消えることはありません。画像同期も表示に必要な役割だけを一時領域へ作り、孤立画像を残さず切り替えます。
