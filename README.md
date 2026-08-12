# Tommaso Fulcini personal site

Static multipage personal site prepared for GitHub Pages.

## Files

- `index.html`: homepage with current role and research themes
- `publications.html`: publication list
- `publications-data.js`: local publication data and BibTeX entries
- `scripts/sync-publications-from-iris.mjs`: IRIS import script for new publications
- `teaching.html`: teaching page
- `teaching-data.json`: local teaching data fetched from institutional profile pages and open to manual additions
- `teaching-overrides.json`: local overrides and fully manual teaching entries
- `scripts/sync-teaching-from-profiles.mjs`: monthly teaching sync script
- `service.html`: professional service page
- `other.html`: additional interests page
- `styles.css`: shared styling
- `script.js`: scroll progress and reveal animations
- `news-data.js`: homepage news data
- `scripts/sync-news-from-issue.mjs`: GitHub Actions sync script for news issues
- `.github/ISSUE_TEMPLATE/news.yml`: issue form for submitting news
- `.github/workflows/sync-news-from-issue.yml`: workflow that publishes issue submissions
- `.github/workflows/sync-publications-from-iris.yml`: weekly workflow that imports new IRIS publications
- `.github/workflows/sync-teaching-from-profiles.yml`: monthly workflow that refreshes teaching data
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
- The teaching page is rendered from `teaching-data.json`, which is refreshed from the official Politecnico di Torino and UPO profile pages.
- Manual edits should now go into `teaching-overrides.json`, while `teaching-data.json` is treated as generated output.
- The teaching page also reads `teaching-overrides.json` directly, so manual additions appear on the site as soon as both files are published.
- The teaching sync merges new remote data into the existing JSON instead of rebuilding it from scratch.
- Extra fields added manually to an existing teaching item are preserved across sync runs.
- If you add an `overrides` object to an existing teaching item, its values take precedence over the synchronized ones.
- Teaching items present only in the local JSON are preserved, so you can add fully manual entries with your own unique `id`.
- `teaching-overrides.json.items` is a map keyed by teaching `id` for overriding synchronized fields.
- `teaching-overrides.json.manualItems` is the place for courses that do not come from Polito or UPO pages.
- The teaching sync runs monthly on the first day of the month at 05:11 UTC and can also be started manually with `workflow_dispatch`.
- Homepage news is rendered from `news-data.js`.
- News can now be submitted through the GitHub issue form defined in `.github/ISSUE_TEMPLATE/news.yml`.
- The workflow in `.github/workflows/sync-news-from-issue.yml` rewrites `news-data.js`, commits the change, and lets GitHub Pages redeploy from `main`.
- News issue lifecycle:
  - `Draft` means the issue is saved in GitHub but not shown on the homepage.
  - `Published` means the issue is rendered on the homepage news section.
  - editing a published issue updates the homepage entry.
  - closing the issue, or changing it back to `Draft`, removes it from the homepage.
- The ORCID footer icon points to the public ORCID profile URL listed on the Politecnico di Torino profile page.

### Teaching overrides example

```json
{
  "items": {
    "polito-2025-software-engineering-i": {
      "role": "Titolare del corso",
      "courseTitle": {
        "it": "Ingegneria del software I",
        "en": "Software Engineering I"
      }
    }
  },
  "manualItems": []
}
```

The synchronized item keeps updating, but the fields inside `items.<teaching-id>` win on every sync.

### Manual teaching item example

```json
{
  "items": {},
  "manualItems": [
    {
      "id": "summer-school-2026-se-tutorial",
      "academicYear": "2025/26",
      "yearStart": 2025,
      "institution": {
        "it": "Summer School Example",
        "en": "Summer School Example"
      },
      "courseTitle": {
        "it": "Tutoriale su software quality",
        "en": "Tutorial on software quality"
      },
      "role": "Invited lecturer",
      "url": "https://example.org/tutorial",
      "source": "manual"
    }
  ]
}
```
