import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const DRY_RUN = process.argv.includes("--dry-run");
const IRIS_SEARCH_URL =
  process.env.IRIS_SEARCH_URL ??
  "https://iris.polito.it/simple-search?query=fulcini&location=&rpp=100&sort_by=dc.title_sort&order=asc";

const decodeHtml = (value) =>
  String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripTags = (value) =>
  decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeTitle = (title) =>
  normalizeWhitespace(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const titleCaseAcronyms = (title) =>
  title
    .replace(/\bLlms\b/g, "LLMs")
    .replace(/\bLlm\b/g, "LLM")
    .replace(/\bGui\b/g, "GUI")
    .replace(/\bIde\b/g, "IDE")
    .replace(/\bE2e\b/g, "E2E")
    .replace(/\bVs\b/g, "VS");

const authorToDisplayName = (rawAuthor) => {
  const cleaned = normalizeWhitespace(rawAuthor).replace(/,+$/, "");
  if (!cleaned.includes(",")) {
    return cleaned;
  }

  const [surname, givenNames] = cleaned.split(",", 2).map((part) => normalizeWhitespace(part));
  return normalizeWhitespace(`${givenNames} ${surname}`);
};

const unique = (values) => [...new Set(values)];

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "TommasoFulciniSiteSync/1.0",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const parseSearchResults = (html) => {
  const itemRegex =
    /<a class="list-group-item list-group-item-action" href="(?<href>[^"]+)">[\s\S]*?<h5 class="mb-1 text-secondary">(?<title>.*?)<\/h5>[\s\S]*?<p class="mb-1">(?<meta>.*?)<\/p>[\s\S]*?<\/a>/g;

  return [...html.matchAll(itemRegex)].map((match) => ({
    href: match.groups.href,
    title: stripTags(match.groups.title),
    meta: stripTags(match.groups.meta),
  }));
};

const parseMetaTags = (html) => {
  const metaTags = new Map();
  const metaRegex = /<meta name="([^"]+)" content="([^"]*)"[^>]*>/g;

  for (const match of html.matchAll(metaRegex)) {
    const name = match[1];
    const content = decodeHtml(match[2]);
    if (!metaTags.has(name)) {
      metaTags.set(name, []);
    }
    metaTags.get(name).push(content);
  }

  return metaTags;
};

const getFirstMeta = (metaTags, name) => metaTags.get(name)?.[0] ?? "";

const getYearFromMeta = (metaTags, bibliographicCitation) => {
  const issued = getFirstMeta(metaTags, "DCTERMS.issued");
  const issuedYearMatch = issued.match(/^(\d{4})/);
  if (issuedYearMatch && issuedYearMatch[1] !== "9999") {
    return Number(issuedYearMatch[1]);
  }

  const citationYears = [...String(bibliographicCitation).matchAll(/\b(20\d{2})\b/g)].map((match) =>
    Number(match[1])
  );
  if (citationYears.length > 0) {
    return Math.max(...citationYears);
  }

  return new Date().getUTCFullYear();
};

const extractEventName = (bibliographicCitation) => {
  const parentheticalMatches = [...String(bibliographicCitation).matchAll(/\(([^()]*)\)/g)];
  const candidate = parentheticalMatches.at(-1)?.[1]?.trim();
  if (!candidate) {
    return "";
  }

  return normalizeWhitespace(
    candidate
      .replace(
        /\s+[A-Z][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’.-]+)*\s+\([A-Z]{2,3}\)\s+.*$/,
        ""
      )
      .replace(/\s+[A-Z][A-Za-zÀ-ÿ'’.-]+(?:\s+[a-z][A-Za-zÀ-ÿ'’.-]+)*,\s+[A-Z][A-Za-zÀ-ÿ'’.-]+\s+\d.*$/, "")
  );
};

const deriveMetaLabel = (metaTags, bibliographicCitation) => {
  const typeValues = metaTags.get("DC.type") ?? [];
  const lowerTypes = typeValues.map((value) => value.toLowerCase());
  const journalTitle = getFirstMeta(metaTags, "citation_journal_title");
  const publisher = getFirstMeta(metaTags, "citation_publisher");
  const isInPress =
    getFirstMeta(metaTags, "DCTERMS.issued").startsWith("9999") ||
    /in corso di stampa/i.test(bibliographicCitation);

  if (lowerTypes.some((value) => value.includes("doctoral thesis"))) {
    return `Doctoral thesis · ${publisher || "Politecnico di Torino"}`;
  }

  if (lowerTypes.some((value) => value.includes("report"))) {
    return "Report · IRIS import";
  }

  if (journalTitle) {
    return `${isInPress ? "In press" : "Journal"} · ${journalTitle}`;
  }

  if (lowerTypes.some((value) => value.includes("conferenceobject"))) {
    const eventName = extractEventName(bibliographicCitation);
    const bucket = /\bworkshop\b/i.test(eventName) ? "Workshop" : "Conference";
    return `${bucket} · ${eventName || "IRIS import"}`;
  }

  return `${isInPress ? "In press" : "Publication"} · ${publisher || "IRIS import"}`;
};

const makeCitationKey = (authors, year, title) => {
  const firstAuthorSurname = normalizeWhitespace(authors[0] ?? "fulcini")
    .split(" ")
    .at(-1)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const titleTokens = normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length > 2)
    .slice(0, 3);

  return `${firstAuthorSurname}${year}${titleTokens.join("") || "publication"}`;
};

