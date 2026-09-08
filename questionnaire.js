(function () {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) document.body.dataset.reducedMotion = 'true';
  const assessments = {
    gad7: {
      scope: '在过去两周内，你有多少时候受到以下问题困扰？',
      questions: ['感到紧张、焦虑或急切','不能够停止或控制担忧','对各种各样的事情担忧过多','很难放松下来','由于不安而无法静坐','变得容易烦恼或急躁','感到似乎将有可怕的事情发生'],
      options: ['完全不会','有几天','一半以上的天数','几乎每天'],
      max: 21
    },
    exam: {
      scope: '在最近一周面对考试或学习任务时',
      questions: ['想到考试时，身体会明显紧绷或心跳加快','很难停止反复想象考试失败的结果','因为担忧而难以开始复习','明明休息了，仍然觉得自己不应该停下来','学习时容易被“我来不及了”的想法打断','考试压力已经影响到睡眠或日常生活'],
      options: ['从未出现','偶尔出现','经常出现','几乎一直'],
      max: 18
    }
  };
  let selectedAssessment = 'gad7';
  let selectedPace = 'steady';
  let currentIndex = 0;
  let answers = [];
  let advanceTimer;
  const intro = document.querySelector('#introView');
  const questionView = document.querySelector('#questionView');
  const resultView = document.querySelector('#resultView');
  const questionText = document.querySelector('#questionText');
  const questionScope = document.querySelector('#questionScope');
  const questionNote = document.querySelector('#questionNote');
  const answerList = document.querySelector('#answerList');
  const progressCount = document.querySelector('#progressCount');
  const progressFill = document.querySelector('#progressFill');
  const toast = document.querySelector('#toast');
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  const paceCopy = {
    steady: ['每题作答后会稍作停留，给你一点确认时间。', '慢慢来，选最接近的一项就好。', 360],
    quick: ['作答后会更快进入下一题，适合你已经想好了的时候。', '已开启快速节奏，仍然可以随时返回上一题。', 320],
    gentle: ['问卷中会保留更多提醒，帮助你把它当成一次轻量自察。', '不用把答案想得很标准，先照顾此刻的真实感受。', 560]
  };

  document.querySelectorAll('[data-assessment]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('[data-assessment].active').classList.remove('active');
    button.classList.add('active');
    selectedAssessment = button.dataset.assessment;
    document.querySelectorAll('[data-assessment] i').forEach((label) => { label.textContent = '选择'; });
    button.querySelector('i').textContent = '已选中';
  }));

  document.querySelectorAll('[data-pace]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('[data-pace].active').classList.remove('active');
    button.classList.add('active');
    selectedPace = button.dataset.pace;
    document.querySelector('#paceHint').textContent = paceCopy[selectedPace][0];
  }));

  function show(view) {
    intro.hidden = view !== 'intro';
    questionView.hidden = view !== 'question';
    resultView.hidden = view !== 'result';
  }
  function renderQuestion() {
    const data = assessments[selectedAssessment];
    questionScope.textContent = data.scope;
    questionText.textContent = data.questions[currentIndex];
    questionNote.textContent = paceCopy[selectedPace][1];
    progressCount.textContent = `${String(currentIndex + 1).padStart(2,'0')} / ${String(data.questions.length).padStart(2,'0')}`;
    progressFill.style.width = `${(currentIndex + 1) / data.questions.length * 100}%`;
    answerList.replaceChildren();
    data.options.forEach((option, value) => {
      const button = document.createElement('button');
      button.type = 'button';
      if (answers[currentIndex] === value) button.classList.add('selected');
      const marker = document.createElement('i'); marker.textContent = String(value);
      const label = document.createElement('strong'); label.textContent = option;
      button.append(marker,label);
      button.addEventListener('click', () => {
        answers[currentIndex] = value;
        answerList.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
        window.clearTimeout(advanceTimer);
        advanceTimer = window.setTimeout(() => {
          if (currentIndex < data.questions.length - 1) { currentIndex += 1; renderQuestion(); }
          else renderResult();
        }, Math.max(300, reducedMotion ? 0 : paceCopy[selectedPace][2]));
      });
      answerList.appendChild(button);
    });
    document.querySelector('#previousQuestion').disabled = currentIndex === 0;
  }
  document.querySelector('#startAssessment').addEventListener('click', () => {
    currentIndex = 0;
    answers = [];
    show('question');
    renderQuestion();
  });
  document.querySelector('#previousQuestion').addEventListener('click', () => {
    window.clearTimeout(advanceTimer);
    if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); }
  });

  function getResult(score) {
    if (selectedAssessment === 'gad7') {
      if (score <= 4) return ['状态相对平稳','最近两周的焦虑困扰较少。继续保持睡眠、运动和稳定记录。','保留现在有效的节奏，不需要因为分数而改变自己。'];
      if (score <= 9) return ['有一些焦虑信号','这些感受值得被照顾，但不意味着你出了问题。','先选择一个低压力工具，并观察它是否持续影响睡眠或学习。'];
      if (score <= 14) return ['焦虑正在占用较多精力','建议和可信任的人或学校心理中心聊一聊，获得更具体的支持。','不要独自扛住全部。把结果带给专业支持者会更有帮助。'];
      return ['焦虑困扰较为明显','建议尽快联系学校心理中心、心理咨询师或医疗专业人员进一步评估。','先确保现实支持可达，再使用数字人作为补充陪伴。'];
    }
    if (score <= 5) return ['考试压力仍可调节','你有一些紧张，但目前仍保留较多可控感。','保持小步计划，并给每天安排明确的结束时间。'];
    if (score <= 11) return ['考试压力正在累积','身体和思绪都需要减载，长时间硬撑可能降低复习效率。','先处理睡眠和身体紧绷，再把任务拆成二十分钟一组。'];
    return ['考试压力已经明显影响生活','这不是意志力不足。建议尽快获得老师、家人或学校心理中心的现实支持。','暂停加码复习，优先恢复睡眠并建立现实支持联系。'];
  }
  function renderResult() {
    const data = assessments[selectedAssessment];
    const score = answers.reduce((sum,value) => sum + Number(value || 0),0);
    const result = getResult(score);
    document.querySelector('#resultScore').textContent = String(score);
    document.querySelector('#resultTotal').textContent = `/ ${data.max}`;
    document.querySelector('#resultLevel').textContent = result[0];
    document.querySelector('#resultCopy').textContent = result[1];
    document.querySelector('#resultAdvice').textContent = result[2];
    // 危机阻断：GAD-7 ≥15 或考试压力 ≥12 时展示醒目求助入口，低分路径不受影响
    const needsSupport = (selectedAssessment === 'gad7' && score >= 15) || (selectedAssessment === 'exam' && score >= 12);
    const crisisSupport = document.querySelector('#crisisSupport');
    if (crisisSupport) crisisSupport.hidden = !needsSupport;
    const percentage = Math.round(score / data.max * 100);
    document.querySelector('#resultRing').style.background = `radial-gradient(circle, #f8f5f0 57%, transparent 59%), conic-gradient(var(--warm) 0 ${percentage}%, #e5e1db ${percentage}% 100%)`;
    show('result');
  }
  document.querySelector('#restartAssessment').addEventListener('click', () => { show('intro'); currentIndex = 0; answers = []; });
  document.querySelector('#copyHotline')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('12356');
      showToast('已复制 12356。');
    } catch (error) {
      showToast('请手动记录号码：12356。');
    }
  });
  document.querySelector('#exitAssessment').addEventListener('click', () => {
    if (!questionView.hidden) { show('intro'); currentIndex = 0; answers = []; }
    else window.location.href = 'space.html';
  });
})();
