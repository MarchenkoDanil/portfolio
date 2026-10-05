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

// Сова следит глазами за курсором
const pupils = document.querySelectorAll('.owl__eye i');
window.addEventListener('mousemove', e => {
  pupils.forEach(pupil => {
    const eye = pupil.parentElement.getBoundingClientRect();
    const dx = e.clientX - (eye.left + eye.width / 2);
    const dy = e.clientY - (eye.top + eye.height / 2);
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(14, Math.hypot(dx, dy) / 20);
    pupil.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
  });
});

// Форма записи
const programs = { '5–7': 'Little Owls', '8–10': 'Explorers', '11–14': 'Young Leaders' };
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

  const age = form.elements.age.value;
  const format = form.elements.online.checked ? 'онлайн' : 'в классе';
  const btnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправляем…';
  errorBox.hidden = true;
  try {
    await sendLead({
      'Имя родителя': name.value.trim(),
      'Телефон': phone.value.trim(),
      'Возраст ребёнка': `${age} лет`,
      'Программа': programs[age],
      'Формат': format,
      'Заявка': 'Бесплатный пробный урок'
    }, form);
    document.getElementById('successText').textContent =
      `${name.value.trim()}, мы подберём пробный урок в программе ${programs[age]} (${format}). Администратор позвонит в течение часа, чтобы выбрать удобное время.`;
    form.querySelector('.form__success').hidden = false;
  } catch (err) {
    console.error(err);
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = btnText;
  }
});

// Появление карточек
const cards = document.querySelectorAll('.pain, .program, .step, .teacher, .review, .price');
cards.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
}), { threshold: 0.15 });
cards.forEach(el => io.observe(el));
