// ============================================
// キャンペーンJSON読み込み
// ============================================
const CAMPAIGN_ITEMS_INDEX_URL = "data/campaigns/items/index.json";
const CAMPAIGN_ITEMS_BASE_URL = "data/campaigns/items/";

async function loadCampaignItems() {
  const indexResponse = await fetch(CAMPAIGN_ITEMS_INDEX_URL);
  if (!indexResponse.ok) {
    throw new Error("キャンペーン一覧を読み込めませんでした。");
  }

  const index = await indexResponse.json();
  const itemFiles = index.items || [];
  const campaigns = await Promise.all(itemFiles.map(async fileName => {
    const itemResponse = await fetch(`${CAMPAIGN_ITEMS_BASE_URL}${fileName}`);
    if (!itemResponse.ok) {
      throw new Error(`${fileName}を読み込めませんでした。`);
    }
    return itemResponse.json();
  }));

  return campaigns.map(normalizeCampaignItem);
}

function normalizeCampaignItem(item) {
  return {
    ...item,
    priority: item.priority || 0,
    eligibility: item.eligibility || {},
    exclusions: item.exclusions || {},
    userActions: item.userActions || [],
  };
}

// ============================================
// 期限チェック関数
// ============================================
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isActive(campaign) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = parseDate(campaign.startDate);
  const endDate = parseDate(campaign.endDate);

  if (campaign.startDate && !startDate) return false;
  if (campaign.endDate && !endDate) return false;
  if (startDate && today < startDate) return false;

  return !endDate || today <= endDate;
}

function getAnswerCandidates(questionId, userAnswer) {
  return Array.isArray(userAnswer) ? userAnswer : [userAnswer];
}

function answerMatches(questionId, userAnswer, allowedValues) {
  if (!allowedValues || allowedValues.length === 0) return true;
  if (!userAnswer) return false;

  const candidates = getAnswerCandidates(questionId, userAnswer);
  return allowedValues.some(value => candidates.includes(value));
}

function answerIsExcluded(questionId, userAnswer, excludedValues) {
  if (!excludedValues || excludedValues.length === 0 || !userAnswer) return false;

  const candidates = getAnswerCandidates(questionId, userAnswer);
  return excludedValues.some(value => candidates.includes(value));
}

function matchesCriteria(campaign, userAnswers) {
  const eligibility = campaign.eligibility || {};
  const exclusions = campaign.exclusions || {};
  const questionIds = new Set([
    ...Object.keys(eligibility),
    ...Object.keys(exclusions),
  ]);

  return Array.from(questionIds).every(questionId => {
    const userAnswer = userAnswers[questionId];
    return answerMatches(questionId, userAnswer, eligibility[questionId])
      && !answerIsExcluded(questionId, userAnswer, exclusions[questionId]);
  });
}

// ============================================
// 組み合わせ生成・ランキング生成関数
// ============================================
function canCombine(a, b) {
  const aCombination = a.combination || {};
  const bCombination = b.combination || {};
  const aCannotCombineWith = aCombination.cannotCombineWith || [];
  const bCannotCombineWith = bCombination.cannotCombineWith || [];

  if (aCannotCombineWith.includes(b.campaignCode) || bCannotCombineWith.includes(a.campaignCode)) {
    return false;
  }

  const aGroup = aCombination.combinationGroup;
  const bGroup = bCombination.combinationGroup;

  return !aGroup || !bGroup || aGroup !== bGroup;
}

function canAddToCombination(combination, campaign) {
  return combination.every(item => canCombine(item, campaign));
}

