const progress = document.querySelector(".scroll-progress span");
const revealItems = document.querySelectorAll(".reveal");
const newsList = document.querySelector("#news-list");
const publicationsList = document.querySelector("#publications-list");
const languageButtons = document.querySelectorAll("[data-lang-option]");
const themeToggleButton = document.querySelector("[data-theme-toggle]");
const pageKey = document.body.dataset.page || "home";

const languageStorageKey = "site-language";
const themeStorageKey = "site-theme";

const translations = {
  common: {
    brand_subtitle: { en: "Software Engineering Research", it: "Ricerca in Ingegneria del Software" },
    nav_home: { en: "Home", it: "Home" },
    nav_publications: { en: "Publications", it: "Pubblicazioni" },
    nav_teaching: { en: "Teaching", it: "Didattica" },
    nav_service: { en: "Service", it: "Servizio" },
    nav_other: { en: "Other", it: "Altro" },
    primary_nav_label: { en: "Primary", it: "Navigazione principale" },
    lang_control_label: { en: "Language", it: "Lingua" },
    theme_toggle_label: { en: "Toggle dark mode", it: "Attiva o disattiva modalita notturna" },
    footer_role: { en: "Postdoctoral researcher · Politecnico di Torino", it: "Ricercatore postdoc · Politecnico di Torino" },
    external_profiles_label: { en: "External profiles", it: "Profili esterni" },
    copy_bibtex: { en: "Copy BibTeX", it: "Copia BibTeX" },
    copied: { en: "Copied", it: "Copiato" },
    copy_failed: { en: "Copy failed", it: "Copia non riuscita" },
    slides_label: { en: "Slides", it: "Slide" },
    news_empty: { en: "No news items yet.", it: "Nessuna notizia al momento." },
    msc_computer_engineering: { en: "M.Sc. in Computer Engineering", it: "Laurea Magistrale in Ingegneria Informatica" },
    bsc_computer_engineering: { en: "B.Sc. in Computer Engineering", it: "Laurea in Ingegneria Informatica" },
    msc_management_engineering: { en: "M.Sc. in Management Engineering", it: "Laurea Magistrale in Ingegneria Gestionale" },
  },
  home: {
    home_kicker: { en: "DAUIN · Politecnico di Torino", it: "DAUIN · Politecnico di Torino" },
    home_role: { en: "Postdoctoral Researcher in Software Engineering", it: "Ricercatore postdoc in Ingegneria del Software" },
    home_lead: {
      en: "I am a postdoctoral researcher at Politecnico di Torino working on software testing, gamification, code quality, maintainability, and the use of large language models in software engineering, with a focus on practical tool support and empirical studies.",
      it: "Sono ricercatore postdoc al Politecnico di Torino e mi occupo di software testing, gamification, code quality, manutenibilita e uso dei large language model nell'ingegneria del software, con attenzione al supporto tramite strumenti e agli studi empirici.",
    },
    home_pronouns_label: { en: "Pronouns", it: "Pronomi" },
    home_location_label: { en: "Location", it: "Sede" },
    home_location_value: { en: "Turin, Italy", it: "Torino, Italia" },
    home_affiliation_label: { en: "Affiliation", it: "Affiliazione" },
    home_contact_button: { en: "Contact me", it: "Contattami" },
    home_focus_kicker: { en: "Current focus", it: "Focus attuale" },
    home_focus_1: { en: "Gamification for software testing", it: "Gamification per il software testing" },
    home_focus_2: { en: "LLM-assisted refactoring and test repair", it: "Refactoring e test repair assistiti da LLM" },
    home_focus_3: { en: "Code quality and maintainability", it: "Code quality e manutenibilita" },
    home_focus_4: { en: "Developer-centered tooling", it: "Strumenti centrati sugli sviluppatori" },
    home_news_kicker: { en: "News", it: "Notizie" },
    home_news_title: { en: "Recent updates", it: "Aggiornamenti recenti" },
    home_news_desc: {
      en: "Short announcements for accepted papers, talks, committee roles, and other milestones.",
      it: "Brevi aggiornamenti su paper accettati, talk, ruoli di comitato e altri traguardi.",
    },
  },
  teaching: {
    teaching_kicker: { en: "Politecnico di Torino", it: "Politecnico di Torino" },
    teaching_title: { en: "Teaching", it: "Didattica" },
    teaching_lead: {
      en: "Teaching activity across computer engineering and management engineering courses at Politecnico di Torino.",
      it: "Attivita didattica nei corsi di ingegneria informatica e ingegneria gestionale al Politecnico di Torino.",
    },
    teaching_levels_label: { en: "Levels", it: "Livelli" },
    teaching_levels_value: { en: "M.Sc. and B.Sc.", it: "Laurea magistrale e laurea" },
    teaching_role_label: { en: "Role", it: "Ruolo" },
    teaching_role_value: { en: "Teaching collaborator", it: "Collaboratore alla didattica" },
    teaching_institution_label: { en: "Institution", it: "Istituzione" },
    teaching_institution_value: { en: "Politecnico di Torino", it: "Politecnico di Torino" },
    teaching_collaborator_sentence: { en: "Teaching collaborator.", it: "Collaboratore alla didattica." },
  },
  service: {
    service_kicker: { en: "Academic community", it: "Comunita accademica" },
    service_title: { en: "Professional service", it: "Servizio professionale" },
    service_lead: {
      en: "Selected conference and workshop service roles across software engineering venues.",
      it: "Selezione di ruoli di servizio in conferenze e workshop nell'ambito dell'ingegneria del software.",
    },
    service_venues_label: { en: "Venues", it: "Venue" },
    service_role_types_label: { en: "Role types", it: "Tipi di ruolo" },
    service_role_types_value: { en: "PC, organizing committee, chairing", it: "PC, comitati organizzativi, chairing" },
    service_scope_label: { en: "Scope", it: "Ambito" },
    service_scope_value: { en: "Research and community service", it: "Servizio alla ricerca e alla comunita" },
    service_program_committee: { en: "Program Committee", it: "Program Committee" },
    service_committee_member: { en: "Committee member.", it: "Membro del comitato." },
    service_pc_member: { en: "PC member.", it: "Membro del PC." },
    service_tool_competition_leadership: { en: "Tool competition leadership", it: "Responsabilita nella tool competition" },
    service_tool_competition_desc: { en: "Tool Competition Co-chair and session chair.", it: "Co-chair della tool competition e chair di sessione." },
    service_workshop_organization: { en: "Workshop organization", it: "Organizzazione workshop" },
    service_asta_desc: { en: "Organizing committee member, panel activity, and session chair.", it: "Membro del comitato organizzatore, attivita di panel e chair di sessione." },
    service_organizing_committee: { en: "Organizing Committee", it: "Comitato organizzatore" },
    service_workshop_organizer: { en: "Workshop organizer.", it: "Organizzatore del workshop." },
    service_program_committee_member: { en: "Program committee member.", it: "Membro del program committee." },
  },
  other: {
    other_kicker: { en: "Interests and directions", it: "Interessi e direzioni" },
    other_title: { en: "Other", it: "Altro" },
    other_lead: {
      en: "A space for broader interests, talks, collaborations, and side projects that sit alongside my main research activity.",
      it: "Uno spazio per interessi piu ampi, talk, collaborazioni e progetti laterali che affiancano la mia principale attivita di ricerca.",
    },
    other_current_use_label: { en: "Current use", it: "Uso attuale" },
    other_current_use_value: { en: "Research-adjacent interests", it: "Interessi vicini alla ricerca" },
    other_future_fit_label: { en: "Future fit", it: "Sviluppi futuri" },
    other_future_fit_value: { en: "Talks, hobbies, side projects", it: "Talk, hobby, progetti laterali" },
    other_tone_label: { en: "Tone", it: "Tono" },
    other_tone_value: { en: "Less formal, still structured", it: "Meno formale, ma strutturato" },
    other_section_kicker: { en: "Research-adjacent interests", it: "Interessi vicini alla ricerca" },
    other_section_title: { en: "Directions that already surface in public profiles", it: "Direzioni che emergono gia dai profili pubblici" },
    other_theme_1_title: { en: "Human-computer interaction for developers", it: "Interazione uomo-macchina per sviluppatori" },
    other_theme_1_desc: {
      en: "How software engineering tools feel to use matters. Interfaces shape adoption, continuity, and the quality of the resulting engineering work.",
      it: "L'esperienza d'uso degli strumenti di ingegneria del software conta. Le interfacce influenzano adozione, continuita e qualita del lavoro che ne deriva.",
    },
    other_theme_2_title: { en: "Games and playful systems", it: "Giochi e sistemi ludici" },
    other_theme_2_desc: {
      en: "Public work already connects testing with game-inspired mechanics. This page can later broaden that into a more personal note on games, design, or playful learning.",
      it: "Il lavoro pubblico collega gia il testing a meccaniche ispirate ai giochi. Questa pagina puo estendere il tema verso giochi, design o apprendimento ludico.",
    },
    other_theme_3_title: { en: "Developer experience", it: "Developer experience" },
    other_theme_3_desc: {
      en: "Tooling, feedback loops, onboarding, and maintainability all sit close to the question of what makes a software workflow genuinely usable.",
      it: "Tooling, feedback loop, onboarding e manutenibilita sono tutti vicini alla domanda su cosa renda davvero usabile un workflow software.",
    },
    other_theme_4_title: { en: "AI in practical engineering workflows", it: "AI nei workflow ingegneristici concreti" },
    other_theme_4_desc: {
      en: "The interesting part is not AI in the abstract, but where it changes real engineering tasks in ways that are measurable, reviewable, and worth keeping.",
      it: "La parte interessante non e l'AI in astratto, ma dove cambia attivita reali di ingegneria in modi misurabili, verificabili e utili nel tempo.",
    },
    other_next_kicker: { en: "Next additions", it: "Prossime aggiunte" },
    other_next_title: { en: "Useful ways to grow this page", it: "Modi utili per far crescere questa pagina" },
    other_next_desc: {
      en: "This is the natural place for content that should not sit in publications or service, but still helps the site feel more personal and memorable.",
      it: "Questo e il posto giusto per contenuti che non appartengono a pubblicazioni o service, ma che rendono il sito piu personale e memorabile.",
    },
    other_flow_a_title: { en: "Talks and invited presentations", it: "Talk e presentazioni su invito" },
    other_flow_a_desc: { en: "Add short entries for talks, tutorials, panels, or school lectures.", it: "Aggiungi brevi voci per talk, tutorial, panel o lezioni." },
    other_flow_b_title: { en: "Side projects or prototypes", it: "Progetti laterali o prototipi" },
    other_flow_b_desc: { en: "Use this space for experimental tools, demos, or smaller ideas outside formal papers.", it: "Usa questo spazio per strumenti sperimentali, demo o idee piu piccole al di fuori dei paper formali." },
    other_flow_c_title: { en: "Personal interests", it: "Interessi personali" },
    other_flow_c_desc: { en: "Music, travel, sport, books, photography, or anything else you want the site to carry.", it: "Musica, viaggi, sport, libri, fotografia o qualsiasi altra cosa tu voglia far emergere nel sito." },
  },
};

