// Telegram-бот для заявок с сайтов.
// Принимает заявки по HTTP (POST /lead), хранит их и даёт управлять ими из Telegram.
// Запуск: node bot.js   (настройки — в config.json)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Storage, STATUSES } = require('./storage');

// ---------- Настройки ----------
const configPath = process.env.BOT_CONFIG || path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error(`Нет файла настроек ${configPath}. Скопируйте config.example.json в config.json и заполните его.`);
  process.exit(1);
}
const config = {
  port: 3000,
  admins: [],
  allowedOrigins: ['*'],
  remindAfterMinutes: 30,
  reminderCheckSeconds: 60,
  timezone: 'Europe/Moscow',
  apiBase: 'https://api.telegram.org',
  dataFile: path.join(__dirname, 'data', 'leads.json'),
  ...JSON.parse(fs.readFileSync(configPath, 'utf8'))
};
if (!config.token) {
  console.error('В config.json не указан token бота.');
  process.exit(1);
}
const admins = config.admins.map(Number);
const db = new Storage(path.resolve(__dirname, config.dataFile));
const PAGE_SIZE = 8;

// ---------- Telegram API ----------
async function api(method, params = {}) {
  const res = await fetch(`${config.apiBase}/bot${config.token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

async function sendDocument(chatId, filename, content, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption);
  form.append('document', new Blob([content], { type: 'text/csv' }), filename);
  const res = await fetch(`${config.apiBase}/bot${config.token}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendDocument: ${data.description}`);
}

const send = (chatId, text, extra = {}) =>
  api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });

async function edit(chatId, messageId, text, extra = {}) {
  try {
    await api('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  } catch (err) {
    if (!/message is not modified/.test(err.message)) throw err;
  }
}

// ---------- Форматирование ----------
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmtDate = iso => new Date(iso).toLocaleString('ru-RU', {
  timeZone: config.timezone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
});
const dayKey = date => date.toLocaleDateString('ru-RU', { timeZone: config.timezone });
const statusLabel = s => `${STATUSES[s].emoji} ${STATUSES[s].title}`;

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

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
  for (const [label, value] of Object.entries(lead.fields)) {
    lines.push(`<b>${esc(label)}:</b> ${esc(value)}`);
  }
  if (lead.notes.length) {
    lines.push('', '📝 <b>Заметки:</b>');
    lead.notes.forEach(n => lines.push(`— ${esc(n.text)} <i>(${esc(n.author)}, ${fmtDate(n.at)})</i>`));
  }
  return lines.join('\n');
}

function leadKeyboard(lead) {
  const statusButtons = Object.keys(STATUSES)
    .filter(s => s !== lead.status)
    .map(s => ({ text: s === 'new' ? '🆕 Вернуть в новые' : statusLabel(s), callback_data: `st:${lead.id}:${s}` }));
  return {
    inline_keyboard: [
      statusButtons.slice(0, 2),
      statusButtons.slice(2).concat({ text: '📝 Заметка', callback_data: `note:${lead.id}` })
    ]
  };
}

const MENU = {
  keyboard: [
    [{ text: '📋 Все заявки' }, { text: '🆕 Новые' }],
    [{ text: '📊 Статистика' }, { text: '🔍 Поиск' }],
    [{ text: '📤 Выгрузить в Excel' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

const FILTERS = {
  all: { title: '📋 Все заявки' },
  new: { title: '🆕 Новые' },
  work: { title: '⏳ В работе' },
  done: { title: '✅ Закрытые' },
  rejected: { title: '❌ Отказы' },
  q: { title: '🔍 Результаты поиска' }
};

// Последний поисковый запрос каждого чата — чтобы листать результаты кнопками
const lastQuery = new Map();
// Чат ждёт текст: заметку к заявке или поисковый запрос
const pending = new Map();

function listView(chatId, filter, page) {
  const leads = filter === 'q'
    ? db.list({ query: lastQuery.get(chatId) || '' })
    : db.list({ status: filter === 'all' ? undefined : filter });
  const pages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  page = Math.min(Math.max(0, page), pages - 1);
  const slice = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  let header = `<b>${FILTERS[filter].title}</b>`;
  if (filter === 'q') header += ` по «${esc(lastQuery.get(chatId))}»`;
  header += ` — ${leads.length}`;
  if (pages > 1) header += ` · стр. ${page + 1}/${pages}`;

  const lines = [header, ''];
  if (!slice.length) lines.push('Здесь пока пусто.');
  slice.forEach(l => {
    lines.push(`${STATUSES[l.status].emoji} <b>#${l.id}</b> · ${esc(l.name || 'без имени')} · ${esc(l.phone)}`);
    lines.push(`      <i>${fmtDate(l.createdAt)} · ${esc(l.site)}</i>`);
  });
  if (slice.length) lines.push('', 'Нажмите на номер, чтобы открыть заявку.');

  const keyboard = [];
  for (let i = 0; i < slice.length; i += 4) {
    keyboard.push(slice.slice(i, i + 4).map(l => ({ text: `#${l.id}`, callback_data: `open:${l.id}` })));
  }
  if (pages > 1) {
    keyboard.push([
      { text: page > 0 ? '◀️' : '·', callback_data: page > 0 ? `list:${filter}:${page - 1}` : 'noop' },
      { text: `${page + 1} / ${pages}`, callback_data: 'noop' },
      { text: page < pages - 1 ? '▶️' : '·', callback_data: page < pages - 1 ? `list:${filter}:${page + 1}` : 'noop' }
    ]);
  }
  if (filter !== 'q') {
    keyboard.push(['all', 'new', 'work', 'done', 'rejected'].map(f => ({
      text: (f === filter ? '• ' : '') + (f === 'all' ? 'Все' : STATUSES[f].emoji),
      callback_data: `list:${f}:0`
    })));
  }
  return { text: lines.join('\n'), reply_markup: { inline_keyboard: keyboard } };
}

