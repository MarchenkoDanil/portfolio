const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  nav.classList.toggle('open');
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  burger.classList.remove('open');
  nav.classList.remove('open');
}));

// Кнопки «В заказ» и выбор подписки подставляют тему в форму
const topic = document.getElementById('topic');
function setTopic(text) {
  let option = [...topic.options].find(o => o.text === text);
  if (!option) {
    option = new Option(text, text);
    topic.add(option, 0);
  }
  topic.value = option.value;
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('[data-order]').forEach(btn =>
  btn.addEventListener('click', () => setTopic('Кофе: ' + btn.dataset.order)));
document.getElementById('planBtn').addEventListener('click', e => {
  e.preventDefault();
  const plan = document.querySelector('input[name="plan"]:checked').value;
  setTopic('Подписка: ' + plan);
});

// Форма
const form = document.getElementById('form');
form.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;
  form.querySelectorAll('[required]').forEach(input => {
    const ok = input.type === 'tel'
      ? input.value.replace(/\D/g, '').length >= 10
      : input.value.trim().length > 1;
    input.classList.toggle('error', !ok);
    if (!ok) valid = false;
  });
  if (!valid) return;
  form.querySelector('.form__success').hidden = false;
  form.querySelector('button[type="submit"]').disabled = true;
  form.reset();
});

// Появление блоков при прокрутке
const items = document.querySelectorAll('.why__item, .product, .review, .plan, .b2b__list li');
items.forEach(el => el.classList.add('reveal'));
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
items.forEach(el => observer.observe(el));
