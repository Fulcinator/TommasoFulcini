# Tommaso Fulcini personal site

Static multipage personal site prepared for GitHub Pages.

## Files

- `index.html`: homepage with current role and research themes
- `publications.html`: publication list
- `publications-data.js`: local publication data and BibTeX entries
- `scripts/sync-publications-from-iris.mjs`: IRIS import script for new publications
- `teaching.html`: teaching page
- `service.html`: professional service page
- `other.html`: additional interests page
- `styles.css`: shared styling
- `script.js`: scroll progress and reveal animations
- `news-data.js`: homepage news data
- `scripts/sync-news-from-issue.mjs`: GitHub Actions sync script for news issues
- `.github/ISSUE_TEMPLATE/news.yml`: issue form for submitting news
- `.github/workflows/sync-news-from-issue.yml`: workflow that publishes issue submissions
- `.github/workflows/sync-publications-from-iris.yml`: weekly workflow that imports new IRIS publications
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow

## Publish on GitHub Pages

1. Create a GitHub repository and push these files to the `main` branch.
2. In GitHub, open `Settings > Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` again if needed; the workflow will publish the site automatically.

If the repository is named `fulcinator.github.io`, the public URL will be:

`https://fulcinator.github.io/`

If you use a different repository name, GitHub Pages will publish it under:

`https://fulcinator.github.io/<repository-name>/`

## Current content sources

- SoftEng group profile: https://softeng.polito.it/fulcini/
- Politecnico di Torino profile: https://www.polito.it/personale?p=tommaso.fulcini
- Politecnico IRIS profile: https://iris.polito.it/cris/rp/rp99793
- conf.researchr profile and committee pages:
  - https://conf.researchr.org/profile/icpc-2026/tommasofulcini
  - https://conf.researchr.org/profile/ise-2026/tommasofulcini
  - https://conf.researchr.org/committee/icse-2025/ide-2025-papers-program-committee
  - https://conf.researchr.org/committee/ase-2026/ase-2026-research-track-programm-committee
  - https://conf.researchr.org/committee/icst-2026/icst-2026-papers-program-committee
  - https://conf.researchr.org/track/icst-2026/icst-2026-tool-competition--self-driving-car-testing
  - https://conf.researchr.org/home/ease-2026/gamify-2026
- LinkedIn: https://it.linkedin.com/in/tommaso-fulcini/en
- ResearchGate: https://www.researchgate.net/profile/Tommaso-Fulcini-2
- Google Scholar: https://scholar.google.com/citations?user=w-enC5QAAAAJ&hl=en

## Notes

- `propic.png` is used as the local profile image.
- The publication page is rendered from `publications-data.js`, which is the local file to edit when adding or updating publications.
- Each publication entry includes a `bibtex` field used by the page's `Copy BibTeX` button.
- New IRIS publications can be imported automatically by the workflow in `.github/workflows/sync-publications-from-iris.yml`.
- The IRIS sync runs weekly every Monday at 04:17 UTC and can also be started manually with `workflow_dispatch`.
- Homepage news is rendered from `news-data.js`.
- News can now be submitted through the GitHub issue form defined in `.github/ISSUE_TEMPLATE/news.yml`.
- The workflow in `.github/workflows/sync-news-from-issue.yml` rewrites `news-data.js`, commits the change, and lets GitHub Pages redeploy from `main`.
- News issue lifecycle:
  - `Draft` means the issue is saved in GitHub but not shown on the homepage.
  - `Published` means the issue is rendered on the homepage news section.
  - editing a published issue updates the homepage entry.
  - closing the issue, or changing it back to `Draft`, removes it from the homepage.
- The ORCID footer icon currently points to an ORCID registry search because a verified personal ORCID profile URL was not found in the public sources used here.
