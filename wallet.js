/* 元知己共享钱包：单一货币「星贝」+ 星轨抽卡状态 + 跨页衣橱收藏。
   我的空间（space.html）与会员页（membership.html）共用此模块，
   余额、签到、免费券、保底进度与已购装扮在两页间实时一致。 */
window.NeurWallet = (function () {
  'use strict';

  const storageKey = 'neuromate-wallet-v1';
  const defaults = {
    starbell: 800,
    tickets: 1,
    pity: 0,
    streak: 0,
    lastSignin: '',
    paidDrawsDate: '',
    paidDraws: 0,
    owned: ['star', 'none', 'clear', 'soft', 'bright'],
    legacySpace: false,
    legacyMembership: false
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return structuredClone(defaults);
      return { ...structuredClone(defaults), ...saved };
    } catch (error) {
      return structuredClone(defaults);
    }
  }

  const state = load();

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* 原型环境允许无存储运行。 */ }
  }

  function dateString(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + (offsetDays || 0));
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  return {
    state,
    save,
    dateString,
    format(value) { return value.toLocaleString('zh-CN'); },
    earn(amount) { state.starbell += amount; save(); },
    spend(amount) {
      if (state.starbell < amount) return false;
      state.starbell -= amount;
      save();
      return true;
    },
    own(id) {
      if (!state.owned.includes(id)) {
        state.owned.push(id);
        save();
      }
    },
    has(id) { return state.owned.includes(id); }
  };
})();
