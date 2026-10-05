// Мобильное меню
const header = document.querySelector('.header');
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menuBtn');

function toggleMenu(force) {
  const open = force ?? !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  header.classList.toggle('menu-open', open);
  menuBtn.textContent = open ? 'Закрыть' : 'Меню';
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn.addEventListener('click', () => toggleMenu());
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

// Слайдер отзывов
const slides = document.querySelectorAll('.slide');
const counter = document.getElementById('counter');
let current = 0;
let timer;

function show(index) {
  slides[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
  counter.textContent = `0${current + 1} / 0${slides.length}`;
}
function autoplay() {
  clearInterval(timer);
  timer = setInterval(() => show(current + 1), 7000);
}
document.getElementById('prev').addEventListener('click', () => { show(current - 1); autoplay(); });
document.getElementById('next').addEventListener('click', () => { show(current + 1); autoplay(); });
autoplay();

// Форма заявки
const form = document.getElementById('form');
const msg = document.getElementById('formMsg');
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.elements.name;
  const phone = form.elements.phone;
  const nameOk = name.value.trim().length > 1;
  const phoneOk = phone.value.replace(/\D/g, '').length >= 10;
  name.classList.toggle('error', !nameOk);
  phone.classList.toggle('error', !phoneOk);

  if (!nameOk || !phoneOk) {
    msg.textContent = 'Проверьте имя и номер телефона — нам нужно как-то с вами связаться.';
    return;
  }
  const service = form.elements.service.value;
  msg.textContent = `Спасибо, ${name.value.trim()}! Заявка на «${service}» принята. Руководитель проектов позвонит сегодня до 19:00.`;
  form.reset();
});

// Плавное появление
const targets = document.querySelectorAll('.project, .service, .process li, .numbers div, .about__portrait, .about__text');
targets.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    io.unobserve(entry.target);
  }
}), { threshold: 0.1 });
targets.forEach(el => io.observe(el));
