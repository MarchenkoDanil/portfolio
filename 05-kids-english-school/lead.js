// Отправка заявок в Telegram. Настройки — в config.js.
(function () {
  const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function buildMessage(site, fields) {
    const lines = [`🔔 <b>Новая заявка — ${escapeHtml(site)}</b>`, ''];
    Object.entries(fields).forEach(([label, value]) => {
      if (value !== '' && value != null) lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`);
    });
    lines.push('', `🕒 ${new Date().toLocaleString('ru-RU')}`);
    return lines.join('\n');
  }

  // asForm: Telegram не пропускает CORS-preflight, поэтому в прямом режиме
  // отправляем «простой» запрос с form-urlencoded телом — без preflight.
  async function post(url, body, asForm) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: asForm ? undefined : { 'Content-Type': 'application/json' },
        body: asForm ? new URLSearchParams(body) : JSON.stringify(body),
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.description || data.error || 'HTTP ' + res.status);
    } finally {
      clearTimeout(timer);
    }
  }

  // Сайт открыт с компьютера, а не с хостинга
  const isLocal = location.protocol === 'file:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

  // config.local.js с токеном подгружается только локально,
  // поэтому на опубликованном сайте браузер его даже не запрашивает
  let localConfig;
  function loadLocalConfig() {
    if (!isLocal) return Promise.resolve(null);
    if (!localConfig) {
      localConfig = new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'config.local.js';
        s.onload = () => resolve(window.LEAD_LOCAL || null);
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
      });
    }
    return localConfig;
  }
  loadLocalConfig();

  window.sendLead = async function (fields, form) {
    // Ловушка для ботов: скрытое поле заполняют только спам-скрипты
    const trap = form && form.querySelector('input[name="website"]');
    if (trap && trap.value) return;

    const cfg = window.LEAD_CONFIG || {};
    const site = cfg.siteName || document.title;
    // Структурированные поля нужны боту (telegram-bot), готовый текст — send.php
    const payload = { site, fields, text: buildMessage(site, fields) };
    const text = payload.text;
    const local = await loadLocalConfig();
    const direct = local && local.botToken && local.chatId ? local
      : cfg.botToken && cfg.chatId ? cfg : null;

    // На компьютере: в запущенного бота или напрямую в Telegram — по config.local.js
    if (isLocal && local && local.endpoint) {
      return post(local.endpoint, payload);
    }
    if (isLocal && direct) {
      return post(`https://api.telegram.org/bot${direct.botToken}/sendMessage`, {
        chat_id: direct.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }, true);
    }
    if (cfg.endpoint && !(location.protocol === 'file:')) {
      return post(cfg.endpoint, payload);
    }
    if (direct) {
      return post(`https://api.telegram.org/bot${direct.botToken}/sendMessage`, {
        chat_id: direct.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }, true);
    }
    console.warn('[lead] Telegram не настроен — заявка не отправлена. Заполните config.js.', fields);
  };
})();