const pageMetadata = {
  home: {
    title: {
      en: "Tommaso Fulcini | Software Engineering Research",
      it: "Tommaso Fulcini | Ricerca in Ingegneria del Software",
    },
    description: {
      en: "Tommaso Fulcini is a postdoctoral researcher at Politecnico di Torino working on software testing, gamification, code quality, and LLM-assisted software engineering.",
      it: "Tommaso Fulcini e un ricercatore postdoc al Politecnico di Torino che lavora su software testing, gamification, code quality e ingegneria del software assistita da large language model.",
    },
  },
  publications: {
    title: { en: "Publications | Tommaso Fulcini", it: "Pubblicazioni | Tommaso Fulcini" },
    description: { en: "Publication list for Tommaso Fulcini.", it: "Elenco delle pubblicazioni di Tommaso Fulcini." },
  },
  teaching: {
    title: { en: "Teaching | Tommaso Fulcini", it: "Didattica | Tommaso Fulcini" },
    description: { en: "Teaching activity for Tommaso Fulcini at Politecnico di Torino.", it: "Attivita didattica di Tommaso Fulcini al Politecnico di Torino." },
  },
  service: {
    title: { en: "Professional Service | Tommaso Fulcini", it: "Servizio Professionale | Tommaso Fulcini" },
    description: { en: "Conference and workshop service roles for Tommaso Fulcini.", it: "Ruoli di servizio in conferenze e workshop di Tommaso Fulcini." },
  },
  other: {
    title: { en: "Other | Tommaso Fulcini", it: "Altro | Tommaso Fulcini" },
    description: { en: "Additional interests and future space for side topics on Tommaso Fulcini's website.", it: "Interessi aggiuntivi e spazio per temi laterali nel sito di Tommaso Fulcini." },
  },
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const emphasizeOwnName = (authors) =>
  escapeHtml(authors).replaceAll("Tommaso Fulcini", "<strong>Tommaso Fulcini</strong>");

const getPreferredLanguage = () => {
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  if (storedLanguage === "en" || storedLanguage === "it") {
    return storedLanguage;
  }

  return navigator.language?.toLowerCase().startsWith("it") ? "it" : "en";
};

const getPreferredTheme = () => {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

let currentLanguage = getPreferredLanguage();
let currentTheme = getPreferredTheme();

const translate = (key) => {
  const entry = translations[pageKey]?.[key] ?? translations.common[key];
  if (!entry) {
    return key;
  }

  return entry[currentLanguage] ?? entry.en ?? key;
};

const translateNewsType = (type) => {
  const types = {
    Publication: { en: "Publication", it: "Pubblicazione" },
    Talk: { en: "Talk", it: "Talk" },
    Committee: { en: "Committee", it: "Comitato" },
    Workshop: { en: "Workshop", it: "Workshop" },
    Award: { en: "Award", it: "Premio" },
    Other: { en: "Other", it: "Altro" },
  };

  return types[type]?.[currentLanguage] ?? type;
};

const translatePublicationMeta = (meta) => {
  if (currentLanguage === "en") {
    return meta;
  }

  return String(meta)
    .replace(/^In press\b/, "In stampa")
    .replace(/^Conference volume\b/, "Volume di conferenza")
    .replace(/^Conference\b/, "Conferenza")
    .replace(/^Workshop\b/, "Workshop")
    .replace(/^Journal\b/, "Rivista")
    .replace(/^Doctoral thesis\b/, "Tesi di dottorato")
    .replace(/^Book chapter\b/, "Capitolo di libro")
    .replace(/^Publication\b/, "Pubblicazione")
    .replace(/^Report\b/, "Rapporto");
};

const applyMetadata = () => {
  const metadata = pageMetadata[pageKey];
  if (!metadata) {
    return;
  }

  document.title = metadata.title[currentLanguage] ?? metadata.title.en;
  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute("content", metadata.description[currentLanguage] ?? metadata.description.en);
  }
};

const applyTranslations = () => {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", translate(element.dataset.i18nTitle));
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.langOption === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  applyMetadata();
};

const applyTheme = () => {
  document.documentElement.dataset.theme = currentTheme;
  if (themeToggleButton) {
    themeToggleButton.setAttribute("data-theme", currentTheme);
  }
};

const renderNews = () => {
  if (!newsList) {
    return;
  }

  const items = Array.isArray(window.newsItems) ? [...window.newsItems] : [];
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (items.length === 0) {
    newsList.innerHTML = `<p class="news-empty">${escapeHtml(translate("news_empty"))}</p>`;
    return;
  }

  const locale = currentLanguage === "it" ? "it-IT" : "en-GB";
  const recentItems = items.slice(0, 6);
  newsList.innerHTML = recentItems
    .map((item) => {
      const formattedDate = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const linkMarkup =
        item.link && item.linkLabel
          ? `<a href="${item.link}" ${item.link.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${escapeHtml(item.linkLabel)}</a>`
          : "";
      const slidesMarkup = item.slides
        ? `<a href="${item.slides}" ${item.slides.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${escapeHtml(translate("slides_label"))}</a>`
        : "";
      const actions = [linkMarkup, slidesMarkup].filter(Boolean).join("");

      return `
        <article class="news-item">
          <div class="news-date">${escapeHtml(formattedDate)}</div>
          <div class="news-body">
            <p class="news-type">${escapeHtml(translateNewsType(item.type))}</p>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.details ? `<p>${escapeHtml(item.details)}</p>` : ""}
            ${actions ? `<div class="news-link">${actions}</div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
};

const renderPublications = () => {
  if (!publicationsList) {
    return;
  }

  const publications = Array.isArray(window.publicationsData) ? [...window.publicationsData] : [];
  const groupedByYear = publications.reduce((accumulator, publication) => {
    const year = String(publication.year);
    if (!accumulator.has(year)) {
      accumulator.set(year, []);
    }
    accumulator.get(year).push(publication);
    return accumulator;
  }, new Map());

  const orderedYears = [...groupedByYear.keys()].sort((left, right) => Number(right) - Number(left));
  publicationsList.innerHTML = orderedYears
    .map((year) => {
      const items = groupedByYear
        .get(year)
        .map((publication) => {
          const authors = Array.isArray(publication.authors) ? publication.authors.join(", ") : publication.authors;

          return `
            <article class="entry-card publication-card reveal is-visible">
              <div class="publication-head">
                <div>
                  <p class="entry-meta">${escapeHtml(translatePublicationMeta(publication.meta))}</p>
                  <h3>${escapeHtml(publication.title)}</h3>
                </div>
                <button
                  class="button button-secondary button-small copy-bibtex-button"
                  type="button"
                  data-publication-key="${escapeHtml(publication.key)}"
                >
                  ${escapeHtml(translate("copy_bibtex"))}
                </button>
              </div>
              <p class="publication-authors">${emphasizeOwnName(authors)}</p>
            </article>
          `;
        })
        .join("");

      return `
        <div class="year-block">
          <div class="year-stamp">${escapeHtml(year)}</div>
          <div class="entry-stack">${items}</div>
        </div>
      `;
    })
    .join("");

  publicationsList.onclick = async (event) => {
    const button = event.target.closest(".copy-bibtex-button");
    if (!button) {
      return;
    }

    const publication = publications.find((item) => item.key === button.dataset.publicationKey);
    if (!publication) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publication.bibtex);
      button.textContent = translate("copied");
      window.setTimeout(() => {
        button.textContent = translate("copy_bibtex");
      }, 1400);
    } catch (error) {
      button.textContent = translate("copy_failed");
      window.setTimeout(() => {
        button.textContent = translate("copy_bibtex");
      }, 1400);
    }
  };
};

if (progress) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, ratio))}%`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

if (revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -30px 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentLanguage = button.dataset.langOption;
    window.localStorage.setItem(languageStorageKey, currentLanguage);
    applyTranslations();
    renderNews();
    renderPublications();
  });
});

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    window.localStorage.setItem(themeStorageKey, currentTheme);
    applyTheme();
  });
}

applyTheme();
applyTranslations();
renderNews();
renderPublications();
