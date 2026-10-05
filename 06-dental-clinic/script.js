// Меню
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  nav.classList.toggle('open');
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  burger.classList.remove('open');
  nav.classList.remove('open');
}));

// Статус «открыто» по часам клиники 8:00–21:00
const openLabel = document.querySelector('.header__open');
const hour = new Date().getHours();
if (hour < 8 || hour >= 21) {
  openLabel.innerHTML = '<i style="background:#f5b100"></i>Откроемся в 8:00';
}

// Вкладки прайса
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.pricelist').forEach(list =>
    list.classList.toggle('active', list.id === tab.dataset.tab));
}));

// Слайдер «до / после»
const range = document.getElementById('compareRange');
const after = document.getElementById('after');
const handle = document.getElementById('handle');
function updateCompare() {
  const v = range.value;
  after.style.clipPath = `inset(0 0 0 ${v}%)`;
  handle.style.left = v + '%';
}
range.addEventListener('input', updateCompare);
updateCompare();

// Маска телефона
const phone = document.querySelector('#form input[name="phone"]');
phone.addEventListener('input', () => {
  let d = phone.value.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  let out = '+7';
  if (d.length > 1) out += ' (' + d.slice(1, 4);
  if (d.length >= 4) out += ')';
  if (d.length > 4) out += ' ' + d.slice(4, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  phone.value = out;
});

// Форма записи
const form = document.getElementById('form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.elements.name;
  const okName = name.value.trim().length > 1;
  const okPhone = phone.value.replace(/\D/g, '').length === 11;
  name.classList.toggle('error', !okName);
  phone.classList.toggle('error', !okPhone);
  if (!okName || !okPhone) return;
  form.querySelector('.form__ok').hidden = false;
});

// Появление при прокрутке
const items = document.querySelectorAll('.feature, .doctor, .review, .trust__inner div');
items.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
}), { threshold: 0.1 });
items.forEach(el => io.observe(el));
