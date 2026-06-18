function formatNumber(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function getCampaignIcon(type) {
  const icons = {
    phone: "assets/svg/smartphone.svg",
    coins: "assets/svg/point_coin_icon_three_stacks_refined.svg",
    gift: "assets/svg/gift_box_icon_two_ribbon_lines.svg",
  };

  return icons[type] || icons.gift;
}

function renderEmpty(container, message, buttonText) {
  container.innerHTML = `
    <div class="empty-result">${message}</div>
    <div class="btn-retry-wrap">
      <a href="index.html" class="btn-retry">${buttonText} <span aria-hidden="true">→</span></a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("resultContainer");
  const data = sessionStorage.getItem("diagnosisResult");

  if (!data) {
    renderEmpty(container, "診断結果がありません。", "診断ページへ戻る");
    return;
  }

  const ranking = JSON.parse(data).slice(0, 5);

  if (ranking.length === 0) {
    renderEmpty(container, "条件に合うキャンペーンが見つかりませんでした。", "もう一度診断する");
    return;
  }

  ranking.forEach((campaign, index) => {
    const rank = index + 1;
    const card = document.createElement("article");
    card.classList.add("campaign-card", `rank-${rank}`);

    const rankClass = rank <= 3 ? "rank-badge" : "rank-badge rank-badge-small";
    const pointText = formatNumber(campaign.points);
    const iconPath = getCampaignIcon(campaign.imageIcon);
    const combinations = campaign.combination || [{ name: campaign.name, points: campaign.points }];
    const conditions = campaign.conditions || [campaign.description];

    card.innerHTML = `
      <div class="${rankClass}">${rank}<span>位</span></div>
      <div class="campaign-visual">
        <div class="campaign-visual-title">${campaign.imageLabel || campaign.name}</div>
        <div class="campaign-visual-points">${pointText}<span>ポイント</span></div>
        <img class="campaign-visual-icon" src="${iconPath}" alt="" aria-hidden="true">
      </div>
      <div class="campaign-detail">
        <p class="point-line">合計獲得ポイント <strong>${pointText}</strong>ポイント</p>
        <div class="detail-block">
          <p class="detail-label">組み合わせるキャンペーン</p>
          <ul class="detail-list">
            ${combinations.map(item => `<li>${item.name}　${formatNumber(item.points)}ポイント</li>`).join("")}
          </ul>
        </div>
        <div class="detail-block">
          <p class="detail-label">主な適用条件</p>
          <ul class="detail-list">
            ${conditions.map(item => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div class="campaign-action">
        <div>
          <p class="deadline-label">申し込み期限</p>
          <p class="deadline-date">${campaign.deadlineLabel || campaign.endDate}</p>
        </div>
        <a href="${campaign.url}" target="_blank" rel="noopener noreferrer" class="btn-official">
          公式ページへ ↗
        </a>
      </div>
    `;

    container.appendChild(card);
  });

  const retryWrap = document.createElement("div");
  retryWrap.classList.add("btn-retry-wrap");
  retryWrap.innerHTML = `<a href="index.html" class="btn-retry">もう一度診断する <span aria-hidden="true">→</span></a>`;
  container.appendChild(retryWrap);
});
