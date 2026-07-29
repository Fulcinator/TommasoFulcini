const progress = document.querySelector(".scroll-progress span");
const revealItems = document.querySelectorAll(".reveal");
const newsList = document.querySelector("#news-list");

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
