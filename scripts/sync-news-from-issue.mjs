import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const eventPath = process.env.GITHUB_EVENT_PATH;

if (!eventPath) {
  throw new Error("GITHUB_EVENT_PATH is not available.");
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue;
const action = event.action;
const changedLabel = event.label?.name ?? "";

if (!issue) {
  throw new Error("No issue payload found in event.");
}

const extractSections = (body) => {
  const sections = {};
  const regex = /^###\s+(.+?)\r?\n([\s\S]*?)(?=^###\s+|\s*$)/gm;
  let match;

  while ((match = regex.exec(body)) !== null) {
    sections[match[1].trim()] = match[2].trim();
  }

  return sections;
};

const cleanField = (value) => {
  if (!value) {
    return "";
  }

  const cleaned = value.replace(/\r/g, "").trim();
  if (cleaned === "_No response_") {
    return "";
  }

  return cleaned.replace(/\n+/g, " ").trim();
};

const sections = extractSections(issue.body ?? "");
const status = cleanField(sections.Status);
const date = cleanField(sections.Date);
const type = cleanField(sections.Type);
const title = cleanField(sections.Title);
const details = cleanField(sections.Details);
const link = cleanField(sections.Link);
const linkLabel = cleanField(sections["Link label"]);

const hasNewsLabel = Array.isArray(issue.labels)
  ? issue.labels.some((label) => label.name === "news")
  : false;

const shouldRemove =
  issue.state === "closed" ||
  status !== "Published" ||
  (!hasNewsLabel && !(action === "labeled" && changedLabel === "news"));

const dataPath = path.join(process.cwd(), "news-data.js");
const rawData = fs.readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(rawData, sandbox);

const currentItems = Array.isArray(sandbox.window.newsItems) ? sandbox.window.newsItems : [];

const mergedItems = currentItems.filter((item) => item.issueNumber !== issue.number);

if (!shouldRemove) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid or missing news date: "${date}"`);
  }

  if (!type) {
    throw new Error("Missing news type.");
  }

  if (!title) {
    throw new Error("Missing news title.");
  }

  const nextItem = {
    issueNumber: issue.number,
    date,
    type,
    title,
    details,
    link,
    linkLabel,
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

  mergedItems.push(nextItem);
}

mergedItems.sort((left, right) => {
  const dateDiff = new Date(right.date) - new Date(left.date);
  if (dateDiff !== 0) {
    return dateDiff;
  }

  const rightIssue = right.issueNumber ?? 0;
  const leftIssue = left.issueNumber ?? 0;
  return rightIssue - leftIssue;
});

const serialized = `window.newsItems = ${JSON.stringify(mergedItems, null, 2)};\n`;
fs.writeFileSync(dataPath, serialized, "utf8");
