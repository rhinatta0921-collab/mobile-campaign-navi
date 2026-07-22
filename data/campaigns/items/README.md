# Campaign Items

公式ページから確認した個別キャンペーン情報を、1キャンペーン1JSONで管理する場所です。

同じ公式ページに複数のキャンペーンルールがある場合は、ポイント数や契約種別などの判定条件が異なるため、別ファイルに分けます。

キャンペーンバナーは `data/campaigns/banners/` に置き、各JSONの `bannerImage` にパスを保存します。

診断と結果表示では、`index.json` の `items` に登録されたJSONファイルを読み込み、各JSONの内容をそのまま表示・判定に使います。

`eligibility` と `exclusions` は、診断フォームの質問IDと選択肢の `value` に合わせて管理します。

- `conditions`: 楽天モバイルへの申し込みは初めて？
- `application_status`: 他社からの乗り換えですか？
- `purchase_plan`: 端末の購入も考えていますか？
- `rakuten_card`: 楽天カードはお持ちですか？
- `application_method`: 楽天モバイルの申し込みはどちらで行いますか？

各条件配列が空の場合は、その条件を問わないキャンペーンとして扱います。ユーザーがキャンペーン適用のために取るべき行動は `userActions` に保存します。
