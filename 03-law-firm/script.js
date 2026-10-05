(function () {
  const header = document.getElementById('header');
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

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Анимация счётчиков в первом экране
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const start = performance.now();
    const duration = 1600;
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = (target * eased).toFixed(decimals).replace('.', ',');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-count]').forEach(animateCount);

  // Форма
  const form = document.getElementById('form');
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorBox = form.querySelector('.form__error');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.elements.name;
    const phone = form.elements.phone;
    const nameOk = name.value.trim().length > 1;
    const phoneOk = phone.value.replace(/\D/g, '').length >= 10;
    name.classList.toggle('error', !nameOk);
    phone.classList.toggle('error', !phoneOk);
    if (!nameOk || !phoneOk) {
      (nameOk ? phone : name).focus();
      return;
    }

    const btnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';
    errorBox.hidden = true;
    try {
      await sendLead({
        'Имя': name.value.trim(),
        'Телефон': phone.value.trim(),
        'Компания': form.elements.company.value.trim(),
        'Ситуация': form.elements.message.value.trim(),
        'Срочно': form.elements.urgent.checked ? '🔥 Да, нужна помощь сегодня' : ''
      }, form);
      form.querySelector('.form__done').hidden = false;
      form.reset();
    } catch (err) {
      console.error(err);
      errorBox.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = btnText;
    }
  });

  // Появление при скролле
  const items = document.querySelectorAll('.practice__item, .case, .person, .guarantees li, .faq__list details');
  items.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  }), { threshold: 0.1 });
  items.forEach(el => io.observe(el));
})();
