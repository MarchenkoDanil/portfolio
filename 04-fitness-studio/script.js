// Меню
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  nav.classList.toggle('open');
});
nav.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    burger.classList.remove('open');
    nav.classList.remove('open');
  }
});

// Расписание: [время, занятие, тренер, свободных мест из 8]
const schedule = [
  [['07:00', 'Функциональный тренинг', 'Артур Гильманов', 3], ['10:00', 'Здоровая спина', 'Лейсан Сафина', 5], ['18:30', 'Интервальный HIIT', 'Максим Королёв', 1], ['20:00', 'Силовой блок', 'Артур Гильманов', 4]],
  [['08:00', 'Мобильность и растяжка', 'Эльвира Валиева', 6], ['12:00', 'Тренировка для беременных', 'Лейсан Сафина', 4], ['19:00', 'Функциональный тренинг', 'Максим Королёв', 2]],
  [['07:00', 'Функциональный тренинг', 'Артур Гильманов', 2], ['10:00', 'Здоровая спина', 'Лейсан Сафина', 3], ['18:30', 'Интервальный HIIT', 'Максим Королёв', 0], ['20:00', 'Силовой блок', 'Артур Гильманов', 5]],
  [['08:00', 'Мобильность и растяжка', 'Эльвира Валиева', 7], ['19:00', 'Функциональный тренинг', 'Максим Королёв', 3], ['20:15', 'Здоровая спина', 'Лейсан Сафина', 6]],
  [['07:00', 'Функциональный тренинг', 'Артур Гильманов', 4], ['18:00', 'Интервальный HIIT', 'Максим Королёв', 2], ['19:30', 'Растяжка после недели', 'Эльвира Валиева', 5]],
  [['10:00', 'Силовой блок', 'Артур Гильманов', 1], ['11:30', 'Семейная тренировка', 'Эльвира Валиева', 6], ['13:00', 'Интервальный HIIT', 'Максим Королёв', 3]],
  [['11:00', 'Мобильность и растяжка', 'Эльвира Валиева', 5], ['12:30', 'Здоровая спина', 'Лейсан Сафина', 4]]
];

const list = document.getElementById('scheduleList');
const tabs = document.querySelectorAll('.tab');

function placesLabel(n) {
  if (n === 0) return 'Лист ожидания';
  if (n === 1) return 'Осталось 1 место';
  if (n < 5) return `Осталось ${n} места`;
  return `Свободно ${n} мест`;
}

function renderDay(day) {
  list.innerHTML = schedule[day].map(([time, name, coach, free], i) => `
    <div class="slot" style="animation-delay:${i * 60}ms">
      <span class="slot__time">${time}</span>
      <span class="slot__name">${name}</span>
      <span class="slot__coach">${coach}</span>
      <span class="slot__places${free <= 2 ? ' low' : ''}">${placesLabel(free)}</span>
    </div>`).join('');
  tabs.forEach(t => t.classList.toggle('active', +t.dataset.day === day));
}
tabs.forEach(tab => tab.addEventListener('click', () => renderDay(+tab.dataset.day)));
const today = (new Date().getDay() + 6) % 7;
renderDay(today);

// Кнопки тарифов подставляют выбор в форму
const select = document.getElementById('planSelect');
document.querySelectorAll('[data-plan]').forEach(btn => btn.addEventListener('click', () => {
  const text = 'Абонемент «' + btn.dataset.plan + '»';
  let opt = [...select.options].find(o => o.text === text);
  if (!opt) select.add(opt = new Option(text, text), 1);
  select.value = opt.value;
}));

// Форма
const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');
const errorBox = form.querySelector('.form__error');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = form.elements.name;
  const phone = form.elements.phone;
  const okName = name.value.trim().length > 1;
  const okPhone = phone.value.replace(/\D/g, '').length >= 10;
  name.classList.toggle('error', !okName);
  phone.classList.toggle('error', !okPhone);
  if (!okName || !okPhone) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправляем…';
  errorBox.hidden = true;
  try {
    await sendLead({
      'Имя': name.value.trim(),
      'Телефон': phone.value.trim(),
      'Цель / абонемент': select.value || 'не указано',
      'Заявка': 'Бесплатная пробная тренировка'
    }, form);
    form.querySelector('.form__ok').hidden = false;
    submitBtn.textContent = 'Заявка отправлена ✓';
  } catch (err) {
    console.error(err);
    errorBox.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Забронировать пробную';
  }
});

// Анимация появления
const els = document.querySelectorAll('.program, .result, .story, .coach, .price');
els.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
}), { threshold: 0.1 });
els.forEach(el => io.observe(el));
