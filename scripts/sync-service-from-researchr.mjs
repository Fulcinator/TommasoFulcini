import fs from "node:fs";
import path from "node:path";

const PROFILE_URL = "https://conf.researchr.org/profile/tommasofulcini";
const OUTPUT_PATH = path.join(process.cwd(), "service-data.json");
const LOCAL_HTML_PATH = process.env.SERVICE_RESEARCHR_HTML_PATH;
const SYNC_DATE = process.env.SERVICE_SYNC_DATE ?? new Date().toISOString().slice(0, 10);

const trackTranslations = {
  "Research Papers": { it: "Articoli di ricerca", en: "Research Papers" },
  "Research Track": { it: "Track di ricerca", en: "Research Track" },
  "Integrated Development Environments": {
    it: "Ambienti di sviluppo integrati",
    en: "Integrated Development Environments",
  },
};

const decodeHtml = (value) => {
  let decoded = String(value ?? "");

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const next = decoded
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");

    if (next === decoded) {
      break;
    }

    decoded = next;
  }

  return decoded;
};

const stripTags = (value) => decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "));
const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const slugify = (value) =>
  normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const localizeTrack = (track) => {
  const normalized = normalizeWhitespace(track);
  const mapped = trackTranslations[normalized];
  if (mapped) {
    return mapped;
  }

  return {
    it: normalized,
    en: normalized,
  };
};

const fetchProfileHtml = async () => {
  if (LOCAL_HTML_PATH) {
    return fs.readFileSync(LOCAL_HTML_PATH, "utf8");
  }

  const response = await fetch(PROFILE_URL, {
    headers: {
      "user-agent": "TommasoFulciniServiceSync/1.0",
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${PROFILE_URL}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const buildLocalizedTitle = (venue, year, track) => {
  if (!track) {
    return {
      it: `${venue} ${year}`,
      en: `${venue} ${year}`,
    };
  }

  const localizedTrack = localizeTrack(track);
  const lowerVenue = venue.toLowerCase();
  const lowerTrack = track.toLowerCase();

  if (lowerTrack === lowerVenue || lowerTrack === `${lowerVenue} ${year}`) {
    return {
      it: track,
      en: track,
    };
  }

  return {
    it: `${venue} ${year} · ${localizedTrack.it}`,
    en: `${venue} ${year} · ${localizedTrack.en}`,
  };
};

const determineRoleType = (text) => {
  if (/(Committee Member|PC Member) in Program Committee/i.test(text)) {
    return "program_committee";
  }

  if (/Committee Member in Organizing Committee/i.test(text)) {
    return "organizing_committee";
  }

  return "";
};

const extractTrack = (text) => {
  const match = text.match(/within the (.+?)-track$/i);
  return normalizeWhitespace(match?.[1] ?? "");
};

const parseServiceItems = (html) => {
  const timelineMatch = html.match(/<div id="contributions-timeline">([\s\S]*?)<div id="embedWidget"/i);
  if (!timelineMatch) {
    throw new Error("Could not locate the contributions timeline in the researchr profile.");
  }

  const timelineHtml = timelineMatch[1];
  const items = [];

  for (const yearMatch of timelineHtml.matchAll(/<div class="contribution-year"><h3>(\d{4})<\/h3>([\s\S]*?)(?=<div class="contribution-year">|$)/gi)) {
    const year = Number.parseInt(yearMatch[1], 10);
    const yearContent = yearMatch[2];

    for (const venueMatch of yearContent.matchAll(/<div><h4>(.*?)<\/h4><ul class="block">([\s\S]*?)<\/ul><\/div>/gi)) {
      const venue = normalizeWhitespace(stripTags(venueMatch[1]));
      const listHtml = venueMatch[2];

      for (const itemMatch of listHtml.matchAll(/<li>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/li>/gi)) {
        const url = decodeHtml(itemMatch[1]);
        const rawText = normalizeWhitespace(stripTags(itemMatch[2]));
        const roleType = determineRoleType(rawText);

        if (!roleType) {
          continue;
        }

        const track = extractTrack(rawText);
        const title = buildLocalizedTitle(venue, year, track);

        items.push({
          id: `${year}-${slugify(venue)}-${slugify(roleType)}-${slugify(track || venue)}`,
          year,
          title,
          roleType,
          url,
          source: "researchr",
        });
      }
    }
  }

  return items.sort((left, right) => {
    if (right.year !== left.year) {
      return right.year - left.year;
    }

    return left.title.en.localeCompare(right.title.en, "en");
  });
};

const payload = {
  updatedAt: SYNC_DATE,
  sources: [
    {
      id: "researchr",
      label: "conf.researchr general profile",
      url: PROFILE_URL,
    },
  ],
  items: parseServiceItems(await fetchProfileHtml()),
};

if (payload.items.length === 0) {
  throw new Error("Service sync produced an empty dataset.");
}

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Service sync complete: wrote ${payload.items.length} item(s) to service-data.json.`);
