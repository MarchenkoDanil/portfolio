// Хранилище заявок в JSON-файле. Запись атомарная: сначала во временный файл, потом rename.
const fs = require('fs');
const path = require('path');

const STATUSES = {
  new: { emoji: '🆕', title: 'Новая' },
  work: { emoji: '⏳', title: 'В работе' },
  done: { emoji: '✅', title: 'Закрыта' },
  rejected: { emoji: '❌', title: 'Отказ / спам' }
};

class Storage {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.data = { nextId: 1, leads: [] };
    if (fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  add({ site, fields }) {
    const findField = re => Object.entries(fields).find(([k]) => re.test(k))?.[1] || '';
    const lead = {
      id: this.data.nextId++,
      site,
      createdAt: new Date().toISOString(),
      status: 'new',
      name: findField(/имя/i),
      phone: findField(/телефон/i),
      fields,
      notes: [],
      remindedAt: null,
      messageIds: {}
    };
    this.data.leads.push(lead);
    this.save();
    return lead;
  }

  get(id) {
    return this.data.leads.find(l => l.id === Number(id));
  }

  update(id, patch) {
    const lead = this.get(id);
    if (!lead) return null;
    Object.assign(lead, patch);
    this.save();
    return lead;
  }

  addNote(id, text, author) {
    const lead = this.get(id);
    if (!lead) return null;
    lead.notes.push({ text, author, at: new Date().toISOString() });
    this.save();
    return lead;
  }

  // Новые сверху
  list({ status, query } = {}) {
    let leads = [...this.data.leads].reverse();
    if (status) leads = leads.filter(l => l.status === status);
    if (query) {
      const q = query.toLowerCase();
      const digits = q.replace(/\D/g, '');
      leads = leads.filter(l => {
        const haystack = [l.site, ...Object.values(l.fields), ...l.notes.map(n => n.text)].join(' ').toLowerCase();
        if (haystack.includes(q)) return true;
        return digits.length >= 4 && l.phone.replace(/\D/g, '').includes(digits);
      });
    }
    return leads;
  }

  all() {
    return this.data.leads;
  }
}

module.exports = { Storage, STATUSES };
