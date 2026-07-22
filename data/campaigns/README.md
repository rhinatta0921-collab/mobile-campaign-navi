# Campaigns

キャンペーン情報と、キャンペーンに紐づく素材をまとめて管理する場所です。

- `items/`: 公式ページから確認した個別キャンペーンのJSONと読み込み対象の一覧
- `banners/`: キャンペーンバナー画像

バナーをキャンペーンデータから参照する場合は、プロジェクトルートからの相対パスで指定します。

```js
bannerImage: "data/campaigns/banners/campaign_001.png"
```
