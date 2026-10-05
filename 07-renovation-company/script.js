// Меню
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.textContent = open ? '✕' : '☰';
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  burger.textContent = '☰';
}));

// Калькулятор
const area = document.getElementById('area');
const areaVal = document.getElementById('areaVal');
const totalEl = document.getElementById('total');
const termEl = document.getElementById('term');
const monthlyEl = document.getElementById('monthly');
const rub = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
let lastCalc = '';

function calculate() {
  const m2 = +area.value;
  const typeInput = document.querySelector('input[name="type"]:checked');
  const rate = +typeInput.value;
  const houseK = +document.querySelector('input[name="house"]:checked').value;

  let total = m2 * rate * houseK;
  let pct = 0;
  document.querySelectorAll('.extra:checked').forEach(cb => {
    if (cb.classList.contains('extra--pct')) pct += +cb.value;
    else total += +cb.value;
  });
  total *= 1 + pct;
  total = Math.round(total / 100) * 100;

  // Срок: базовые дни на м² зависят от сложности ремонта
  const daysPerM2 = { 6900: 0.7, 9900: 1.3, 14900: 1.6 }[rate];
  const days = Math.max(20, Math.round(m2 * daysPerM2 / 5) * 5);

  areaVal.textContent = m2;
  area.style.setProperty('--p', ((m2 - area.min) / (area.max - area.min) * 100) + '%');
  totalEl.textContent = rub(total);
  termEl.textContent = `≈ ${days} рабочих дней`;
  monthlyEl.textContent = rub(total / 24) + '/мес.';

  const typeName = typeInput.parentElement.querySelector('b').textContent.toLowerCase();
  lastCalc = `Ваш расчёт: ${typeName} ремонт, ${m2} м² — ${rub(total)}. Замерщик уточнит детали на объекте.`;
}
document.querySelectorAll('#calc input').forEach(input => input.addEventListener('input', calculate));
calculate();

document.getElementById('calcBtn').addEventListener('click', () => {
  const box = document.getElementById('formCalc');
  box.textContent = lastCalc;
  box.hidden = false;
});

// Форма
const form = document.getElementById('form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.elements.name;
  const phone = form.elements.phone;
  const okName = name.value.trim().length > 1;
  const okPhone = phone.value.replace(/\D/g, '').length >= 10;
  name.classList.toggle('error', !okName);
  phone.classList.toggle('error', !okPhone);
  if (!okName || !okPhone) return;
  form.querySelector('.form__done').hidden = false;
});

// Появление блоков
const els = document.querySelectorAll('.work, .step, .review, .guarantee__list li');
els.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
}), { threshold: 0.1 });
els.forEach(el => io.observe(el));
