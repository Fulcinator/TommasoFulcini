import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN ?? "";

const event = eventPath ? JSON.parse(fs.readFileSync(eventPath, "utf8")) : {};

const extractSections = (body) => {
  const normalized = (body ?? "").replace(/\r/g, "");
  const sections = {};
  const lines = normalized.split("\n");
  let currentLabel = null;
  let buffer = [];

  const flushCurrentSection = () => {
    if (!currentLabel) {
      return;
    }

    sections[currentLabel] = buffer.join("\n").trim();
  };

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.+?)\s*$/);
    if (headingMatch) {
      flushCurrentSection();
      currentLabel = headingMatch[1].trim();
      buffer = [];
      continue;
    }

    const boldLabelMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldLabelMatch) {
      flushCurrentSection();
      currentLabel = boldLabelMatch[1].trim();
      buffer = [];
      continue;
    }

    if (currentLabel) {
      buffer.push(line);
    }
  }

  flushCurrentSection();
  return sections;
};

const cleanField = (value) => {
  if (!value) {
    return "";
  }

  const cleaned = value.replace(/\r/g, "").trim();
  if (cleaned === "_No response_" || cleaned === "*No response*") {
    return "";
  }

  if (/^```(?:[\w-]+)?\s*```$/s.test(cleaned)) {
    return "";
  }

  return cleaned.replace(/\n+/g, " ").trim();
};

const parseIssueToNewsItem = (issue) => {
  const sections = extractSections(issue.body ?? "");
  const status = cleanField(sections.Status);
  const date = cleanField(sections.Date);
  const type = cleanField(sections.Type);
  const title = cleanField(sections.Title);
  const details = cleanField(sections.Details);
  const link = cleanField(sections.Link);
  const linkLabel = cleanField(sections["Link label"]);
  const slides = cleanField(sections.Slides);
  const hasNewsLabel = Array.isArray(issue.labels)
    ? issue.labels.some((label) => label.name === "news")
    : false;

  if (issue.state !== "open" || !hasNewsLabel || status !== "Published") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid or missing news date in issue #${issue.number}: "${date}"`);
  }

  if (!type) {
    throw new Error(`Missing news type in issue #${issue.number}.`);
  }

  if (!title) {
    throw new Error(`Missing news title in issue #${issue.number}.`);
  }

  const nextItem = {
    issueNumber: issue.number,
    date,
    type,
    title,
    details,
    link,
    linkLabel,
    slides,
    sourceIssueUrl: issue.html_url,
  };

  if (!nextItem.details) {
    delete nextItem.details;
  }

  if (!nextItem.link) {
    delete nextItem.link;
    delete nextItem.linkLabel;
  } else if (!nextItem.linkLabel) {
    nextItem.linkLabel = "More";
  }

  if (!nextItem.slides) {
    delete nextItem.slides;
  }

  return nextItem;
};

const fetchIssuesPage = async (page) => {
  if (!repository) {
    return null;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TommasoFulciniSiteSync/1.0",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues?state=open&labels=news&per_page=100&page=${page}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const listNewsIssues = async () => {
  if (!repository) {
    const fallbackIssue = event.issue;
    if (!fallbackIssue) {
      throw new Error("No repository context or issue payload available.");
    }
    return [fallbackIssue];
  }

  const issues = [];
  let page = 1;
  while (true) {
    const batch = await fetchIssuesPage(page);
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    issues.push(...batch.filter((item) => !item.pull_request));
    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return issues;
};

const dataPath = path.join(process.cwd(), "news-data.js");
const rawData = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(rawData, sandbox);

const issues = await listNewsIssues();
const mergedItems = issues
  .map(parseIssueToNewsItem)
  .filter(Boolean)
  .sort((left, right) => {
    const dateDiff = new Date(right.date) - new Date(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return (right.issueNumber ?? 0) - (left.issueNumber ?? 0);
  });

const serialized = `window.newsItems = ${JSON.stringify(mergedItems, null, 2)};\n`;
fs.writeFileSync(dataPath, serialized, "utf8");

console.log(`Rebuilt news-data.js from ${issues.length} open news issue(s); published entries: ${mergedItems.length}.`);
