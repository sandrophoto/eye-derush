// Eye Derush : langue de la page, recherches de l'en-tête, arrivée des captures.
(() => {
  const root = document.documentElement;

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
    en: { title: 'Eye Derush: the exact shot, found in your rushes', description: 'Eye Derush listens to and watches your rushes on the Mac, then finds every moment from a word or an idea.' },
  };

  let lang = 'fr';
  const setLang = (next) => {
    lang = next;
    root.lang = lang;
    texts.forEach((t) => { t.el.textContent = t[lang]; });
    attrs.forEach((a) => a.el.setAttribute(a.target, a[lang]));
    shots.forEach((s) => s.el.setAttribute('src', s[lang]));
    document.title = meta[lang].title;
    document.querySelector('meta[name="description"]').content = meta[lang].description;
    showQuery(document.querySelector('.query[aria-pressed="true"]'));
    try { localStorage.setItem('eye-derush-lang', lang); } catch { /* navigation privée : la langue n'est pas retenue */ }
  };

  // ----- En-tête : chaque recherche montre son image, sa question et sa réponse. -----
  const question = document.querySelector('[data-hero-q]');
  const answer = document.querySelector('[data-hero-a]');
  const frames = [...document.querySelectorAll('[data-frame]')];
  const queries = [...document.querySelectorAll('.query')];
  function showQuery(button) {
    question.textContent = button.dataset[lang === 'fr' ? 'qFr' : 'qEn'];
    answer.textContent = button.dataset[lang === 'fr' ? 'aFr' : 'aEn'];
    queries.forEach((q) => q.setAttribute('aria-pressed', String(q === button)));
    frames.forEach((f) => f.classList.toggle('is-on', f.dataset.frame === button.dataset.query));
  }
  queries.forEach((button) => button.addEventListener('click', () => showQuery(button)));

  document.querySelector('[data-lang-toggle]').addEventListener('click', () => setLang(lang === 'fr' ? 'en' : 'fr'));
  let saved = null;
  try { saved = localStorage.getItem('eye-derush-lang'); } catch { /* idem */ }
  const wanted = saved || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  if (wanted === 'en') setLang('en');

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

  // ----- Arrivée des captures, une fois. -----
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    reveal.unobserve(entry.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));
})();
