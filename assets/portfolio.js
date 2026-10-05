(function () {
  const nav = document.querySelector('.nav');
  const darkBlocks = [...document.querySelectorAll('.mk-dark')];
  const links = [...document.querySelectorAll('.nav__links a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));

  // Шапка: рамка после прокрутки, тёмный режим над тёмными блоками, активный пункт меню
  function onScroll() {
    const y = window.scrollY;
    const probe = nav.offsetHeight / 2;
    nav.classList.toggle('scrolled', y > 10);
    nav.classList.toggle('on-dark', darkBlocks.some(b => {
      const r = b.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    }));
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= window.innerHeight * .35) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Плавное появление блоков
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv, .pipeline').forEach(el => io.observe(el));

  // Фильтр рекламных креативов
  const buttons = document.querySelectorAll('.filters button');
  const creatives = document.querySelectorAll('.cr');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    buttons.forEach(b => b.classList.toggle('on', b === btn));
    creatives.forEach(c => {
      const show = f === 'all' || c.dataset.cat === f;
      c.classList.toggle('hide', !show);
      if (show) c.classList.add('in');
    });
  }));
})();
