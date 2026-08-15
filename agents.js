(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) document.body.dataset.reducedMotion = 'true';

  const scenarios = {
    exam: {
      name: '考试周 / 期末周',
      input: '下周期末好多门，我感觉复习不完，打开计划表就开始慌。',
      pressure: '7.6 / 10', stageLabel: '期末周第 4 天', behavior: '待办 12 项',
      userState: { inputType: 'text', pressureScore: 7.6, stage: 'final_exam_week', recentBehavior: '12 pending tasks', source: ['text', 'task_log', 'self_report'] },
      outputs: {
        safety: '未发现自伤或极端绝望表达，可以进入普通压力支持流程。',
        scenario: '命中考试周场景：期末、多门课程、复习不完。',
        state: '压力偏高，时间压力和任务堆积正在造成失控感。',
        cognition: '核心困扰是任务过载，不是能力不足。需要先恢复掌控感。',
        memory: '记忆画像：用户常用倒计时清单，偏好先给明确的小步骤，陪伴语气宜温和务实。',
        action: '先处理最近一门考试，压缩为两个今日任务：重点章节与高频错题。'
      },
      result: { risk: '绿色 / 黄色边界', scenario: '考试周 / 期末周', pattern: '任务过载 + 时间压力', strategy: '最近考试优先 + 最小任务拆解', avatar: '考试周任务堆在一起，慌是很正常的。我们先不处理全部科目，只处理最近一门：今晚先复习最可能考的重点，再做二十分钟错题。', actions: ['列出最近一门考试', '选一个高频重点章节', '做二十分钟错题', '站起来活动五分钟'] },
      kb: { do: ['承认任务多确实会让人慌', '把计划压缩到一至三个任务'], avoid: ['不一次塞满整周计划', '不把熬夜包装成努力'], micro: ['最近考试优先', '二十分钟专注', '五分钟休息'] }
    },
    defense: {
      name: '答辩前 / 汇报前',
      input: '明天就要答辩，我怕老师追问的时候我答不上来。',
      pressure: '8.1 / 10', stageLabel: '答辩前 1 天', behavior: 'PPT 已完成，未模拟问答',
      userState: { inputType: 'voice_transcript', pressureScore: 8.1, stage: 'pre_defense', recentBehavior: 'slides completed, no rehearsal', source: ['voice', 'schedule', 'self_report'] },
      outputs: {
        safety: '未发现高风险表达，但存在明显的上台紧张。',
        scenario: '命中答辩前场景：答辩、老师追问、担心答不上来。',
        state: '当前处于高唤醒状态，身体可能持续紧绷。',
        cognition: '核心困扰是被评价焦虑，以及对未知问题的灾难化预期。',
        memory: '记忆画像：用户常用呼吸练习，偏好先稳定情绪再给建议，陪伴语气宜安抚。',
        action: '准备答辩三件套：开场三十秒、项目亮点、三个可能追问。'
      },
      result: { risk: '黄色', scenario: '答辩前 / 汇报前', pattern: '被评价焦虑', strategy: '身体稳定 + 答辩三件套', avatar: '答辩前紧张不代表你不行，而是你很在意结果。现在先不大改内容，我们只抓开场三十秒、项目亮点和三个可能追问。', actions: ['做三轮慢呼吸', '读一遍开场三十秒', '写下三个可能问题', '准备一句缓冲话术'] },
      kb: { do: ['先稳定身体反应', '准备开场、亮点和可能问题'], avoid: ['不临时大改 PPT', '不承诺一定没问题'], micro: ['开场三十秒', '三个追问', '三轮慢呼吸'] }
    },
    fatigue: {
      name: '连续学习后 / 疲劳透支',
      input: '我学了一下午，现在看什么都记不住，但又不敢停下来。',
      pressure: '6.8 / 10', stageLabel: '连续学习 4 小时', behavior: '睡眠不足 6 小时',
      userState: { inputType: 'text', pressureScore: 6.8, stage: 'long_study_fatigue', recentBehavior: '4 hours continuous study, sleep < 6h', source: ['text', 'study_timer', 'sleep_log'] },
      outputs: {
        safety: '未发现高风险表达，重点是防止继续低效率硬撑。',
        scenario: '命中连续学习后场景：学习时间过长、记不住、不敢停。',
        state: '能量不足、注意力下降，继续输入新内容的收益已经很低。',
        cognition: '核心困扰是把休息误认为放弃。',
        memory: '记忆画像：用户近期目标包含规律入睡，常用工具是专注计时，陪伴语气宜鼓励但不加压。',
        action: '离开屏幕五分钟，回来后只做低强度错题复盘。'
      },
      result: { risk: '绿色', scenario: '连续学习后 / 疲劳透支', pattern: '低效率硬撑', strategy: '停止加码 + 能量恢复', avatar: '现在看不进去不是意志力差，而是大脑需要恢复。先离开屏幕五分钟，喝水、活动肩颈，回来后只整理三道错题。', actions: ['离开屏幕五分钟', '喝水并活动肩颈', '只整理三道错题', '设定结束学习时间'] },
      kb: { do: ['肯定已经投入的努力', '建议离屏恢复'], avoid: ['不继续追加新任务', '不用“再坚持一下”推动过载'], micro: ['离屏五分钟', '整理三道错题', '设结束时间'] }
    }
  };

  const agentNames = { safety: '安全 Agent', scenario: '场景 Agent', state: '状态 Agent', cognition: '认知 Agent', memory: '记忆画像 Agent', action: '行动 Agent' };
  const agentKeys = Object.keys(agentNames);
  const crisisPattern = /(不想活|自杀|伤害自己|结束生命|活着没意思|撑不下去)/;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  let currentScenario = 'exam';
  let currentAnalysis = scenarios[currentScenario];
  let timers = [];
  let typeTimer = null;

  const AgentAPI = {
    endpoint: `${window.NEUROMATE_AGENT_ENDPOINT || ''}/api/agent-cluster/analyze`,
    timeout: 1200,
    async analyze(payload) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), this.timeout);
      try {
        const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        if (!response.ok) throw new Error(`Agent request failed: ${response.status}`);
        const body = await response.json();
        return { source: 'api', data: normalizeAnalysis(body.data || body, buildMock(payload.scenario, payload.input)) };
      } catch (error) {
        return { source: 'mock', data: buildMock(payload.scenario, payload.input), error };
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
  };
  window.NeuroMateAgentAdapter = AgentAPI;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function buildMock(key, input) {
    const data = clone(scenarios[key]);
    if (!crisisPattern.test(input)) return data;
    data.outputs.safety = '检测到可能涉及自伤、极端绝望或生命安全的表达，停止普通建议，优先连接现实支持。';
    data.outputs.action = '建议立即联系可信赖的人陪在身边，并联系学校心理中心、当地急救或专业机构。';
    data.result = { risk: '红色 / 需要现实支持', scenario: '安全优先流程', pattern: '高风险表达待人工确认', strategy: '停止普通干预 + 现实支持转介', avatar: '我很重视你刚才说的话。现在先不要一个人承受，请尽快联系一位可信赖的人陪在身边，并联系学校心理中心、当地急救或专业机构。', actions: ['联系一位可信赖的人', '不要独处', '联系学校心理中心', '紧急情况下联系当地急救'] };
    data.kb = { do: ['认真确认当下安全', '鼓励现实中的人立即介入'], avoid: ['不继续普通学习建议', '不承诺完全保密'], micro: ['联系可信赖的人', '前往有人陪伴的空间'] };
    return data;
  }
  function normalizeAnalysis(value, fallback) {
    return { ...fallback, ...value, outputs: { ...fallback.outputs, ...(value.outputs || {}) }, result: { ...fallback.result, ...(value.result || {}) }, kb: { ...fallback.kb, ...(value.kb || {}) } };
  }
  function schedule(callback, delay) { const id = window.setTimeout(callback, reducedMotion ? Math.min(delay, 80) : delay); timers.push(id); }
  function clearTimers() { timers.forEach(window.clearTimeout); timers = []; typeTimer = null; }
  function now() { return new Date().toLocaleTimeString('zh-CN', { hour12: false }); }

  function renderScenario(key) {
    currentScenario = key;
    currentAnalysis = scenarios[key];
    const data = scenarios[key];
    $('#agentInput').value = data.input;
    $('#pressureValue').textContent = data.pressure;
    $('#stageValue').textContent = data.stageLabel;
    $('#behaviorValue').textContent = data.behavior;
    updateJson();
    $$('[data-scenario]').forEach((button) => button.classList.toggle('active', button.dataset.scenario === key));
    reset(false);
  }
  function updateJson() {
    const data = scenarios[currentScenario];
    $('#jsonPreview').textContent = JSON.stringify({ ...data.userState, rawText: $('#agentInput').value }, null, 2);
  }
  function setRunState(text, state) { const element = $('#runState'); element.className = `run-state ${state || ''}`; const dot = document.createElement('i'); element.replaceChildren(dot, document.createTextNode(text)); }
  function setNode(selector, state) { const node = $(selector); node.classList.remove('active', 'done'); if (state) node.classList.add(state); const status = node.querySelector('em'); if (status) status.textContent = state === 'active' ? 'RUNNING' : state === 'done' ? 'DONE' : 'WAIT'; }
  function setAgent(key, state) { const node = $(`[data-agent="${key}"]`); node.classList.remove('running', 'done', 'selected'); if (state) node.classList.add(state); node.querySelector('em').textContent = state === 'running' ? '分析中' : state === 'done' ? '已完成' : '等待'; }
  function setEdge(name, active) { const edge = $(`[data-edge="${name}"]`); if (edge) edge.classList.toggle('active', active); }

  const topologyCopy = {
    input: ['输入事件 · 状态融合', '学生压力状态被收集为统一状态卡（文本、行为记录、自评分数），等待调度中枢分发。'],
    scheduler: ['调度中枢 · 依赖控制', '按依赖关系分发：安全与场景并行判断，状态、认知、记忆画像依次推进，最后汇总。'],
    synthesis: ['汇总 Agent · 安全校验与生成', '整合安全校验、知识检索与记忆画像，生成元元的自然、克制的陪伴回应。']
  };

  function showDetail(key) {
    const node = $(`[data-agent="${key}"]`);
    if (node) $$('[data-agent]').forEach((item) => item.classList.toggle('selected', item.dataset.agent === key));
    const label = document.createElement('span'); label.textContent = topologyCopy[key] ? `${topologyCopy[key][0]} · 节点说明` : `${agentNames[key]} 输出`;
    const message = document.createElement('p'); message.textContent = topologyCopy[key] ? topologyCopy[key][1] : String(currentAnalysis.outputs[key] || '暂无输出');
    $('#agentDetail').replaceChildren(label, message);
  }
  function addLog(text, type) {
    const row = document.createElement('p'); if (type) row.className = type;
    const time = document.createElement('time'); time.textContent = now();
    const marker = document.createElement('i');
    const message = document.createElement('span'); message.textContent = String(text);
    row.append(time, marker, message); $('#traceList').prepend(row);
  }
  function renderKnowledge(data) {
    const container = $('#knowledgeList'); container.replaceChildren();
    [['回应原则', data.kb.do], ['避免话术', data.kb.avoid], ['微行动', data.kb.micro]].forEach(([title, items]) => {
      const row = document.createElement('p'); const heading = document.createElement('strong'); heading.textContent = title; row.append(heading);
      (items || []).forEach((item) => { const pill = document.createElement('span'); pill.className = 'knowledge-pill'; pill.textContent = String(item); row.append(pill); });
      container.append(row);
    });
  }
  function typewriterSay(text, onDone) {
    if (typeTimer) { window.clearTimeout(typeTimer); typeTimer = null; }
    const target = $('#avatarText');
    target.textContent = '';
    target.classList.add('typing');
    let i = 0;
    function tick() {
      if (i < text.length) {
        target.textContent += text.charAt(i);
        i += 1;
        typeTimer = window.setTimeout(tick, reducedMotion ? 0 : 42 + Math.random() * 26);
        timers.push(typeTimer);
      } else {
        target.classList.remove('typing');
        typeTimer = null;
        if (onDone) onDone();
      }
    }
    tick();
  }

  function renderResult(data, source) {
    $('#riskResult').textContent = data.result.risk;
    $('#scenarioResult').textContent = data.result.scenario;
    $('#patternResult').textContent = data.result.pattern;
    typewriterSay(data.result.avatar);
    const actions = $('#actionList'); actions.replaceChildren();
    (data.result.actions || []).forEach((action) => { const item = document.createElement('li'); item.textContent = String(action); actions.append(item); });
    $('#avatarState').textContent = '正在生成陪伴回应'; $('#avatarOutput').classList.add('speaking');
    const context = { scenario: data.result.scenario, risk: data.result.risk, pattern: data.result.pattern, strategy: data.result.strategy, actions: data.result.actions, avatar: data.result.avatar, source, createdAt: new Date().toISOString() };
    sessionStorage.setItem('neuromate.agentContext', JSON.stringify(context));
    $('#handoffButton').classList.remove('disabled'); $('#handoffButton').setAttribute('aria-disabled', 'false');
  }

  function reset(clearLog = true) {
    clearTimers(); $('#topology').classList.remove('running'); $('#runAgents').disabled = false;
    setRunState('等待输入', ''); setNode('#inputNode', ''); setNode('#schedulerNode', ''); setNode('#synthesisNode', '');
    agentKeys.forEach((key) => setAgent(key, '')); ['input-scheduler', 'state-cognition', 'cognition-memory', 'memory-action'].forEach((edge) => setEdge(edge, false));
    $('#agentDetail').querySelector('span').textContent = '当前节点输出'; $('#agentDetail').querySelector('p').textContent = '点击运行后，这里会同步展示每个 Agent 的分析。';
    $('#riskResult').textContent = '未运行'; $('#scenarioResult').textContent = '未运行'; $('#patternResult').textContent = '未运行';
    $('#avatarText').textContent = 'Agent 集群完成后，元元会把技术结论转换成自然、克制的陪伴回应。'; $('#avatarText').classList.remove('typing'); $('#avatarState').textContent = '等待 Agent 结果'; $('#avatarOutput').classList.remove('speaking');
    const waiting = document.createElement('li'); waiting.textContent = '等待行动建议'; $('#actionList').replaceChildren(waiting);
    const kb = document.createElement('p'); kb.textContent = '运行后展示回应原则、避免话术和微行动。'; $('#knowledgeList').replaceChildren(kb);
    $('#handoffButton').classList.add('disabled'); $('#handoffButton').setAttribute('aria-disabled', 'true');
    if (clearLog) { $('#traceList').replaceChildren(); addLog('等待启动 Agent 集群。'); }
  }

  function run() {
    const input = $('#agentInput').value.trim();
    if (!input) { $('#agentInput').focus(); addLog('请输入此刻想说的话。', 'warn'); return; }
    reset(); $('#runAgents').disabled = true; $('#topology').classList.add('running'); setRunState('多 Agent 正在分析', 'running'); setNode('#inputNode', 'active');
    addLog(`收到用户输入：${input}`, 'warn');
    const request = AgentAPI.analyze({ scenario: currentScenario, input, userState: { ...scenarios[currentScenario].userState, rawText: input } });

    schedule(() => { setNode('#inputNode', 'done'); setEdge('input-scheduler', true); setNode('#schedulerNode', 'active'); addLog('调度中枢完成状态融合，开始分发任务。', 'warn'); }, 450);
    schedule(() => { setEdge('input-scheduler', false); ['safety', 'scenario'].forEach((key) => { setAgent(key, 'running'); showDetail(key); addLog(`${agentNames[key]} 开始并行分析。`); }); }, 850);
    schedule(() => { ['safety', 'scenario'].forEach((key) => { setAgent(key, 'done'); addLog(`${agentNames[key]} 已完成。`, 'done'); }); setAgent('state', 'running'); showDetail('state'); addLog('核心链路开始：状态 Agent 正在分析。'); }, 1450);
    schedule(() => { setAgent('state', 'done'); setEdge('state-cognition', true); setAgent('cognition', 'running'); showDetail('cognition'); addLog('状态结论已传入认知 Agent。', 'done'); }, 2150);
    schedule(() => { setEdge('state-cognition', false); setAgent('cognition', 'done'); setEdge('cognition-memory', true); setAgent('memory', 'running'); showDetail('memory'); addLog('认知模式已传入记忆画像 Agent，开始匹配历史偏好。', 'done'); }, 2750);
    schedule(() => { setEdge('cognition-memory', false); setAgent('memory', 'done'); setEdge('memory-action', true); setAgent('action', 'running'); showDetail('action'); addLog('记忆画像已就位，行动 Agent 开始生成最小下一步。', 'done'); }, 3350);
    schedule(() => { setEdge('memory-action', false); setAgent('action', 'done'); setNode('#schedulerNode', 'done'); setNode('#synthesisNode', 'active'); addLog('汇总 Agent 正在执行安全校验与知识检索。', 'warn'); }, 3950);
    schedule(async () => {
      const analysis = await request; currentAnalysis = analysis.data;
      setNode('#synthesisNode', 'done'); $('#topology').classList.remove('running'); renderKnowledge(currentAnalysis); renderResult(currentAnalysis, analysis.source);
      setRunState('协作完成', 'done'); $('#runAgents').disabled = false;
      addLog(analysis.source === 'api' ? '后端 Agent 服务返回结果。' : '后端不可用，已使用本地演示数据。', analysis.source === 'api' ? 'done' : 'warn');
      addLog('元元已获得结构化上下文，可以继续陪伴。', 'done');
    }, 4650);
  }

  $$('[data-scenario]').forEach((button) => button.addEventListener('click', () => renderScenario(button.dataset.scenario)));
  $$('[data-agent]').forEach((button) => {
    button.addEventListener('click', () => showDetail(button.dataset.agent));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetail(button.dataset.agent); }
    });
  });
  ['input', 'scheduler', 'synthesis'].forEach((key) => {
    const node = $(`#${key}Node`);
    if (!node) return;
    node.addEventListener('click', () => showDetail(key));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetail(key); }
    });
  });
  $('#agentInput').addEventListener('input', updateJson);
  $('#runAgents').addEventListener('click', run);
  $('#resetAgents').addEventListener('click', () => reset());
  $('#agentsMenu').addEventListener('click', () => { const open = $('#agentsNav').classList.toggle('open'); $('#agentsMenu').setAttribute('aria-expanded', String(open)); });
  renderScenario(currentScenario);
})();
