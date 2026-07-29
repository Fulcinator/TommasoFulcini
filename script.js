const progress = document.querySelector(".scroll-progress span");
const revealItems = document.querySelectorAll(".reveal");
const newsList = document.querySelector("#news-list");
const publicationsList = document.querySelector("#publications-list");
const publicationsCount = document.querySelector("#publications-count");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const emphasizeOwnName = (authors) =>
  escapeHtml(authors).replaceAll("Tommaso Fulcini", "<strong>Tommaso Fulcini</strong>");

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

if (newsList) {
  const items = Array.isArray(window.newsItems) ? [...window.newsItems] : [];
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (items.length === 0) {
    newsList.innerHTML = '<p class="news-empty">No news items yet.</p>';
  } else {
    const recentItems = items.slice(0, 6);
    newsList.innerHTML = recentItems
      .map((item) => {
        const formattedDate = new Date(`${item.date}T00:00:00`).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const linkMarkup =
          item.link && item.linkLabel
            ? `<a href="${item.link}" ${item.link.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${item.linkLabel}</a>`
            : "";

        return `
          <article class="news-item">
            <div class="news-date">${formattedDate}</div>
            <div class="news-body">
              <p class="news-type">${item.type}</p>
              <h3>${item.title}</h3>
              ${item.details ? `<p>${item.details}</p>` : ""}
              ${linkMarkup ? `<div class="news-link">${linkMarkup}</div>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }
}

if (publicationsList) {
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
          const authors = Array.isArray(publication.authors)
            ? publication.authors.join(", ")
            : publication.authors;

          return `
            <article class="entry-card publication-card reveal">
              <div class="publication-head">
                <div>
                  <p class="entry-meta">${escapeHtml(publication.meta)}</p>
                  <h3>${escapeHtml(publication.title)}</h3>
                </div>
                <button
                  class="button button-secondary button-small copy-bibtex-button"
                  type="button"
                  data-publication-key="${escapeHtml(publication.key)}"
                >
                  Copy BibTeX
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

  if (publicationsCount) {
    publicationsCount.textContent = String(publications.length);
  }

  publicationsList.querySelectorAll(".reveal").forEach((item) => {
    item.classList.add("is-visible");
  });

  publicationsList.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-bibtex-button");
    if (!button) {
      return;
    }

    const publication = publications.find(
      (item) => item.key === button.dataset.publicationKey
    );

    if (!publication) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publication.bibtex);
      const previousLabel = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = previousLabel;
      }, 1400);
    } catch (error) {
      button.textContent = "Copy failed";
      window.setTimeout(() => {
        button.textContent = "Copy BibTeX";
      }, 1400);
    }
  });
}
