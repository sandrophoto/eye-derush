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
      inner.style.setProperty('--p', all.length > 1 ? index / (all.length - 1) : 0);   // place du mot dans la phrase, de 0 à 1
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
    en: { title: 'Eye Derush understands your rushes, sorts them and finds them', description: 'Eye Derush remembers all your rushes on the Mac: what is said, what is seen. Even with the drives unplugged, whatever your editing software.' },
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
    labelZooms();
    try { localStorage.setItem('eye-derush-lang', lang); } catch { /* navigation privée : la langue n'est pas retenue */ }
  };

  // Une capture qu'on peut agrandir : son intitulé dit le geste, puis ce qu'elle montre.
  function labelZooms() {
    document.querySelectorAll('[data-zoom]').forEach((el) => {
      const img = el.matches('img') ? el : el.querySelector('img');
      el.setAttribute('aria-label', `${lang === 'fr' ? 'Agrandir :' : 'Enlarge:'} ${img.alt}`);
    });
  }

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
    // Sur un téléphone, les recherches tiennent sur une ligne qui glisse : la recherche choisie reste visible.
    const bar = button.parentElement;
    if (bar.scrollWidth > bar.clientWidth) {
      const offset = button.getBoundingClientRect().left - bar.getBoundingClientRect().left - parseFloat(getComputedStyle(bar).paddingLeft);
      bar.scrollBy({ left: offset, behavior: still ? 'auto' : 'smooth' });
    }
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
    const follow = (event) => {
      const box = stage.getBoundingClientRect();
      range.value = Math.round(Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1) * 100);
      show();
    };
    stage.addEventListener('pointerdown', (event) => { stage.setPointerCapture(event.pointerId); follow(event); });
    stage.addEventListener('pointermove', (event) => { if (stage.hasPointerCapture(event.pointerId)) follow(event); });
    const after = figure.querySelector('[data-compare-after]');
    const label = figure.querySelector('[data-compare-label]');
    figure.querySelectorAll('[data-compare-src]').forEach((button) => button.addEventListener('click', () => {
      after.src = button.dataset.compareSrc;
      label.dataset.current = button.dataset.compareKey;
      label.textContent = label.dataset[`label${button.dataset.compareKey === 'lut' ? 'Lut' : 'Look'}${lang === 'en' ? 'En' : ''}`];
      figure.querySelectorAll('[data-compare-src]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    }));
  });

  // ----- Agrandir : une capture s'ouvre à sa vraie taille, sur le passage montré dans la page. -----
  const zoom = document.createElement('dialog');
  zoom.className = 'zoom';
  zoom.innerHTML = '<button class="zoom__close" type="button"></button><img alt="">';
  document.body.append(zoom);
  const zoomImg = zoom.querySelector('img'), zoomClose = zoom.querySelector('button');
  zoomClose.addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', (event) => { if (event.target === zoom) zoom.close(); });
  const openZoom = (target) => {
    const img = target.matches('img') ? target : target.querySelector('img');
    zoomImg.src = img.currentSrc || img.src;
    zoomImg.alt = img.alt;
    zoomClose.textContent = lang === 'fr' ? 'Fermer' : 'Close';
    zoom.showModal();
    // Toute la hauteur de l'écran (jamais plus que l'image), ouverte au bord gauche du passage montré dans la page.
    const height = Math.min(zoom.clientHeight, img.naturalHeight);
    zoomImg.style.height = `${height}px`;
    zoom.scrollLeft = (parseFloat(getComputedStyle(target).getPropertyValue('--x')) || 0) * (height / img.naturalHeight);
  };
  document.querySelectorAll('.crop, .panel > img').forEach((el) => {
    el.dataset.zoom = '';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('click', () => openZoom(el));
    el.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openZoom(el); } });
  });
  labelZooms();

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

  // ----- Menu : Fonctions et Ressources s'ouvrent au survol ou au clic ; Échap, un clic ailleurs ou un lien les referment. -----
  const narrow = matchMedia('(max-width: 56rem)');
  const menuItems = [...document.querySelectorAll('.menu__item')].filter((item) => item.querySelector('button.menu__btn'));
  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.menu__btn').setAttribute('aria-expanded', String(open));
  };
  const closeAll = (except) => menuItems.forEach((item) => { if (item !== except) setOpen(item, false); });
  menuItems.forEach((item) => {
    // Au clavier, Entrée ouvre et referme ; à la souris, le clic ouvre (le survol l'a souvent déjà fait).
    item.querySelector('.menu__btn').addEventListener('click', (event) => {
      const open = event.detail === 0 ? !item.classList.contains('is-open') : true;
      closeAll(item);
      setOpen(item, open);
    });
    item.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' && !narrow.matches) { closeAll(item); setOpen(item, true); } });
    item.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse' && !narrow.matches) setOpen(item, false); });
  });
  // Sur un écran étroit, le bouton Menu ouvre la même liste en plein écran.
  const burger = document.querySelector('[data-menu-toggle]');
  const setSheet = (open) => { nav.classList.toggle('is-menu', open); burger.setAttribute('aria-expanded', String(open)); };
  burger.addEventListener('click', () => setSheet(!nav.classList.contains('is-menu')));
  document.querySelector('[data-menu]').addEventListener('click', (event) => { if (event.target.closest('a')) { closeAll(); setSheet(false); } });
  document.addEventListener('click', (event) => { if (!event.target.closest('[data-menu]')) closeAll(); });
  // Info-bulles : un toucher ouvre (Safari ne donne pas le focus aux boutons), un toucher ailleurs ferme.
  document.addEventListener('click', (event) => {
    const tip = event.target.closest('.tip');
    document.querySelectorAll('.tip.is-open').forEach((open) => { if (open !== tip) open.classList.remove('is-open'); });
    if (tip && event.target.closest('.tip__btn')) tip.classList.toggle('is-open');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = menuItems.find((item) => item.classList.contains('is-open'));
    if (open) { setOpen(open, false); open.querySelector('.menu__btn').focus(); }
    if (nav.classList.contains('is-menu')) { setSheet(false); burger.focus(); }
    document.querySelectorAll('.tip.is-open').forEach((tip) => tip.classList.remove('is-open'));
  });

  // ----- Arrivées : titres et captures, une fois, quand ils entrent à l'écran. -----
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-reveal], [data-split]').forEach((el) => { if (!el.closest('.hero')) reveal.observe(el); });

  // ----- Les chiffres mesurés comptent jusqu'à leur valeur, une fois, quand ils entrent à l'écran. -----
  const count = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    count.unobserve(entry.target);
    const el = entry.target, final = el.textContent, match = final.match(/^([\d\s\u00a0\u202f]*\d)(.*)$/s);
    if (!match) return;
    const target = Number(match[1].replace(/\D/g, '')), start = performance.now(), length = 1600;
    const step = (now) => {
      const t = Math.min((now - start) / length, 1), eased = 1 - (1 - t) ** 4;
      el.textContent = t < 1 ? Math.round(target * eased).toLocaleString('fr-FR') + match[2] : final;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { rootMargin: '0px 0px -15% 0px' });
  if (!still) document.querySelectorAll('.stats dd').forEach((el) => count.observe(el));

  // ----- Ouverture de la page : le titre, puis le reste (voir site.css). -----
  setTimeout(() => {   // un minuteur, pas requestAnimationFrame : il passe aussi dans un onglet ouvert en arrière-plan
    root.classList.add('is-ready');
    document.querySelectorAll('.hero [data-split]').forEach((el) => el.classList.add('is-in'));
  }, 60);
})();