function statsText() {
  const leads = db.all();
  const now = Date.now();
  const since = days => leads.filter(l => now - new Date(l.createdAt) < days * 86400000).length;
  const today = dayKey(new Date());
  const count = s => leads.filter(l => l.status === s).length;
  const processed = leads.filter(l => l.firstActionAt);
  const avgReaction = processed.length
    ? processed.reduce((sum, l) => sum + (new Date(l.firstActionAt) - new Date(l.createdAt)), 0) / processed.length
    : null;
  const closed = count('done');
  const decided = closed + count('rejected');

  const lines = [
    '📊 <b>Статистика заявок</b>',
    '',
    `Сегодня: <b>${leads.filter(l => dayKey(new Date(l.createdAt)) === today).length}</b>`,
    `За 7 дней: <b>${since(7)}</b> · за 30 дней: <b>${since(30)}</b> · всего: <b>${leads.length}</b>`,
    '',
    `${statusLabel('new')}: ${count('new')}`,
    `${statusLabel('work')}: ${count('work')}`,
    `${statusLabel('done')}: ${closed}`,
    `${statusLabel('rejected')}: ${count('rejected')}`,
    ''
  ];
  if (decided) lines.push(`🎯 Доля закрытых: <b>${Math.round(closed / decided * 100)}%</b> (из обработанных до конца)`);
  if (avgReaction !== null) lines.push(`⚡ Среднее время реакции: <b>${formatDuration(avgReaction)}</b>`);

  // Мини-график за последние 7 дней
  const byDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = dayKey(d);
    byDay.push({
      label: d.toLocaleDateString('ru-RU', { timeZone: config.timezone, weekday: 'short', day: '2-digit', month: '2-digit' }),
      n: leads.filter(l => dayKey(new Date(l.createdAt)) === key).length
    });
  }
  const max = Math.max(1, ...byDay.map(d => d.n));
  lines.push('', '<b>Последние 7 дней:</b>', '<code>');
  byDay.forEach(d => lines.push(`${d.label.padEnd(10)} ${'█'.repeat(Math.round(d.n / max * 10)).padEnd(10, '·')} ${d.n}`));
  lines.push('</code>');

  const sites = {};
  leads.forEach(l => { sites[l.site] = (sites[l.site] || 0) + 1; });
  if (Object.keys(sites).length > 1) {
    lines.push('<b>По сайтам:</b>');
    Object.entries(sites).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => lines.push(`• ${esc(s)} — ${n}`));
  }
  return lines.join('\n');
}

