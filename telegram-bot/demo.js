// Демо бота в браузере. Форматирование и логика повторяют bot.js,
// вместо Telegram API — чат на странице, вместо файла — данные в памяти.
(function () {
  const TZ = 'Europe/Moscow';
  const PAGE_SIZE = 8;
  const REMIND_MINUTES = 30;
  const STATUSES = {
    new: { emoji: '🆕', title: 'Новая' },
    work: { emoji: '⏳', title: 'В работе' },
    done: { emoji: '✅', title: 'Закрыта' },
    rejected: { emoji: '❌', title: 'Отказ / спам' }
  };
  const FILTERS = {
    all: { title: '📋 Все заявки' },
    new: { title: '🆕 Новые' },
    work: { title: '⏳ В работе' },
    done: { title: '✅ Закрытые' },
    rejected: { title: '❌ Отказы' },
    q: { title: '🔍 Результаты поиска' }
  };
  const SITES = { law: 'Корнилов и партнёры', fit: 'PULSE LAB', owl: 'Owl School' };
  const ME = 'Вы';

  // ---------- Демо-данные ----------
  const now = Date.now();
  const ago = min => new Date(now - min * 60000).toISOString();
  let nextId = 1;
  const leads = [];
  function seed(site, minutesAgo, status, fields, reactMin, notes = []) {
    const createdAt = ago(minutesAgo);
    const lead = {
      id: nextId++, site, createdAt, status, fields,
      name: Object.entries(fields).find(([k]) => /имя/i.test(k))[1],
      phone: fields['Телефон'],
      notes: notes.map(([text, after]) => ({ text, author: 'Даниил', at: ago(minutesAgo - after) })),
      firstActionAt: status !== 'new' ? ago(minutesAgo - reactMin) : null,
      messages: []
    };
    if (status !== 'new') lead.notes.unshift({ text: `статус → ${STATUSES[status].title}`, author: 'Даниил', at: lead.firstActionAt });
    leads.push(lead);
  }
  seed(SITES.law, 8650, 'done', { 'Имя': 'Сергей Волков', 'Телефон': '+7 (916) 204-33-18', 'Компания': 'ТД «Север»', 'Ситуация': 'Акт выездной проверки, доначисления 38 млн ₽' }, 14, [['Договор подписан, работаем', 300]]);
  seed(SITES.fit, 8200, 'done', { 'Имя': 'Алина Гарипова', 'Телефон': '+7 (987) 555-12-40', 'Цель / абонемент': 'Снизить вес', 'Заявка': 'Бесплатная пробная тренировка' }, 22);
  seed(SITES.owl, 7300, 'done', { 'Имя родителя': 'Ольга Смирнова', 'Телефон': '+7 (913) 761-02-55', 'Возраст ребёнка': '8–10 лет', 'Программа': 'Explorers', 'Формат': 'в классе', 'Заявка': 'Бесплатный пробный урок' }, 9);
  seed(SITES.law, 5900, 'work', { 'Имя': 'Павел Никитин', 'Телефон': '+7 (903) 118-47-90', 'Компания': 'ООО «Стройресурс»', 'Ситуация': 'Генподрядчик не платит 12 млн ₽ за поставку' }, 31, [['Ждём от клиента договор поставки и акты', 120]]);
  seed(SITES.fit, 5600, 'rejected', { 'Имя': 'test', 'Телефон': '+7 (900) 000-00-01', 'Цель / абонемент': 'не указано', 'Заявка': 'Бесплатная пробная тренировка' }, 5);
  seed(SITES.owl, 4300, 'done', { 'Имя родителя': 'Наталья Ким', 'Телефон': '+7 (952) 330-71-19', 'Возраст ребёнка': '5–7 лет', 'Программа': 'Little Owls', 'Формат': 'онлайн', 'Заявка': 'Бесплатный пробный урок' }, 17);
  seed(SITES.law, 2900, 'work', { 'Имя': 'Марина Лебедева', 'Телефон': '+7 (925) 643-55-27', 'Ситуация': 'Партнёр по бизнесу выводит активы, нужен выход из ООО' }, 12, [['Встреча в офисе в четверг, 15:00', 40]]);
  seed(SITES.fit, 2700, 'done', { 'Имя': 'Дмитрий Орлов', 'Телефон': '+7 (917) 289-64-03', 'Цель / абонемент': 'Абонемент «12 недель»', 'Заявка': 'Бесплатная пробная тренировка' }, 26);
  seed(SITES.owl, 1350, 'work', { 'Имя родителя': 'Екатерина Белова', 'Телефон': '+7 (960) 412-08-86', 'Возраст ребёнка': '11–14 лет', 'Программа': 'Young Leaders', 'Формат': 'в классе', 'Заявка': 'Бесплатный пробный урок' }, 19);
  seed(SITES.law, 190, 'new', { 'Имя': 'Андрей Соколов', 'Телефон': '+7 (999) 555-20-14', 'Компания': 'ИП Соколов', 'Ситуация': 'Заблокировали расчётный счёт по 115-ФЗ', 'Срочно': '🔥 Да, нужна помощь сегодня' });
  seed(SITES.fit, 44, 'new', { 'Имя': 'Ирина Зуева', 'Телефон': '+7 (937) 701-38-62', 'Цель / абонемент': 'Убрать боль в спине', 'Заявка': 'Бесплатная пробная тренировка' });

  // ---------- Форматирование (как в bot.js) ----------
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fmtDate = iso => new Date(iso).toLocaleString('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fmtTime = d => d.toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const dayKey = date => date.toLocaleDateString('ru-RU', { timeZone: TZ });
  const statusLabel = s => `${STATUSES[s].emoji} ${STATUSES[s].title}`;

  function formatDuration(ms) {
    const min = Math.round(ms / 60000);
    if (min < 1) return 'меньше минуты';
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    if (h < 48) return `${h} ч ${min % 60} мин`;
    return `${Math.floor(h / 24)} дн`;
  }

  function leadCard(lead) {
    const lines = [
      `${STATUSES[lead.status].emoji} <b>Заявка #${lead.id}</b> · ${STATUSES[lead.status].title}`,
      `🌐 ${esc(lead.site)}`,
      `🕒 ${fmtDate(lead.createdAt)}`,
      ''
    ];
    for (const [label, value] of Object.entries(lead.fields)) lines.push(`<b>${esc(label)}:</b> ${esc(value)}`);
    if (lead.notes.length) {
      lines.push('', '📝 <b>Заметки:</b>');
      lead.notes.forEach(n => lines.push(`— ${esc(n.text)} <i>(${esc(n.author)}, ${fmtDate(n.at)})</i>`));
    }
    return lines.join('\n');
  }

  function leadKeyboard(lead) {
    const buttons = Object.keys(STATUSES)
      .filter(s => s !== lead.status)
      .map(s => ({ text: s === 'new' ? '🆕 Вернуть в новые' : statusLabel(s), data: `st:${lead.id}:${s}` }));
    return [buttons.slice(0, 2), buttons.slice(2).concat({ text: '📝 Заметка', data: `note:${lead.id}` })];
  }

  function search(query) {
    const q = query.toLowerCase();
    const digits = q.replace(/\D/g, '');
    return [...leads].reverse().filter(l => {
      const hay = [l.site, ...Object.values(l.fields), ...l.notes.map(n => n.text)].join(' ').toLowerCase();
      return hay.includes(q) || (digits.length >= 4 && l.phone.replace(/\D/g, '').includes(digits));
    });
  }

  let lastQuery = '';
  function listView(filter, page) {
    const list = filter === 'q' ? search(lastQuery)
      : [...leads].reverse().filter(l => filter === 'all' || l.status === filter);
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(Math.max(0, page), pages - 1);
    const slice = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    let header = `<b>${FILTERS[filter].title}</b>`;
    if (filter === 'q') header += ` по «${esc(lastQuery)}»`;
    header += ` — ${list.length}`;
    if (pages > 1) header += ` · стр. ${page + 1}/${pages}`;
    const lines = [header, ''];
    if (!slice.length) lines.push('Здесь пока пусто.');
    slice.forEach(l => {
      lines.push(`${STATUSES[l.status].emoji} <b>#${l.id}</b> · ${esc(l.name || 'без имени')} · ${esc(l.phone)}`);
      lines.push(`      <i>${fmtDate(l.createdAt)} · ${esc(l.site)}</i>`);
    });
    if (slice.length) lines.push('', 'Нажмите на номер, чтобы открыть заявку.');

    const kb = [];
    for (let i = 0; i < slice.length; i += 4) kb.push(slice.slice(i, i + 4).map(l => ({ text: `#${l.id}`, data: `open:${l.id}` })));
    if (pages > 1) {
      kb.push([
        { text: page > 0 ? '◀️' : '·', data: page > 0 ? `list:${filter}:${page - 1}` : 'noop' },
        { text: `${page + 1} / ${pages}`, data: 'noop' },
        { text: page < pages - 1 ? '▶️' : '·', data: page < pages - 1 ? `list:${filter}:${page + 1}` : 'noop' }
      ]);
    }
    if (filter !== 'q') {
      kb.push(['all', 'new', 'work', 'done', 'rejected'].map(f => ({
        text: (f === filter ? '• ' : '') + (f === 'all' ? 'Все' : STATUSES[f].emoji),
        data: `list:${f}:0`
      })));
    }
    return { html: lines.join('\n'), kb };
  }

  function statsText() {
    const t = Date.now();
    const since = days => leads.filter(l => t - new Date(l.createdAt) < days * 86400000).length;
    const today = dayKey(new Date());
    const count = s => leads.filter(l => l.status === s).length;
    const processed = leads.filter(l => l.firstActionAt);
    const avg = processed.length ? processed.reduce((s, l) => s + (new Date(l.firstActionAt) - new Date(l.createdAt)), 0) / processed.length : null;
    const closed = count('done');
    const decided = closed + count('rejected');
    const lines = [
      '📊 <b>Статистика заявок</b>', '',
      `Сегодня: <b>${leads.filter(l => dayKey(new Date(l.createdAt)) === today).length}</b>`,
      `За 7 дней: <b>${since(7)}</b> · за 30 дней: <b>${since(30)}</b> · всего: <b>${leads.length}</b>`, '',
      `${statusLabel('new')}: ${count('new')}`,
      `${statusLabel('work')}: ${count('work')}`,
      `${statusLabel('done')}: ${closed}`,
      `${statusLabel('rejected')}: ${count('rejected')}`, ''
    ];
    if (decided) lines.push(`🎯 Доля закрытых: <b>${Math.round(closed / decided * 100)}%</b> (из обработанных до конца)`);
    if (avg !== null) lines.push(`⚡ Среднее время реакции: <b>${formatDuration(avg)}</b>`);
    const byDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(t - i * 86400000);
      const key = dayKey(d);
      byDay.push({ label: d.toLocaleDateString('ru-RU', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' }), n: leads.filter(l => dayKey(new Date(l.createdAt)) === key).length });
    }
    const max = Math.max(1, ...byDay.map(d => d.n));
    lines.push('', '<b>Последние 7 дней:</b>', '<code>' + byDay.map(d => `${d.label.padEnd(10)} ${'█'.repeat(Math.round(d.n / max * 10)).padEnd(10, '·')} ${d.n}`).join('\n') + '</code>');
    const sites = {};
    leads.forEach(l => { sites[l.site] = (sites[l.site] || 0) + 1; });
    lines.push('<b>По сайтам:</b>');
    Object.entries(sites).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => lines.push(`• ${esc(s)} — ${n}`));
    return lines.join('\n');
  }

  function exportCsv() {
    const fieldNames = [...new Set(leads.flatMap(l => Object.keys(l.fields)))];
    const header = ['№', 'Дата', 'Сайт', 'Статус', ...fieldNames, 'Заметки'];
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = leads.map(l => [l.id, fmtDate(l.createdAt), l.site, STATUSES[l.status].title, ...fieldNames.map(f => l.fields[f]), l.notes.map(n => `${n.text} (${n.author})`).join('; ')]);
    return '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
  }

  const HELP = [
    '👋 <b>Бот для заявок с сайта</b>', '',
    'Каждая новая заявка приходит сюда с кнопками: «В работу», «Закрыть», «Отказ» и «Заметка».', '',
    '<b>Команды:</b>',
    '/leads — все заявки',
    '/new — необработанные заявки',
    '/lead 12 — открыть заявку №12',
    '/find Иван — поиск по имени, телефону или тексту',
    '/stats — статистика',
    '/export — выгрузка в Excel (CSV)',
    '/myid — узнать свой chat id', '',
    `Если заявка висит в «Новых» дольше ${REMIND_MINUTES} мин, бот напомнит о ней.`,
    'Можно просто отправить имя или номер телефона — бот найдёт заявку.'
  ].join('\n');

  // ---------- Чат ----------
  const box = document.getElementById('messages');
  const toastEl = document.getElementById('toast');
  let msgSeq = 0;
  const msgEls = new Map();

  function render(el, html, kb) {
    const bubble = el.querySelector('.msg__bubble');
    bubble.innerHTML = html + `<span class="msg__time">${fmtTime(new Date())}</span>`;
    el.querySelector('.kb')?.remove();
    if (kb && kb.length) {
      const k = document.createElement('div');
      k.className = 'kb';
      kb.forEach(row => {
        const r = document.createElement('div');
        r.className = 'kb__row';
        row.forEach(b => {
          const btn = document.createElement('button');
          btn.textContent = b.text;
          btn.addEventListener('click', () => callback(b.data, el.dataset.id));
          r.appendChild(btn);
        });
        k.appendChild(r);
      });
      el.appendChild(k);
    }
  }

  function botSay(html, kb) {
    const el = document.createElement('div');
    el.className = 'msg';
    el.dataset.id = ++msgSeq;
    el.innerHTML = '<div class="msg__bubble"></div>';
    render(el, html, kb);
    box.appendChild(el);
    msgEls.set(String(msgSeq), el);
    box.scrollTop = box.scrollHeight;
    return String(msgSeq);
  }

  function edit(id, html, kb) {
    const el = msgEls.get(String(id));
    if (!el) return;
    render(el, html, kb);
    const b = el.querySelector('.msg__bubble');
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
  }

  function meSay(text) {
    const el = document.createElement('div');
    el.className = 'msg msg--me';
    el.innerHTML = `<div class="msg__bubble">${esc(text)}<span class="msg__time">${fmtTime(new Date())} ✓✓</span></div>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  function toast(text) {
    if (!text) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ---------- Действия бота ----------
  const findLead = id => leads.find(l => l.id === Number(id));

  function sendCard(lead, prefix = '') {
    const id = botSay(prefix + leadCard(lead), leadKeyboard(lead));
    lead.messages.push(id);
  }
  function refreshCards(lead) {
    lead.messages.forEach(id => edit(id, (msgEls.get(id).dataset.prefix || '') + leadCard(lead), leadKeyboard(lead)));
  }
  function showList(filter) {
    const v = listView(filter, 0);
    botSay(v.html, v.kb);
  }
  function runSearch(q) {
    lastQuery = q;
    const v = listView('q', 0);
    botSay(v.html, v.kb);
  }
  function doExport() {
    const date = new Date().toLocaleDateString('ru-RU', { timeZone: TZ }).replace(/\./g, '-');
    const url = URL.createObjectURL(new Blob([exportCsv()], { type: 'text/csv' }));
    botSay(`<div class="msg__file"><span class="msg__file-icon">📄</span><span><a href="${url}" download="zayavki_${date}.csv">zayavki_${date}.csv</a><br><small>CSV для Excel · нажмите, чтобы скачать</small></span></div>📤 Все заявки: ${leads.length}`);
  }

  let pending = null;
  const MENU = {
    '📋 Все заявки': () => showList('all'),
    '🆕 Новые': () => showList('new'),
    '📊 Статистика': () => botSay(statsText()),
    '🔍 Поиск': () => { pending = { type: 'search' }; botSay('🔍 Отправьте имя, телефон или слово из заявки.'); },
    '📤 Выгрузить в Excel': doExport
  };

  async function handleText(text) {
    text = text.trim();
    if (!text) return;
    meSay(text);
    await delay(350);

    if (pending && !text.startsWith('/') && !MENU[text]) {
      const state = pending;
      pending = null;
      if (state.type === 'note') {
        const lead = findLead(state.leadId);
        lead.notes.push({ text, author: ME, at: new Date().toISOString() });
        refreshCards(lead);
        return botSay(`📝 Заметка добавлена к заявке #${lead.id}.`);
      }
      return runSearch(text);
    }
    pending = null;
    if (MENU[text]) return MENU[text]();

    const [raw, ...args] = text.split(/\s+/);
    const cmd = raw.toLowerCase();
    const arg = args.join(' ');
    switch (cmd) {
      case '/start': case '/help': return botSay(HELP);
      case '/leads': return showList('all');
      case '/new': return showList('new');
      case '/stats': return botSay(statsText());
      case '/export': return doExport();
      case '/myid': return botSay('Ваш chat id: <code style="display:inline">670000000</code>');
      case '/cancel': return botSay('Отменено.');
      case '/lead': {
        const lead = findLead(arg.replace('#', ''));
        return lead ? sendCard(lead) : botSay(`Заявки #${esc(arg)} нет.`);
      }
      case '/find': return arg ? runSearch(arg) : MENU['🔍 Поиск']();
    }
    if (text.startsWith('/')) return botSay('Не знаю такой команды. /help — список команд.');
    if (/^#?\d{1,6}$/.test(text)) {
      const lead = findLead(text.replace('#', ''));
      return lead ? sendCard(lead) : botSay(`Заявки ${esc(text)} нет.`);
    }
    return runSearch(text);
  }

  function callback(data, messageId) {
    const [action, a, b] = data.split(':');
    if (action === 'list') {
      const v = listView(a, Number(b));
      edit(messageId, v.html, v.kb);
    } else if (action === 'open') {
      sendCard(findLead(a));
    } else if (action === 'st') {
      const lead = findLead(a);
      if (!lead.messages.includes(messageId)) lead.messages.push(messageId);
      if (!lead.firstActionAt && b !== 'new') lead.firstActionAt = new Date().toISOString();
      lead.status = b;
      lead.notes.push({ text: `статус → ${STATUSES[b].title}`, author: ME, at: new Date().toISOString() });
      refreshCards(lead);
      toast(`Заявка #${lead.id}: ${STATUSES[b].title}`);
    } else if (action === 'note') {
      pending = { type: 'note', leadId: Number(a) };
      botSay(`📝 Напишите заметку к заявке #${a} одним сообщением.\n/cancel — отменить.`);
      document.querySelector('#input input').focus();
    }
  }

  // Тестовая заявка «с сайта»
  const samples = [
    () => ({ site: SITES.law, fields: { 'Имя': 'Виктор Ермаков', 'Телефон': '+7 (915) 402-77-31', 'Компания': 'ООО «Альфа-Трейд»', 'Ситуация': 'Пришло требование ФНС о пояснениях по НДС', 'Срочно': '' } }),
    () => ({ site: SITES.owl, fields: { 'Имя родителя': 'Анна Морозова', 'Телефон': '+7 (913) 220-58-64', 'Возраст ребёнка': '5–7 лет', 'Программа': 'Little Owls', 'Формат': 'онлайн', 'Заявка': 'Бесплатный пробный урок' } }),
    () => ({ site: SITES.fit, fields: { 'Имя': 'Рустам Валиев', 'Телефон': '+7 (987) 311-90-25', 'Цель / абонемент': 'Стать сильнее', 'Заявка': 'Бесплатная пробная тренировка' } })
  ];
  let sampleIdx = 0;
  function newLead(createdAt = new Date().toISOString()) {
    const s = samples[sampleIdx++ % samples.length]();
    const fields = Object.fromEntries(Object.entries(s.fields).filter(([, v]) => v));
    const lead = {
      id: nextId++, site: s.site, createdAt, status: 'new', fields,
      name: Object.entries(fields).find(([k]) => /имя/i.test(k))[1], phone: fields['Телефон'],
      notes: [], firstActionAt: null, messages: []
    };
    leads.push(lead);
    return lead;
  }
  function notify(lead, prefix) {
    const id = botSay(prefix + leadCard(lead), leadKeyboard(lead));
    msgEls.get(id).dataset.prefix = prefix;
    lead.messages.push(id);
  }

  async function action(name) {
    if (name === 'lead') {
      toast('📨 Заявка отправлена с сайта');
      await delay(700);
      notify(newLead(), '🔔 <b>Новая заявка!</b>\n\n');
    } else if (name === 'remind') {
      const lead = newLead(new Date(Date.now() - 31 * 60000).toISOString());
      notify(lead, `⏰ <b>Заявка ждёт ответа уже ${formatDuration(31 * 60000)}</b>\n\n`);
    } else {
      handleText(name);
    }
  }

  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
    // На телефоне чат ниже кнопок — прокручиваем к нему, чтобы был виден ответ
    if (window.matchMedia('(max-width: 960px)').matches) {
      document.querySelector('.phone').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    action(btn.dataset.action);
  }));
  document.querySelectorAll('#menu button').forEach(btn => btn.addEventListener('click', () => handleText(btn.textContent)));
  const form = document.getElementById('input');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input');
    handleText(input.value);
    input.value = '';
  });

  // ---------- Старт и сцены для скриншотов (?scene=...) ----------
  const scene = new URLSearchParams(location.search).get('scene');
  (async () => {
    if (scene) document.body.classList.add('shot');
    meSay('/start');
    botSay(HELP);
    if (scene === 'lead') {
      await delay(200);
      const lead = newLead();
      notify(lead, '🔔 <b>Новая заявка!</b>\n\n');
      lead.status = 'work';
      lead.firstActionAt = new Date().toISOString();
      lead.notes.push({ text: 'статус → В работе', author: 'Даниил', at: new Date().toISOString() });
      lead.notes.push({ text: 'Перезвонить завтра в 10:00', author: 'Даниил', at: new Date().toISOString() });
      refreshCards(lead);
    } else if (scene === 'leads') {
      await handleText('/leads');
    } else if (scene === 'stats') {
      await handleText('/stats');
    } else if (scene === 'search') {
      await handleText('/find 555');
      await handleText('#10');
    } else if (!scene) {
      await delay(900);
      notify(newLead(), '🔔 <b>Новая заявка!</b>\n\n');
    }
    // Для скриншота прокручиваем к началу последнего сообщения
    if (scene) {
      const last = box.lastElementChild;
      box.style.scrollBehavior = 'auto';
      box.scrollTop = last.offsetTop - 10;
    }
  })();
})();
