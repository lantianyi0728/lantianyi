/*
 * AI 视频专题 · 密码门
 * ------------------------------------------------------------------
 * 两个页面共用这一个脚本：
 *   index.html    → <body data-gate="link">  点导航里的「AI 视频」先弹密码框
 *   ai-video.html → <body data-gate="page">  直接输网址进来也拦得住
 *
 * 要改密码 / 改音频，只动下面这两行就行。
 */
(function () {
  'use strict';

  var PASSWORD = '5438'; // ← 4 位数字密码
  var AUDIO_FILE = '音频.mp3'; // ← 输错密码时循环播放的音频
  var STORAGE_KEY = 'aiVideoUnlocked'; // 记住"已经输对过"，存在 sessionStorage，关掉浏览器就失效

  var html = document.documentElement;
  var mode = document.body ? document.body.getAttribute('data-gate') : null;
  if (!mode || (mode !== 'link' && mode !== 'page')) return;

  /* ---------------- 小工具 ---------------- */

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'yes';
    } catch (e) {
      return false; // 隐私模式下 sessionStorage 可能不可用，此时每次都要求输密码
    }
  }

  function remember() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'yes');
    } catch (e) {
      /* 存不了就算了，功能不受影响 */
    }
  }

  /* ---------------- 音频 ---------------- */

  var audio = document.createElement('audio');
  audio.id = 'ai-gate-audio';
  audio.loop = true; // 循环播放
  audio.preload = 'auto';
  audio.src = AUDIO_FILE;
  document.body.appendChild(audio);

  function playAudio() {
    audio.currentTime = 0;
    var p = audio.play();
    // 有些浏览器会拦自动播放；这里是在点击事件里触发的，通常放得出来，失败就安静地跳过
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  function stopAudio() {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      /* 忽略 */
    }
  }

  /* ---------------- 密码输入框 ---------------- */

  var gate = make('div', 'gate');
  gate.id = 'ai-gate';
  gate.hidden = true;

  var backdrop = make('div', 'gate-backdrop');
  gate.appendChild(backdrop);

  var box = make('div', 'gate-box');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'ai-gate-title');

  var closeBtn = make('button', 'gate-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', '关闭，返回个人主页');
  box.appendChild(closeBtn);

  box.appendChild(make('p', 'gate-kicker', 'AI 视频专题'));

  var title = make('h2', 'gate-title', '这里需要密码');
  title.id = 'ai-gate-title';
  box.appendChild(title);

  box.appendChild(make('p', 'gate-hint', '请输入 4 位数字密码'));

  // type="text" 而不是 "password" —— 用户要能看见自己输入的是什么
  var input = make('input', 'gate-input');
  input.type = 'text';
  input.id = 'ai-gate-input';
  input.inputMode = 'numeric';
  input.maxLength = 4;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', '4 位数字密码');
  input.setAttribute('placeholder', '····');
  box.appendChild(input);

  var actions = make('div', 'gate-actions');
  var submitBtn = make('button', 'gate-btn gate-btn--primary', '进入');
  submitBtn.type = 'button';
  submitBtn.id = 'ai-gate-submit';
  var cancelBtn = make('button', 'gate-btn', '算了');
  cancelBtn.type = 'button';
  cancelBtn.id = 'ai-gate-cancel';
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  box.appendChild(actions);

  gate.appendChild(box);
  document.body.appendChild(gate);

  /* ---------------- 「小样还想偷看」提示框 ---------------- */

  var deny = make('div', 'gate gate--deny');
  deny.id = 'ai-gate-deny';
  deny.hidden = true;

  deny.appendChild(make('div', 'gate-backdrop'));

  var denyBox = make('div', 'gate-box gate-box--deny');
  denyBox.setAttribute('role', 'alertdialog');
  denyBox.setAttribute('aria-modal', 'true');

  denyBox.appendChild(
    make('p', 'gate-deny-text', '小样还想偷看，我的视频（请输入正确密码在继续哦！！！）')
  );

  var continueBtn = make('button', 'gate-btn gate-btn--primary', '继续');
  continueBtn.type = 'button';
  continueBtn.id = 'ai-gate-continue';
  denyBox.appendChild(continueBtn);

  deny.appendChild(denyBox);
  document.body.appendChild(deny);

  /* ---------------- 开关逻辑 ---------------- */

  var pendingHref = null; // link 模式下，密码对了一起跳转的地址

  function openGate() {
    deny.hidden = true;
    gate.hidden = false;
    html.classList.add('gate-open'); // 锁住页面滚动
    input.value = '';
    input.focus();
  }

  function onCorrect() {
    remember();
    stopAudio();
    gate.hidden = true;
    deny.hidden = true;
    html.classList.remove('gate-open');
    html.classList.remove('gate-locked');

    if (mode === 'link' && pendingHref) {
      window.location.href = pendingHref;
    }
    // page 模式下，解锁后本来就是当前页，什么都不用做
  }

  function onSubmit() {
    var value = (input.value || '').replace(/\s/g, '');
    if (value === PASSWORD) {
      onCorrect();
      return;
    }
    // 密码错误：弹出提示框，并开始循环播放音频
    gate.hidden = true;
    deny.hidden = false;
    playAudio();
    continueBtn.focus();
  }

  // 点「继续」：回到密码输入。注意这里**不停音频** ——
  // 按要求，音乐要一直循环到密码输对为止。
  continueBtn.addEventListener('click', function () {
    deny.hidden = true;
    gate.hidden = false;
    input.value = '';
    input.focus();
  });

  // 主动放弃（× 或「算了」或点遮罩 / ESC）：停音频、关掉所有浮层
  function giveUp() {
    stopAudio();
    gate.hidden = true;
    deny.hidden = true;
    html.classList.remove('gate-open');

    if (mode === 'page') {
      // 专题页被锁着，留在空白页没意义，送回个人主页
      window.location.href = 'index.html';
      return;
    }
    html.classList.remove('gate-locked');
  }

  submitBtn.addEventListener('click', onSubmit);
  cancelBtn.addEventListener('click', giveUp);
  closeBtn.addEventListener('click', giveUp);

  // 点密码框外面的遮罩算放弃；提示框的遮罩不响应，免得误触打断音频
  backdrop.addEventListener('click', giveUp);

  // 只让输入 4 位数字
  input.addEventListener('input', function () {
    var cleaned = input.value.replace(/\D/g, '').slice(0, 4);
    if (cleaned !== input.value) input.value = cleaned;
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!gate.hidden || !deny.hidden) giveUp();
  });

  /* ---------------- 两种模式各自的入口 ---------------- */

  if (mode === 'page') {
    if (isUnlocked()) {
      // 已经从主页输对过密码，直接放行
    } else {
      html.classList.add('gate-locked'); // 先把正文藏起来，别让浮层后面的内容露出来
      openGate();
    }
  } else {
    // link 模式：拦下页面里所有指向 ai-video.html 的链接（导航、正文、页脚）
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href$="ai-video.html"]') : null;
      if (!link) return;
      if (isUnlocked()) return; // 已经输对过，直接放行
      e.preventDefault();
      pendingHref = link.getAttribute('href') || 'ai-video.html';
      openGate();
    });
  }
})();
