import fs from "node:fs";
import path from "node:path";

const POLITO_PROFILE_URL = "https://www.polito.it/personale?p=tommaso.fulcini";
const UPO_PROFILE_URL = "https://upobook.uniupo.it/tommaso.fulcini";
const OUTPUT_PATH = path.join(process.cwd(), "teaching-data.json");
const OVERRIDES_PATH = path.join(process.cwd(), "teaching-overrides.json");
const SYNC_SOURCE_IDS = new Set(["polito", "uniupo"]);

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

const translationMaps = {
  institutions: {
    "Politecnico di Torino": { it: "Politecnico di Torino", en: "Politecnico di Torino" },
    "Universita del Piemonte Orientale": {
      it: "Universita del Piemonte Orientale",
      en: "University of Eastern Piedmont",
    },
  },
  programs: {
    "INGEGNERIA GESTIONALE": { it: "Ingegneria gestionale", en: "Management Engineering" },
    "INGEGNERIA INFORMATICA": { it: "Ingegneria informatica", en: "Computer Engineering" },
    "INGEGNERIA INFORMATICA (COMPUTER ENGINEERING)": {
      it: "Ingegneria informatica",
      en: "Computer Engineering",
    },
    "INGEGNERIA INFORMATICA E DEI SISTEMI": {
      it: "Ingegneria informatica e dei sistemi",
      en: "Computer and Systems Engineering",
    },
  },
  departments: {
    "Dipartimento di Scienze e Innovazione Tecnologica": {
      it: "Dipartimento di Scienze e Innovazione Tecnologica",
      en: "Department of Science and Technological Innovation",
    },
  },
  courseTitles: {
    "Information systems": { it: "Sistemi informativi", en: "Information Systems" },
    "Software Engineering I": { it: "Ingegneria del software I", en: "Software Engineering I" },
    "Software engineering": { it: "Ingegneria del software", en: "Software Engineering" },
    "Ingegneria del software": { it: "Ingegneria del software", en: "Software Engineering" },
    "Sistemi informativi aziendali": { it: "Sistemi informativi aziendali", en: "Business Information Systems" },
    "Programmazione a oggetti": { it: "Programmazione a oggetti", en: "Object-Oriented Programming" },
    "ARCHITETTURE COMPUTAZIONALI, RETI E SICUREZZA - VERCELLI": {
      it: "Architetture computazionali, reti e sicurezza - Vercelli",
      en: "Computational Architectures, Networks and Security - Vercelli",
    },
    "Reading, Writing & Understanding Scientific Peer Reviews for ICT": {
      it: "Reading, Writing & Understanding Scientific Peer Reviews for ICT",
      en: "Reading, Writing & Understanding Scientific Peer Reviews for ICT",
    },
  },
};

const toLocalizedValue = (value, dictionary) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return undefined;
  }

  const mapped = dictionary[normalized];
  if (mapped) {
    return mapped;
  }

  return {
    it: normalized,
    en: normalized,
  };
};

const slugify = (value) =>
  normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeAcademicYear = (value) => {
  const match = String(value ?? "").match(/(\d{4})\s*\/\s*(\d{2,4})/);
  if (!match) {
    return normalizeWhitespace(value);
  }

  const startYear = match[1];
  const rawEndYear = match[2];
  const endYear = rawEndYear.length === 4 ? rawEndYear.slice(2) : rawEndYear;
  return `${startYear}/${endYear}`;
};

