// Eye Derush : langue de la page, plans de l'en-tête, arrivées des titres et des captures.
(() => {
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Titres : chaque mot dans sa ligne, pour monter un à un (le texte reste lisible sans script). -----
  const split = (el) => {
    const text = el.textContent;
    const spoken = document.createElement('span');   // lu par les lecteurs d'écran ; les mots animés leur sont cachés
    spoken.className = 'visually-hidden';
    spoken.textContent = text;
    el.textContent = '';
    el.append(spoken);
    text.split(' ').forEach((word, index, all) => {
      const outer = document.createElement('span');
      const inner = document.createElement('span');
      outer.className = 'word';
      outer.setAttribute('aria-hidden', 'true');
      inner.style.setProperty('--i', index);
      inner.textContent = word;
      outer.append(inner);
      el.append(outer, index < all.length - 1 ? ' ' : '');
    });
  };

  // ----- Langue : le français est dans la page, l'anglais dans les attributs data-en. -----
  const texts = [...document.querySelectorAll('[data-en]')].map((el) => ({ el, fr: el.textContent, en: el.dataset.en }));
  const attrs = [];
  document.querySelectorAll('*').forEach((el) => {
    for (const name of el.getAttributeNames()) {
      if (!name.startsWith('data-en-')) continue;
      const target = name.slice('data-en-'.length);
      attrs.push({ el, target, fr: el.getAttribute(target), en: el.getAttribute(name) });
    }
  });
  const shots = [...document.querySelectorAll('[data-src-en]')].map((el) => ({ el, fr: el.getAttribute('src'), en: el.dataset.srcEn }));
  const meta = {
    fr: { title: document.title, description: document.querySelector('meta[name="description"]').content },
    en: { title: 'Eye Derush: every shoot you’ve ever done, one memory', description: 'Eye Derush remembers all your rushes on the Mac: what is said, what is seen. Even with the drives unplugged, whatever your editing software.' },
  };

  let lang = 'fr';
  const setLang = (next) => {
    lang = next;
    root.lang = lang;
    texts.forEach((t) => {
      t.el.textContent = t[lang];
      if (t.el.hasAttribute('data-split')) split(t.el);
    });
    attrs.forEach((a) => a.el.setAttribute(a.target, a[lang]));
    shots.forEach((s) => s.el.setAttribute('src', s[lang]));
    document.title = meta[lang].title;
    document.querySelector('meta[name="description"]').content = meta[lang].description;
    showQuery(document.querySelector('.query[aria-pressed="true"]'), false);
    document.querySelectorAll('[data-compare-label]').forEach((label) => {
      const key = label.dataset.current === 'lut' ? 'Lut' : 'Look';
      label.textContent = label.dataset[`label${key}${lang === 'en' ? 'En' : ''}`];
    });
    syncRotation();
    try { localStorage.setItem('eye-derush-lang', lang); } catch { /* navigation privée : la langue n'est pas retenue */ }
  };

  // ----- En-tête : chaque recherche montre son image, sa question et le minutage où elle est trouvée. -----
  const question = document.querySelector('[data-hero-q]');
  const timecode = document.querySelector('[data-hero-tc]');
  const playhead = document.querySelector('[data-hero-playhead]');
  const frames = [...document.querySelectorAll('[data-frame]')];
  const queries = [...document.querySelectorAll('.query')];
  const seconds = (tc) => { const [m, s] = tc.split(':').map(Number); return m * 60 + s; };
  const clock = (total) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  let rolling = 0;
  // Le minutage défile de l'ancien au nouveau, comme un compteur de lecteur qu'on fait avancer.
  const rollTo = (tc) => {
    cancelAnimationFrame(rolling);
    const from = seconds(timecode.textContent), to = seconds(tc);
    if (still || from === to) { timecode.textContent = tc; return; }
    const start = performance.now(), length = 900;
    const step = (now) => {
      const t = Math.min((now - start) / length, 1), eased = 1 - (1 - t) ** 4;
      timecode.textContent = clock(Math.round(from + (to - from) * eased));
      if (t < 1) rolling = requestAnimationFrame(step);
    };
    rolling = requestAnimationFrame(step);
  };
  function showQuery(button, animate = true) {
    question.textContent = button.dataset[lang === 'fr' ? 'qFr' : 'qEn'];
    if (animate) rollTo(button.dataset.tc); else timecode.textContent = button.dataset.tc;
    queries.forEach((q) => q.setAttribute('aria-pressed', String(q === button)));
    frames.forEach((f) => f.classList.toggle('is-on', f.dataset.frame === button.dataset.query));
  }

  // Les plans défilent seuls, lentement ; un clic sur une recherche, le survol ou le clavier les arrêtent, « Pause » aussi.
  const pause = document.querySelector('[data-hero-pause]');
  const pauseLabel = pause.querySelector('span');
  const rotation = { timer: null, held: still, hover: false };
  const pauseWords = { fr: ['Pause', 'Lecture'], en: ['Pause', 'Play'] };
  const restartPlayhead = (running) => {
    playhead.classList.remove('is-running');
    void playhead.offsetWidth;
    if (running) playhead.classList.add('is-running');
  };
  function syncRotation() {
    clearInterval(rotation.timer);
    rotation.timer = null;
    pauseLabel.textContent = pauseWords[lang][rotation.held ? 1 : 0];
    const running = !rotation.held && !rotation.hover;
    restartPlayhead(running);
    if (!running) return;
    rotation.timer = setInterval(() => {
      const current = queries.findIndex((q) => q.getAttribute('aria-pressed') === 'true');
      showQuery(queries[(current + 1) % queries.length]);
      restartPlayhead(true);
    }, 6000);
  }
  queries.forEach((button) => button.addEventListener('click', () => {
    question.setAttribute('aria-live', 'polite');   // annoncé seulement quand le visiteur choisit
    rotation.held = true;
    showQuery(button);
    syncRotation();
  }));
  pause.addEventListener('click', () => { rotation.held = !rotation.held; syncRotation(); });
  const heroBody = document.querySelector('.hero__body');
  [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]
    .forEach(([type, value]) => heroBody.addEventListener(type, () => { rotation.hover = value; syncRotation(); }));
  if (!rotation.held) pause.hidden = false;

  document.querySelector('[data-lang-toggle]').addEventListener('click', () => setLang(lang === 'fr' ? 'en' : 'fr'));
  let saved = null;
  try { saved = localStorage.getItem('eye-derush-lang'); } catch { /* idem */ }
  const wanted = saved || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  document.querySelectorAll('[data-split]').forEach(split);
  if (wanted === 'en') setLang('en'); else syncRotation();

  // ----- Avant, après : le curseur fixe la limite entre les deux images ; les boutons changent ce qui est appliqué. -----
  document.querySelectorAll('[data-compare]').forEach((figure) => {
    const stage = figure.querySelector('.compare__stage');
    const range = figure.querySelector('.compare__range');
    const show = () => stage.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', show);
    show();
    const after = figure.querySelector('[data-compare-after]');
    const label = figure.querySelector('[data-compare-label]');
    figure.querySelectorAll('[data-compare-src]').forEach((button) => button.addEventListener('click', () => {
      after.src = button.dataset.compareSrc;
      label.dataset.current = button.dataset.compareKey;
      label.textContent = label.dataset[`label${button.dataset.compareKey === 'lut' ? 'Lut' : 'Look'}${lang === 'en' ? 'En' : ''}`];
      figure.querySelectorAll('[data-compare-src]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    }));
  });

  // ----- Inscription : l'adresse part chez FormSubmit ; « c'est noté » seulement quand le service l'a confirmé. -----
  const words = {
    fr: { invalid: 'Cette adresse semble incomplète. Écrivez-la comme nom@exemple.com.', sending: 'Envoi…',
          done: (mail) => `C’est noté : les nouvelles iront à ${mail}.`, failed: 'L’envoi n’a pas abouti. Réessayez dans une minute.' },
    en: { invalid: 'That address looks incomplete. Write it as name@example.com.', sending: 'Sending…',
          done: (mail) => `Noted: the news will go to ${mail}.`, failed: 'That did not go through. Try again in a minute.' },
  };
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    const input = form.querySelector('input[type="email"]'), help = form.querySelector('[aria-live]'), button = form.querySelector('button');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const valid = input.checkValidity();
      input.toggleAttribute('aria-invalid', !valid);
      if (!valid) { help.textContent = words[lang].invalid; input.focus(); return; }
      if (form.querySelector('[name="_honey"]').value) return;   // un robot a rempli le champ caché
      const mail = input.value.trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      help.textContent = words[lang].sending;
      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: mail, page: lang, _subject: 'Eye Derush : inscription aux nouvelles', _template: 'table', _captcha: 'false' }),
      })
        .then((response) => response.json())
        .then((data) => {
          const ok = String(data.success) === 'true';
          help.textContent = ok ? words[lang].done(mail) : words[lang].failed;
          if (ok) form.reset();
        })
        .catch(() => { help.textContent = words[lang].failed; })
        .finally(() => { button.disabled = false; button.removeAttribute('aria-busy'); });
    });
  });

  // ----- Barre du haut : pleine dès qu'on quitte l'image de l'en-tête. -----
  const nav = document.querySelector('[data-nav]');
  new IntersectionObserver(([entry]) => nav.classList.toggle('is-solid', !entry.isIntersecting), { rootMargin: '-72px 0px 0px 0px' })
    .observe(document.querySelector('[data-hero]'));

  // ----- Arrivées : titres et captures, une fois, quand ils entrent à l'écran. -----
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-reveal], [data-split]').forEach((el) => { if (!el.closest('.hero')) reveal.observe(el); });

  // ----- Ouverture de la page : le titre, puis le reste (voir site.css). -----
  setTimeout(() => {   // un minuteur, pas requestAnimationFrame : il passe aussi dans un onglet ouvert en arrière-plan
    root.classList.add('is-ready');
    document.querySelectorAll('.hero [data-split]').forEach((el) => el.classList.add('is-in'));
  }, 60);
})();
