// ============================================
// 期限チェック関数
// ============================================
function isActive(endDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = endDateStr.split("-").map(Number);
  const endDate = new Date(year, month - 1, day);
  endDate.setHours(0, 0, 0, 0);

  return today <= endDate;
}

// ============================================
// スコア計算・ランキング生成関数
// ============================================
function calcRanking(userAnswers) {
  const scored = CAMPAIGNS.map(campaign => {
    let totalScore = 0;

    campaign.scoring.forEach(rule => {
      const userAnswer = userAnswers[rule.questionId];
      if (!userAnswer) return;

      // ラジオボタン（文字列）の場合
      if (typeof userAnswer === "string") {
        if (rule.values.includes(userAnswer)) {
          totalScore += rule.score;
        }
      }

      // チェックボックス（配列）の場合
      if (Array.isArray(userAnswer)) {
        const matched = rule.values.some(v => userAnswer.includes(v));
        if (matched) {
          totalScore += rule.score;
        }
      }
    });

    return { ...campaign, totalScore };
  });

  return scored
    .filter(c => c.totalScore > 0)       // 0点は除外
    .filter(c => isActive(c.endDate))    // 期限切れは除外
    .sort((a, b) => b.totalScore - a.totalScore); // スコア降順
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
document.addEventListener("DOMContentLoaded", function () {

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

        // 必須項目が未選択の場合
        if (q.required && !selected) {
          alert(`「${q.text}」を選択してください`);
          hasError = true;
          return;
        }
        if (selected) userAnswers[q.id] = selected.value;

      } else if (q.type === "checkbox") {
        const checked = document.querySelectorAll(`input[name="${q.id}"]:checked`);
        userAnswers[q.id] = Array.from(checked).map(el => el.value);
      }
    });

    // エラーがあれば処理を止める
    if (hasError) return;

    // ランキング計算
    const ranking = calcRanking(userAnswers);

    // sessionStorageに保存
    sessionStorage.setItem("diagnosisResult", JSON.stringify(ranking));

    // 結果ページへ移動
    window.location.href = "result.html";
  });
});