function generateCombinations(candidates) {
  const combinations = [];

  function walk(startIndex, current) {
    for (let i = startIndex; i < candidates.length; i += 1) {
      const campaign = candidates[i];

      if (!canAddToCombination(current, campaign)) {
        continue;
      }

      const next = [...current, campaign];
      combinations.push(next);
      walk(i + 1, next);
    }
  }

  walk(0, []);
  return combinations;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getMainCampaign(campaigns) {
  return [...campaigns].sort((a, b) => {
    if ((b.point || 0) !== (a.point || 0)) {
      return (b.point || 0) - (a.point || 0);
    }
    return (b.priority || 0) - (a.priority || 0);
  })[0];
}

function getDeadlineLabel(campaigns) {
  const campaignsWithEndDate = campaigns
    .map(campaign => ({ campaign, endDate: parseDate(campaign.endDate) }))
    .filter(item => item.endDate);

  if (campaignsWithEndDate.length === 0) {
    return "終了日未定";
  }

  campaignsWithEndDate.sort((a, b) => a.endDate - b.endDate);
  const earliestCampaign = campaignsWithEndDate[0].campaign;

  return earliestCampaign.deadlineLabel || earliestCampaign.endDate;
}

function buildRankingResult(campaigns) {
  return {
    totalPoint: campaigns.reduce((sum, campaign) => sum + (campaign.point || 0), 0),
    maxPriority: Math.max(...campaigns.map(campaign => campaign.priority || 0)),
    mainCampaign: getMainCampaign(campaigns),
    campaigns,
    userActions: uniqueStrings(campaigns.flatMap(campaign => campaign.userActions?.length ? campaign.userActions : [campaign.summary])),
    deadlineLabel: getDeadlineLabel(campaigns),
  };
}

function calcRanking(userAnswers, campaigns) {
  const candidates = campaigns
    .filter(campaign => isActive(campaign))
    .filter(campaign => matchesCriteria(campaign, userAnswers))
    .filter(campaign => (campaign.point || 0) > 0)
    .filter(campaign => campaign.officialUrl)
    .sort((a, b) => {
      if ((b.point || 0) !== (a.point || 0)) {
        return (b.point || 0) - (a.point || 0);
      }
      if ((b.priority || 0) !== (a.priority || 0)) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return String(a.campaignCode).localeCompare(String(b.campaignCode));
    })
    .slice(0, 20);

  return generateCombinations(candidates)
    .map(buildRankingResult)
    .sort((a, b) => {
      if (b.totalPoint !== a.totalPoint) {
        return b.totalPoint - a.totalPoint;
      }
      if (b.maxPriority !== a.maxPriority) {
        return b.maxPriority - a.maxPriority;
      }
      return a.campaigns.length - b.campaigns.length;
    })
    .slice(0, 5);
}

// ============================================
// 質問フォームを動的生成する関数
// ============================================
function renderQuestions() {
  const container = document.getElementById("questionsContainer");

  QUESTIONS.forEach((q, index) => {
    const card = document.createElement("div");
    card.classList.add("question-card");

    // 質問番号バッジ
    const number = document.createElement("span");
    number.classList.add("question-number");
    number.textContent = `Q${index + 1}`;
    card.appendChild(number);

    // 必須バッジ
    if (q.required) {
      const badge = document.createElement("span");
      badge.classList.add("required-badge");
      badge.textContent = "必須";
      card.appendChild(badge);
    }

    // 質問タイトル
    const title = document.createElement("h2");
    title.textContent = q.text;
    card.appendChild(title);

    // 選択肢リスト
    const optionsList = document.createElement("div");
    optionsList.classList.add("options-list");

    q.options.forEach(opt => {
      const label = document.createElement("label");
      label.classList.add("option-label");

      const input = document.createElement("input");
      input.type = q.type;
      input.name = q.id;
      input.value = opt.value;

      if (index < 2 && opt === q.options[0]) {
        input.checked = true;
        label.classList.add("is-checked");
      }

      // 選択時にis-checkedクラスを付与
      input.addEventListener("change", () => {
        if (q.type === "radio") {
          // ラジオは同じnameの全ラベルからis-checkedを外す
          document.querySelectorAll(`input[name="${q.id}"]`).forEach(el => {
            el.closest(".option-label").classList.remove("is-checked");
          });
        }
        if (input.checked) {
          label.classList.add("is-checked");
        } else {
          label.classList.remove("is-checked");
        }
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(opt.label));
      optionsList.appendChild(label);
    });

    card.appendChild(optionsList);
    container.appendChild(card);
  });
}

// ============================================
// フォーム送信処理
// ============================================
document.addEventListener("DOMContentLoaded", async function () {
  let campaigns = [];

  try {
    campaigns = await loadCampaignItems();
  } catch (error) {
    console.error(error);
  }

  // 質問フォームを生成
  renderQuestions();

  // 診断ボタンが押されたときの処理
  document.getElementById("diagnosisForm").addEventListener("submit", function (e) {
    e.preventDefault(); // ページリロードを防ぐ

    const userAnswers = {};
    let hasError = false;

    QUESTIONS.forEach(q => {
      if (q.type === "radio") {
        const selected = document.querySelector(`input[name="${q.id}"]:checked`);

        if (q.required && !selected) {
          hasError = true;
        }
        if (selected) userAnswers[q.id] = selected.value;

      } else if (q.type === "checkbox") {
        const checked = document.querySelectorAll(`input[name="${q.id}"]:checked`);
        userAnswers[q.id] = Array.from(checked).map(el => el.value);
      }
    });

    // エラーがあれば処理を止める
    if (hasError) {
      alert("未選択の項目を選択してください");
      return;
    }

    // ランキング計算
    const ranking = calcRanking(userAnswers, campaigns);

    // sessionStorageに保存
    sessionStorage.setItem("diagnosisResult", JSON.stringify(ranking));

    // 結果ページへ移動
    window.location.href = "result.html";
  });
});