function exportCsv() {
  const leads = db.all();
  const fieldNames = [...new Set(leads.flatMap(l => Object.keys(l.fields)))];
  const header = ['№', 'Дата', 'Сайт', 'Статус', ...fieldNames, 'Заметки'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = leads.map(l => [
    l.id,
    fmtDate(l.createdAt),
    l.site,
    STATUSES[l.status].title,
    ...fieldNames.map(f => l.fields[f]),
    l.notes.map(n => `${n.text} (${n.author})`).join('; ')
  ]);
  // BOM и точка с запятой — чтобы русский Excel открыл файл без настройки
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
}

// ---------- Действия ----------
async function notifyNewLead(lead) {
  for (const chatId of admins) {
    try {
      const msg = await send(chatId, '🔔 <b>Новая заявка!</b>\n\n' + leadCard(lead), { reply_markup: leadKeyboard(lead) });
      lead.messageIds[chatId] = msg.message_id;
    } catch (err) {
      console.error(`Не удалось уведомить ${chatId}:`, err.message);
    }
  }
  db.save();
}

// Обновляет карточку заявки во всех чатах, где она была отправлена
async function refreshCards(lead, prefix = '') {
  for (const [chatId, messageId] of Object.entries(lead.messageIds)) {
    try {
      await edit(chatId, messageId, prefix + leadCard(lead), { reply_markup: leadKeyboard(lead) });
    } catch (err) {
      console.error('Не удалось обновить карточку:', err.message);
    }
  }
}

async function changeStatus(lead, status, who) {
  const patch = { status };
  if (!lead.firstActionAt && status !== 'new') patch.firstActionAt = new Date().toISOString();
  db.update(lead.id, patch);
  db.addNote(lead.id, `статус → ${STATUSES[status].title}`, who);
  await refreshCards(lead);
}

async function openLead(chatId, id) {
  const lead = db.get(id);
  if (!lead) return send(chatId, `Заявки #${esc(id)} нет.`);
  const msg = await send(chatId, leadCard(lead), { reply_markup: leadKeyboard(lead) });
  lead.messageIds[chatId] = msg.message_id;
  db.save();
}

async function runSearch(chatId, query) {
  lastQuery.set(chatId, query);
  const view = listView(chatId, 'q', 0);
  return send(chatId, view.text, { reply_markup: view.reply_markup });
}

const HELP = [
  '👋 <b>Бот для заявок с сайта</b>',
  '',
  'Каждая новая заявка приходит сюда с кнопками: «В работу», «Закрыть», «Отказ» и «Заметка».',
  '',
  '<b>Команды:</b>',
  '/leads — все заявки',
  '/new — необработанные заявки',
  '/lead 12 — открыть заявку №12',
  '/find Иван — поиск по имени, телефону или тексту',
  '/stats — статистика',
  '/export — выгрузка в Excel (CSV)',
  '/myid — узнать свой chat id',
  '',
  `Если заявка висит в «Новых» дольше ${config.remindAfterMinutes} мин, бот напомнит о ней.`,
  'Можно просто отправить имя или номер телефона — бот найдёт заявку.'
].join('\n');

// ---------- Обработка сообщений ----------
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const who = msg.from.first_name || msg.from.username || String(msg.from.id);

  if (text === '/myid') return send(chatId, `Ваш chat id: <code>${chatId}</code>`);
  if (!admins.includes(chatId)) {
    return send(chatId, `⛔ Этот бот принимает заявки только для владельца сайта.\nВаш chat id: <code>${chatId}</code> — его можно добавить в admins в config.json.`);
  }
  if (!text) return;

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.split('@')[0].toLowerCase();
  const arg = args.join(' ');

  // Ожидаем заметку или поисковый запрос
  if (pending.has(chatId) && !text.startsWith('/') && !MENU_ACTIONS[text]) {
    const state = pending.get(chatId);
    pending.delete(chatId);
    if (state.type === 'note') {
      const lead = db.addNote(state.leadId, text, who);
      if (!lead) return send(chatId, 'Заявка не найдена.');
      await refreshCards(lead);
      return send(chatId, `📝 Заметка добавлена к заявке #${lead.id}.`);
    }
    if (state.type === 'search') return runSearch(chatId, text);
  }
  pending.delete(chatId);

  if (MENU_ACTIONS[text]) return MENU_ACTIONS[text](chatId);

  switch (cmd) {
    case '/start':
    case '/help':
      return send(chatId, HELP, { reply_markup: MENU });
    case '/leads':
      return MENU_ACTIONS['📋 Все заявки'](chatId);
    case '/new':
      return MENU_ACTIONS['🆕 Новые'](chatId);
    case '/stats':
      return MENU_ACTIONS['📊 Статистика'](chatId);
    case '/export':
      return MENU_ACTIONS['📤 Выгрузить в Excel'](chatId);
    case '/lead':
      if (!/^\d+$/.test(arg.replace('#', ''))) return send(chatId, 'Укажите номер: /lead 12');
      return openLead(chatId, arg.replace('#', ''));
    case '/find':
      if (!arg) return MENU_ACTIONS['🔍 Поиск'](chatId);
      return runSearch(chatId, arg);
    case '/cancel':
      return send(chatId, 'Отменено.', { reply_markup: MENU });
  }

  if (text.startsWith('/')) return send(chatId, 'Не знаю такой команды. /help — список команд.');
  // «#12» открывает заявку, любой другой текст — поиск
  if (/^#?\d{1,6}$/.test(text)) return openLead(chatId, text.replace('#', ''));
  return runSearch(chatId, text);
}

const MENU_ACTIONS = {
  '📋 Все заявки': chatId => { const v = listView(chatId, 'all', 0); return send(chatId, v.text, { reply_markup: v.reply_markup }); },
  '🆕 Новые': chatId => { const v = listView(chatId, 'new', 0); return send(chatId, v.text, { reply_markup: v.reply_markup }); },
  '📊 Статистика': chatId => send(chatId, statsText()),
  '🔍 Поиск': chatId => {
    pending.set(chatId, { type: 'search' });
    return send(chatId, '🔍 Отправьте имя, телефон или слово из заявки.');
  },
  '📤 Выгрузить в Excel': async chatId => {
    if (!db.all().length) return send(chatId, 'Заявок пока нет — выгружать нечего.');
    const date = new Date().toLocaleDateString('ru-RU', { timeZone: config.timezone }).replace(/\./g, '-');
    await sendDocument(chatId, `zayavki_${date}.csv`, exportCsv(), `📤 Все заявки: ${db.all().length}`);
  }
};

async function handleCallback(q) {
  const chatId = q.message.chat.id;
  const messageId = q.message.message_id;
  const who = q.from.first_name || q.from.username || String(q.from.id);
  if (!admins.includes(chatId)) return api('answerCallbackQuery', { callback_query_id: q.id, text: 'Нет доступа' });

  const [action, a, b] = q.data.split(':');
  let notice = '';

  if (action === 'list') {
    const view = listView(chatId, a, Number(b));
    await edit(chatId, messageId, view.text, { reply_markup: view.reply_markup });
  } else if (action === 'open') {
    await openLead(chatId, a);
  } else if (action === 'st') {
    const lead = db.get(a);
    if (lead && STATUSES[b]) {
      if (!lead.messageIds[chatId]) lead.messageIds[chatId] = messageId;
      await changeStatus(lead, b, who);
      notice = `Заявка #${lead.id}: ${STATUSES[b].title}`;
    } else {
      notice = 'Заявка не найдена';
    }
  } else if (action === 'note') {
    pending.set(chatId, { type: 'note', leadId: Number(a) });
    await send(chatId, `📝 Напишите заметку к заявке #${a} одним сообщением.\n/cancel — отменить.`);
  }
  await api('answerCallbackQuery', { callback_query_id: q.id, text: notice });
}

// ---------- Напоминания о необработанных заявках ----------
async function checkReminders() {
  const limit = config.remindAfterMinutes * 60000;
  for (const lead of db.list({ status: 'new' })) {
    const waiting = Date.now() - new Date(lead.createdAt);
    if (waiting >= limit && !lead.remindedAt) {
      db.update(lead.id, { remindedAt: new Date().toISOString() });
      for (const chatId of admins) {
        try {
          const msg = await send(chatId, `⏰ <b>Заявка ждёт ответа уже ${formatDuration(waiting)}</b>\n\n` + leadCard(lead), { reply_markup: leadKeyboard(lead) });
          lead.messageIds[chatId] = msg.message_id;
        } catch (err) {
          console.error('Напоминание не отправлено:', err.message);
        }
      }
      db.save();
    }
  }
}

// ---------- HTTP: приём заявок с сайта ----------
const lastRequest = new Map();

function corsHeaders(origin) {
  const allowed = config.allowedOrigins.includes('*') ? '*'
    : config.allowedOrigins.includes(origin) ? origin : '';
  return allowed ? {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  } : {};
}

function validateLead(body) {
  if (!body || typeof body !== 'object') return 'bad json';
  const { site, fields } = body;
  if (typeof site !== 'string' || !site.trim() || site.length > 100) return 'bad site';
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return 'bad fields';
  const entries = Object.entries(fields);
  if (!entries.length || entries.length > 20) return 'bad fields';
  for (const [k, v] of entries) {
    if (typeof v !== 'string' || k.length > 60 || v.length > 2000) return 'bad field';
  }
  return null;
}

const server = http.createServer((req, res) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req.headers.origin) };
  const reply = (code, data) => { res.writeHead(code, headers); res.end(JSON.stringify(data)); };

  if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
  if (req.method === 'GET' && req.url === '/health') return reply(200, { ok: true, leads: db.all().length });
  if (req.method !== 'POST' || req.url !== '/lead') return reply(404, { ok: false, error: 'Not found' });

  const ip = req.socket.remoteAddress;
  if (Date.now() - (lastRequest.get(ip) || 0) < 5000) return reply(429, { ok: false, error: 'Слишком часто, попробуйте через пару секунд' });
  lastRequest.set(ip, Date.now());

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 50000) req.destroy();
  });
  req.on('end', async () => {
    let data;
    try { data = JSON.parse(body); } catch { return reply(400, { ok: false, error: 'bad json' }); }
    const error = validateLead(data);
    if (error) return reply(400, { ok: false, error });

    const fields = Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k.trim(), v.trim()]).filter(([, v]) => v));
    const lead = db.add({ site: data.site.trim(), fields });
    console.log(`Заявка #${lead.id} с сайта «${lead.site}»`);
    // Заявка уже сохранена — даже если Telegram недоступен, она не потеряется
    reply(200, { ok: true, id: lead.id });
    notifyNewLead(lead).catch(err => console.error(err));
  });
});

