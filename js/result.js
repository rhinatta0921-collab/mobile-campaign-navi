document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("resultContainer");
  const data = sessionStorage.getItem("diagnosisResult");

  // ============================================
  // データがない場合（直接URLアクセスなど）
  // ============================================
  if (!data) {
    container.innerHTML = `
      <p>診断結果がありません。</p>
      <a href="index.html">診断ページへ戻る</a>
    `;
    return;
  }

  const ranking = JSON.parse(data);

  // ============================================
  // 該当キャンペーンが0件の場合
  // ============================================
  if (ranking.length === 0) {
    container.innerHTML = `
      <p>条件に合うキャンペーンが見つかりませんでした。</p>
      <a href="index.html">もう一度診断する</a>
    `;
    return;
  }

  // ============================================
  // ランキング表示
  // ============================================
  ranking.forEach((campaign, index) => {
    const card = document.createElement("article");
    card.classList.add("campaign-card");
    card.innerHTML = `
      <div class="rank">第${index + 1}位</div>
      <h2>${campaign.carrier}：${campaign.name}</h2>
      <p>${campaign.description}</p>
      <a href="${campaign.url}" target="_blank" rel="noopener noreferrer">
        公式サイトで詳細を確認する →
      </a>
    `;
    container.appendChild(card);
  });
});

const backLink = document.createElement("a");
backLink.href = "index.html";
backLink.textContent = "もう一度診断する";
container.appendChild(backLink);