# Assets

Webページで使う画像・SVG素材の置き場です。

- `images/`: ヒーロー画像、人物画像、ページ共通の装飾画像など
- `svg/`: ページ共通のロゴ、アイコン、図版などのSVGファイル

キャンペーンバナー画像は、キャンペーン情報と一緒に管理するため `data/campaigns/banners/` に置きます。

HTMLやCSSから参照するときは、プロジェクトルートからの相対パスで指定します。

```html
<img src="assets/images/hero.jpg" alt="">
```

```css
background-image: url("../assets/images/hero.jpg");
```