// ---------- Long polling ----------
let offset = 0;
let running = true;

async function poll() {
  while (running) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        try {
          if (u.message) await handleMessage(u.message);
          else if (u.callback_query) await handleCallback(u.callback_query);
        } catch (err) {
          console.error('Ошибка обработки:', err.message);
        }
      }
    } catch (err) {
      console.error('Ошибка связи с Telegram:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  const me = await api('getMe');
  await api('deleteWebhook');
  await api('setMyCommands', {
    commands: [
      { command: 'leads', description: 'Все заявки' },
      { command: 'new', description: 'Необработанные заявки' },
      { command: 'find', description: 'Поиск по имени или телефону' },
      { command: 'stats', description: 'Статистика' },
      { command: 'export', description: 'Выгрузка в Excel' },
      { command: 'help', description: 'Справка' }
    ]
  });
  if (!admins.length) console.warn('⚠️  В config.json пустой список admins — напишите боту /myid и добавьте свой id.');

  server.listen(config.port, () => {
    console.log(`✅ Бот @${me.username} запущен`);
    console.log(`   Приём заявок: http://localhost:${config.port}/lead`);
    console.log(`   Заявок в базе: ${db.all().length}`);
    console.log('   Остановить: Ctrl+C');
  });
  setInterval(() => checkReminders().catch(err => console.error(err)), config.reminderCheckSeconds * 1000);
  checkReminders().catch(err => console.error(err));
  poll();
}

process.on('SIGINT', () => {
  running = false;
  console.log('\nБот остановлен.');
  process.exit(0);
});

main().catch(err => {
  console.error('Не удалось запустить бота:', err.message);
  process.exit(1);
});
