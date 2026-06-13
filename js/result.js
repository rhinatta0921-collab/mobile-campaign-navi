document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("resultContainer");
  const data = sessionStorage.getItem("diagnosisResult");

  // データがない場合
  if (!data) {
    container.innerHTML = `
      <p style="text-align:center; color:#888;">診断結果がありません。</p>
      <div class="btn-retry-wrap">
        <a href="index.html" class="btn-retry">診断ページへ戻る</a>
      </div>
    `;
    return;
  }

  const ranking = JSON.parse(data);

  // 0件の場合
  if (ranking.length === 0) {
    container.innerHTML = `
      <p style="text-align:center; color:#888;">条件に合うキャンペーンが見つかりませんでした。</p>
      <div class="btn-retry-wrap">
        <a href="index.html" class="btn-retry">もう一度診断する</a>
      </div>
    `;
    return;
  }

  // ランキング表示
  ranking.forEach((campaign, index) => {
    const card = document.createElement("article");
    card.classList.add("campaign-card");

    // 1位だけ特別なクラスを付与
    if (index === 0) card.classList.add("rank-1");

    card.innerHTML = `
      <div>
        <span class="rank-badge">第${index + 1}位</span>
        <span class="carrier-name">${campaign.carrier}</span>
      </div>
      <h2>${campaign.name}</h2>
      <p>${campaign.description}</p>
      <a href="${campaign.url}" target="_blank" rel="noopener noreferrer" class="btn-official">
        公式サイトで詳細を確認する →
      </a>
    `;
    container.appendChild(card);
  });

  // もう一度診断するボタン
  const retryWrap = document.createElement("div");
  retryWrap.classList.add("btn-retry-wrap");
  retryWrap.innerHTML = `<a href="index.html" class="btn-retry">もう一度診断する</a>`;
  container.appendChild(retryWrap);
});
