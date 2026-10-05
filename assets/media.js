// Полный цикл, шоурил, видеопревью и motion-блоки
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverable = window.matchMedia('(hover: hover)').matches;

  // Анимации работают только на экране
  const liveIO = new IntersectionObserver(entries => entries.forEach(e =>
    e.target.classList.toggle('live', e.isIntersecting)), { threshold: .05 });
  document.querySelectorAll('[data-live]').forEach(el => liveIO.observe(el));

  // ---------- Полный цикл: этапы переключаются сами, пока пользователь не нажмёт ----------
  const flow = document.getElementById('fcFlow');
  if (flow) {
    const steps = [...flow.querySelectorAll('.fc__step')];
    const panes = [...flow.querySelectorAll('.fc__pane')];
    const chips = [...document.querySelectorAll('#fcChips span')];
    const bar = flow.querySelector('.fc__progress i');
    let current = 0;
    let timer = null;
    let visible = false;

    function show(i) {
      current = i;
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      panes.forEach((p, k) => p.classList.toggle('on', k === i));
      chips.forEach((c, k) => c.classList.toggle('on', k <= i));
    }
    function restartBar() {
      bar.classList.remove('run');
      void bar.offsetWidth;
      bar.classList.add('run');
    }
    function tick() {
      show((current + 1) % steps.length);
      restartBar();
    }
    function start() {
      if (reduced || timer) return;
      restartBar();
      timer = setInterval(tick, 3600);
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      bar.classList.remove('run');
    }
    steps.forEach((s, i) => s.addEventListener('click', () => {
      stop();
      show(i);
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
    }));
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !bar.style.width) start(); else if (!visible) stop();
    }, { threshold: .4 }).observe(flow);
    show(0);
  }

  // ---------- Шоурил ----------
  const rp = document.getElementById('showreel');
  if (rp) {
    const scenes = [...rp.querySelectorAll('.rp__scene')];
    const chapters = [...rp.querySelectorAll('#rpChapters button')];
    const subs = [
      'Если вам 30 и страшно менять профессию — <em>смотрите до конца</em>',
      'Neura Copy пишет описание товара <em>за 30 секунд</em>',
      'Подушка безопасности — это <em>минимум 6 зарплат</em>',
      'Монтаж · Motion Design · <em>Social Media</em>'
    ];
    const SCENE = 5000;
    const TOTAL = SCENE * scenes.length;
    const subEl = document.getElementById('rpSub');
    const timeEl = document.getElementById('rpTime');
    const recEl = document.getElementById('rpRec');
    const fill = document.getElementById('rpFill');
    const toggle = document.getElementById('rpToggle');
    const pad = n => String(n).padStart(2, '0');
    let t = 0;
    let last = null;
    let playing = !reduced;
    let shown = -1;

    function setScene(i) {
      if (i === shown) return;
      shown = i;
      scenes.forEach((s, k) => {
        if (k === i) {
          // Перезапуск CSS-анимаций сцены
          s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
        } else s.classList.remove('on');
      });
      chapters.forEach((c, k) => c.classList.toggle('on', k === i));
      subEl.innerHTML = subs[i];
    }
    function render() {
      const i = Math.min(scenes.length - 1, Math.floor(t / SCENE));
      setScene(i);
      const sec = Math.floor(t / 1000);
      timeEl.textContent = `00:${pad(sec)} / 00:${pad(TOTAL / 1000)}`;
      recEl.textContent = `REC 00:00:${pad(sec)}:${pad(Math.floor((t % 1000) / 40))}`;
      fill.style.width = (t / TOTAL * 100) + '%';
      chapters.forEach((c, k) => {
        const p = Math.max(0, Math.min(1, (t - k * SCENE) / SCENE));
        c.querySelector('i').style.width = (p * 100) + '%';
      });
    }
    function loop() {
      const now = performance.now();
      if (last !== null && playing && rp.classList.contains('live')) {
        t = (t + (now - last)) % TOTAL;
        render();
      }
      last = now;
    }
    function setPlaying(p) {
      playing = p;
      rp.classList.toggle('paused', !p);
      toggle.textContent = p ? '❚❚' : '▶';
      toggle.setAttribute('aria-label', p ? 'Пауза' : 'Воспроизвести');
    }
    function seek(ms) {
      t = ms;
      shown = -1;
      render();
    }
    toggle.addEventListener('click', () => setPlaying(!playing));
    rp.querySelector('.rp__screen').addEventListener('click', () => setPlaying(!playing));
    chapters.forEach((c, k) => c.addEventListener('click', () => { seek(k * SCENE); setPlaying(true); }));
    document.getElementById('rpTrack').addEventListener('click', e => {
      const r = e.currentTarget.getBoundingClientRect();
      seek(Math.max(0, Math.min(.999, (e.clientX - r.left) / r.width)) * TOTAL);
    });
    setPlaying(playing);
    render();
    setInterval(loop, 40);
  }

  // ---------- Видеопревью: наведение на компьютере, прокрутка и тап на телефоне ----------
  const previews = [...document.querySelectorAll('.vprev')];
  previews.forEach(p => {
    if (hoverable) {
      p.addEventListener('mouseenter', () => p.classList.add('playing'));
      p.addEventListener('mouseleave', () => p.classList.remove('playing'));
    }
    p.addEventListener('click', () => p.classList.toggle('playing'));
    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.classList.toggle('playing'); }
    });
  });
  if (!hoverable && !reduced) {
    const io = new IntersectionObserver(entries => entries.forEach(e =>
      e.target.classList.toggle('playing', e.intersectionRatio > .6)), { threshold: [0, .6, 1] });
    previews.forEach(p => io.observe(p));
  }
})();