const escapeBibtexValue = (value) =>
  String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");

const buildBibtex = ({ key, entryType, authors, title, year, metaLabel, venue, doi, pages, publisher }) => {
  const lines = [`@${entryType}{${key},`];
  lines.push(`  author = {${authors.join(" and ")}},`);
  lines.push(`  title = {${escapeBibtexValue(title)}},`);

  if (entryType === "article" && venue) {
    lines.push(`  journal = {${escapeBibtexValue(venue)}},`);
  } else if (entryType === "phdthesis" && publisher) {
    lines.push(`  school = {${escapeBibtexValue(publisher)}},`);
  } else if (entryType === "misc") {
    if (publisher) {
      lines.push(`  publisher = {${escapeBibtexValue(publisher)}},`);
    }
  } else if (venue) {
    lines.push(`  booktitle = {${escapeBibtexValue(venue)}},`);
  }

  lines.push(`  year = {${year}},`);

  if (/^In press\b/.test(metaLabel)) {
    lines.push("  note = {In press},");
  }

  if (pages) {
    lines.push(`  pages = {${escapeBibtexValue(pages)}},`);
  }

  if (doi) {
    lines.push(`  doi = {${escapeBibtexValue(doi)}},`);
  }

  const lastLineIndex = lines.length - 1;
  lines[lastLineIndex] = lines[lastLineIndex].replace(/,$/, "");
  lines.push("}");
  return lines.join("\n");
};

const classifyEntry = (metaTags) => {
  const typeValues = metaTags.get("DC.type") ?? [];
  const lowerTypes = typeValues.map((value) => value.toLowerCase());
  const journalTitle = getFirstMeta(metaTags, "citation_journal_title");

  if (lowerTypes.some((value) => value.includes("doctoral thesis"))) {
    return "phdthesis";
  }

  if (journalTitle) {
    return "article";
  }

  if (lowerTypes.some((value) => value.includes("report"))) {
    return "misc";
  }

  return "inproceedings";
};