const yearStartFromAcademicYear = (value) => {
  const match = String(value ?? "").match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "TommasoFulciniTeachingSync/1.0",
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const mapPolitoLevel = (heading) => {
  const normalized = slugify(stripTags(heading));
  if (normalized.includes("dottorato-di-ricerca")) {
    return "phd";
  }
  if (normalized.includes("corso-di-laurea-magistrale")) {
    return "msc";
  }
  if (normalized.includes("corso-di-laurea-di-1-livello")) {
    return "bsc";
  }
  return "";
};

const parsePolito = (html) => {
  const didatticaSectionMatch = html.match(
    /<h2><a name="didattica">Didattica<\/a><\/h2>([\s\S]*?)<section class="sezione">\s*<h2><a name="ricerca">/i
  );

  if (!didatticaSectionMatch) {
    throw new Error("Could not locate the Didattica section in the Polito profile.");
  }

  const didatticaSection = didatticaSectionMatch[1];
  const items = [];

  for (const categoryMatch of didatticaSection.matchAll(/<h4>(.*?)<\/h4>\s*<ul class="solo-correnti">([\s\S]*?)<\/ul>/gi)) {
    const level = mapPolitoLevel(categoryMatch[1]);
    const listHtml = categoryMatch[2];
    const itemRegex =
      /<li class="[^"]+">\s*<a href="(?<href>[^"]+)">(?<title>.*?)<\/a>\.\s*A\.A\.\s*(?<academicYear>\d{4}\/\d{2}),\s*(?<program>.*?)\.\s*<em>(?<role>.*?)<\/em>/gi;

    for (const courseMatch of listHtml.matchAll(itemRegex)) {
      const courseTitle = normalizeWhitespace(stripTags(courseMatch.groups.title));
      const academicYear = normalizeAcademicYear(courseMatch.groups.academicYear);
      const program = normalizeWhitespace(stripTags(courseMatch.groups.program));
      const role = normalizeWhitespace(stripTags(courseMatch.groups.role));
      const url = new URL(decodeHtml(courseMatch.groups.href), POLITO_PROFILE_URL).toString();
      const yearStart = yearStartFromAcademicYear(academicYear);

      items.push({
        id: `polito-${yearStart}-${slugify(courseTitle)}`,
        academicYear,
        yearStart,
        institution: toLocalizedValue("Politecnico di Torino", translationMaps.institutions),
        level,
        courseTitle: toLocalizedValue(courseTitle, translationMaps.courseTitles),
        program: toLocalizedValue(program, translationMaps.programs),
        role,
        url,
        source: "polito",
      });
    }
  }

  return items;
};

const parseUniupo = (html) => {
  const roleMatch = html.match(/font-yellow-casablanca">Ruolo\s*<\/span>[\s\S]*?<a[^>]*>\s*(.*?)\s*<\/a>/i);
  const profileRole = normalizeWhitespace(stripTags(roleMatch?.[1] ?? "")).replace(
    /^Professori a contratto$/i,
    "Professore a contratto"
  );

  const didatticaSectionMatch = html.match(
    /<div class="portlet light" id="portlet-didattica">([\s\S]*?)<!-- END PORTLET Didattica -->/i
  );

  if (!didatticaSectionMatch) {
    throw new Error("Could not locate the Didattica section in the UPO profile.");
  }

  const didatticaSection = didatticaSectionMatch[1];
  const paneRegex =
    /<div class="tab-pane[^>]*id="(?<paneId>tab_didattica_[^"]+)"[^>]*>(?<content>[\s\S]*?)(?=<div class="tab-pane|\s*<\/div>\s*<div class="clearfix margin-bottom-20">)/gi;
  const items = [];

  for (const paneMatch of didatticaSection.matchAll(paneRegex)) {
    const paneContent = paneMatch.groups.content;
    const academicYearMatch = paneContent.match(/A\.\s*A\.\s*(\d{4})\s*\/\s*(\d{4})/i);
    if (!academicYearMatch) {
      continue;
    }

    const academicYear = normalizeAcademicYear(`${academicYearMatch[1]}/${academicYearMatch[2]}`);
    const yearStart = yearStartFromAcademicYear(academicYear);
    const semesterMatch = paneContent.match(/<div class="font-red-haze[^"]*">\s*(.*?)\s*<\/div>/i);
    const semesterLabel = normalizeWhitespace(stripTags(semesterMatch?.[1] ?? ""));
    const semester = /secondo semestre/i.test(semesterLabel) ? "second" : "";

    const panelRegex =
      /<a class="accordion-toggle"[^>]*>\s*(?<title>.*?)\s*<\/a>[\s\S]*?<span class="font-yellow-casablanca">SSD:<\/span>\s*<span class="font-blue-madison">\s*(?<ssd>.*?)\s*<\/span>[\s\S]*?<span class="font-yellow-casablanca">CFU:<\/span>\s*<span class="font-blue-madison">\s*(?<credits>.*?)\s*<\/span>[\s\S]*?<span class="font-yellow-casablanca">Dipartimento:<\/span>\s*<span class="font-blue-madison">\s*(?<department>.*?)\s*<\/span>[\s\S]*?<a[^>]*href="(?<href>https:\/\/of\.uniupo\.it[^"]+)"[^>]*>\s*<i[^>]*><\/i>\s*Dettagli del corso\s*<\/a>/gi;

    for (const panelMatch of paneContent.matchAll(panelRegex)) {
      const courseTitle = normalizeWhitespace(stripTags(panelMatch.groups.title));
      const creditsValue = Number.parseFloat(normalizeWhitespace(stripTags(panelMatch.groups.credits)));
      const department = normalizeWhitespace(stripTags(panelMatch.groups.department));
      const url = decodeHtml(panelMatch.groups.href);

      items.push({
        id: `uniupo-${yearStart}-${slugify(courseTitle)}`,
        academicYear,
        yearStart,
        institution: toLocalizedValue("Universita del Piemonte Orientale", translationMaps.institutions),
        courseTitle: toLocalizedValue(courseTitle, translationMaps.courseTitles),
        role: profileRole || "Professore a contratto",
        semester,
        credits: Number.isFinite(creditsValue) ? creditsValue : undefined,
        department: toLocalizedValue(department, translationMaps.departments),
        url,
        source: "uniupo",
      });
    }
  }

  return items;
};

const dedupeItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = [
      item.institution,
      item.academicYear,
      item.courseTitle,
      item.program ?? "",
      item.role ?? "",
      item.url ?? "",
    ]
      .map((part) => slugify(part))
      .join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const sortItems = (items) =>
  [...items].sort((left, right) => {
    if (right.yearStart !== left.yearStart) {
      return right.yearStart - left.yearStart;
    }

    const leftInstitution = left.institution?.it ?? left.institution?.en ?? "";
    const rightInstitution = right.institution?.it ?? right.institution?.en ?? "";
    const institutionOrder = leftInstitution.localeCompare(rightInstitution, "it");
    if (institutionOrder !== 0) {
      return institutionOrder;
    }

    const leftTitle = left.courseTitle?.it ?? left.courseTitle?.en ?? "";
    const rightTitle = right.courseTitle?.it ?? right.courseTitle?.en ?? "";
    return leftTitle.localeCompare(rightTitle, "it");
  });

const readJsonFile = (filePath, fallbackValue = null) => {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${path.basename(filePath)}: ${error.message}`);
  }
};

const readExistingPayload = () => {
  return readJsonFile(OUTPUT_PATH, null);
};

const readOverridesPayload = () => {
  const payload = readJsonFile(OVERRIDES_PATH, { items: {}, manualItems: [] });
  return {
    items:
      payload?.items && typeof payload.items === "object" && !Array.isArray(payload.items)
        ? payload.items
        : {},
    manualItems: Array.isArray(payload?.manualItems) ? payload.manualItems : [],
  };
};

const extractLegacyOverrides = (existingPayload) => {
  const existingItems = Array.isArray(existingPayload?.items) ? existingPayload.items : [];
  return Object.fromEntries(
    existingItems
      .filter((item) => item && typeof item === "object" && typeof item.id === "string" && item.overrides)
      .map((item) => [item.id, item.overrides])
  );
};

const extractLegacyManualItems = (existingPayload) => {
  const existingItems = Array.isArray(existingPayload?.items) ? existingPayload.items : [];
  return existingItems.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      item.id &&
      !SYNC_SOURCE_IDS.has(item.source)
  );
};

const mergeOverrideMaps = (primaryOverrides, fallbackOverrides) => {
  return {
    ...fallbackOverrides,
    ...primaryOverrides,
  };
};

const mergeManualItems = (primaryManualItems, fallbackManualItems) => {
  const itemsById = new Map();

  [...fallbackManualItems, ...primaryManualItems].forEach((item) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id) {
      return;
    }

    itemsById.set(item.id, item);
  });

  return [...itemsById.values()];
};

const buildOverrideSources = (existingPayload, overridesPayload) => {
  const legacyOverrides = extractLegacyOverrides(existingPayload);
  const legacyManualItems = extractLegacyManualItems(existingPayload);

  return {
    itemOverrides: mergeOverrideMaps(overridesPayload.items, legacyOverrides),
    manualItems: mergeManualItems(overridesPayload.manualItems, legacyManualItems),
  };
};

const todayStamp = () => {
  return new Date().toISOString().slice(0, 10);
};

const applyItemOverrides = (item, overrides) => {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return item;
  }

  return {
    ...item,
    ...overrides,
    overrides,
  };
};

const mergeWithExistingItems = (syncedItems, overrideSources) => {
  const itemOverrides = overrideSources?.itemOverrides ?? {};
  const manualItems = Array.isArray(overrideSources?.manualItems) ? overrideSources.manualItems : [];

  const mergedSyncedItems = syncedItems.map((item) => applyItemOverrides(item, itemOverrides[item.id]));
  const manualItemsWithOverrides = manualItems.map((item) => applyItemOverrides(item, item.overrides));

  return sortItems([...mergedSyncedItems, ...manualItemsWithOverrides]);
};

const existingPayload = readExistingPayload();
const overridesPayload = readOverridesPayload();
const overrideSources = buildOverrideSources(existingPayload, overridesPayload);
const politoHtml = await fetchText(POLITO_PROFILE_URL);
const uniupoHtml = await fetchText(UPO_PROFILE_URL);

const syncedItems = sortItems(dedupeItems([...parsePolito(politoHtml), ...parseUniupo(uniupoHtml)]));

if (syncedItems.length === 0) {
  throw new Error("Teaching sync produced an empty dataset.");
}

const items = mergeWithExistingItems(syncedItems, overrideSources);

const payload = {
  updatedAt: todayStamp(),
  sources: [
    {
      id: "polito",
      label: "Politecnico di Torino profile",
      url: POLITO_PROFILE_URL,
    },
    {
      id: "uniupo",
      label: "UPOBook profile",
      url: UPO_PROFILE_URL,
    },
  ],
  items,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(
  `Teaching sync complete: merged ${syncedItems.length} synced item(s) into ${items.length} total teaching item(s).`
);