const buildPublicationEntry = async (result) => {
  const sourceUrl = new URL(result.href, "https://iris.polito.it").toString();
  const html = await fetchText(sourceUrl);
  const metaTags = parseMetaTags(html);
  const bibliographicCitation = getFirstMeta(metaTags, "DCTERMS.bibliographicCitation");
  const authors = unique((metaTags.get("citation_author") ?? []).map(authorToDisplayName)).filter(Boolean);
  const title = titleCaseAcronyms(getFirstMeta(metaTags, "DC.title") || result.title);
  const year = getYearFromMeta(metaTags, bibliographicCitation);
  const meta = deriveMetaLabel(metaTags, bibliographicCitation);
  const entryType = classifyEntry(metaTags);
  const key = makeCitationKey(authors, year, title);
  const doi = getFirstMeta(metaTags, "citation_doi");
  const pages = (() => {
    const firstPage = getFirstMeta(metaTags, "citation_firstpage");
    const lastPage = getFirstMeta(metaTags, "citation_lastpage");
    if (firstPage && lastPage && firstPage !== lastPage) {
      return `${firstPage}--${lastPage}`;
    }
    return "";
  })();
  const venue = getFirstMeta(metaTags, "citation_journal_title") || extractEventName(bibliographicCitation);
  const publisher = getFirstMeta(metaTags, "citation_publisher");

  return {
    key,
    year,
    meta,
    title,
    authors,
    irisHandle: result.href,
    sourceUrl,
    bibtex: buildBibtex({
      key,
      entryType,
      authors,
      title,
      year,
      metaLabel: meta,
      venue,
      doi,
      pages,
      publisher,
    }),
  };
};

const serializeString = (value) => JSON.stringify(String(value));

const serializeAuthors = (authors) => {
  if (authors.length <= 2) {
    return `[${authors.map(serializeString).join(", ")}]`;
  }

  return `[\n${authors.map((author) => `      ${serializeString(author)}`).join(",\n")}\n    ]`;
};

const serializePublication = (publication) => {
  const lines = [
    "  {",
    `    key: ${serializeString(publication.key)},`,
    `    year: ${publication.year},`,
    `    meta: ${serializeString(publication.meta)},`,
    `    title: ${serializeString(publication.title)},`,
    `    authors: ${serializeAuthors(publication.authors)},`,
  ];

  if (publication.irisHandle) {
    lines.push(`    irisHandle: ${serializeString(publication.irisHandle)},`);
  }

  if (publication.sourceUrl) {
    lines.push(`    sourceUrl: ${serializeString(publication.sourceUrl)},`);
  }

  lines.push(`    bibtex: \`${publication.bibtex}\``);
  lines.push("  }");
  return lines.join("\n");
};

const serializePublicationsData = (publications) =>
  `window.publicationsData = [\n${publications.map(serializePublication).join(",\n")}\n];\n`;

const dataPath = path.join(process.cwd(), "publications-data.js");
const rawData = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(rawData, sandbox);

const currentItems = Array.isArray(sandbox.window.publicationsData) ? sandbox.window.publicationsData : [];
const existingTitleKeys = new Set(currentItems.map((item) => normalizeTitle(item.title)));

const searchHtml = await fetchText(IRIS_SEARCH_URL);
const irisResults = parseSearchResults(searchHtml);

if (irisResults.length === 0) {
  throw new Error("No publications were found in the IRIS search results.");
}

const newResults = irisResults.filter((result) => !existingTitleKeys.has(normalizeTitle(result.title)));

if (newResults.length === 0) {
  console.log(`IRIS sync complete: no new publications found. Current dataset size: ${currentItems.length}.`);
  process.exit(0);
}

const importedEntries = [];
for (const result of newResults) {
  importedEntries.push(await buildPublicationEntry(result));
}

const mergedItems = [...currentItems, ...importedEntries].sort((left, right) => {
  if (right.year !== left.year) {
    return right.year - left.year;
  }

  return left.title.localeCompare(right.title, "en");
});

console.log(`IRIS sync found ${importedEntries.length} new publication(s):`);
for (const entry of importedEntries) {
  console.log(`- ${entry.year} | ${entry.title}`);
}

if (!DRY_RUN) {
  fs.writeFileSync(dataPath, serializePublicationsData(mergedItems), "utf8");
}
