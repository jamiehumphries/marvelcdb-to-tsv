import { readdirSync, readFileSync, writeFileSync } from "fs";
import _ from "lodash";
import { resolve } from "path";

import { getCampaignCards } from "./campaign-cards.js";

const MAX_RESOURCES = 3;

const ENERGY = "";
const MENTAL = "";
const PHYSICAL = "";
const WILD = "";
const UNIQUE = "";

const RESOURCE_SYMBOLS = {
  "⚡": ENERGY,
  "🧪": MENTAL,
  "👊🏾": PHYSICAL,
  "✨": WILD,
};

const resourceOrderSpecialCases = {
  // Shawarma
  "c9fe2c83-ea8b-479d-a5b2-da837f497576": ["👊🏾", "🧪", "⚡"],
};

const factions = readJson("./data/factions.json");
const types = readJson("./data/types.json");

const packs = readdirSync("./data/pack", { withFileTypes: true });
const allCards = packs.flatMap((file) => readJson(file.parentPath, file.name));

function readJson(...paths) {
  const fullPath = resolve(...paths);
  const content = readFileSync(fullPath);
  return JSON.parse(content);
}

for (const card of allCards) {
  if (card.back_link === undefined || card.back_card !== undefined) {
    continue;
  }
  const backCard = allCards.find(({ code }) => code === card.back_link);
  card.back_card = backCard;
  backCard.back_card = card;
}

const identityTypeCodes = ["alter_ego", "hero"];
const excludedFactions = ["campaign", "encounter"];
const excludedSets = ["invocation", "weather"];

const cards = _(allCards)
  .reject(
    (card) =>
      card.duplicate_of !== undefined ||
      identityTypeCodes.includes(card.type_code) ||
      identityTypeCodes.includes(card.back_card?.type_code) ||
      excludedFactions.includes(card.faction_code) ||
      excludedSets.includes(card.set_code) ||
      card.text?.startsWith("Linked")
  )
  .uniqBy("octgn_id")
  .concat(getCampaignCards(allCards))
  .sortBy("code")
  .value();

const cardData = cards.map((card) => [
  getId(card),
  getName(card),
  getUniqueness(card),
  getFactionName(card),
  getCost(card),
  getTypeName(card),
  ...getResourceColumns(card),
  getTraits(card),
]);

function getId(card) {
  return card.octgn_id;
}

function getName(card) {
  if (
    card.faction_code === "hero" &&
    card.back_card !== undefined &&
    card.name !== card.back_card.name
  ) {
    return `${card.name} / ${card.back_card.name}`;
  }
  return card.subname ? `${card.name} (${card.subname})` : card.name;
}

function getUniqueness(card) {
  return card.is_unique ? UNIQUE : "";
}

function getFactionName(card) {
  const code = excludedFactions.includes(card.faction_code)
    ? "campaign"
    : card.faction_code;
  return lookupName(code, factions);
}

function getCost(card) {
  switch (card.cost) {
    case -1:
      return "X";
    case undefined:
      return "-";
    default:
      return card.cost.toString();
  }
}

function getTypeName(card) {
  return lookupName(card.type_code, types);
}

function lookupName(code, lookup) {
  return lookup.find((entry) => entry.code === code).name;
}

function getResourceColumns(card) {
  const resources = getResources(card);
  if (resources.length > MAX_RESOURCES) {
    throw new Error(
      `Could not handle "${card.name}", which has ${resources.length} resources.`
    );
  }
  const filterColumn = resources.join("");
  const symbolColumns = getResourceSymbolColumns(resources);
  return [filterColumn, ...symbolColumns];
}

function getResources(card) {
  const specialCase = resourceOrderSpecialCases[card.octgn_id];
  if (specialCase) {
    return specialCase;
  }
  const repeat = (emoji, count = 0) => Array(count).fill(emoji);
  return [
    ...repeat("⚡", card.resource_energy),
    ...repeat("🧪", card.resource_mental),
    ...repeat("👊🏾", card.resource_physical),
    ...repeat("✨", card.resource_wild),
  ];
}

function getResourceSymbolColumns(resources) {
  // Symbol columns should be laid out as:
  // 0 resources | | | | | |
  // 1 resource  | | |#| | |
  // 2 resources | |#| |#| |
  // 3 resources |#| |#| |#|

  const symbols = resources.map((resource) => RESOURCE_SYMBOLS[resource]);
  const columns = symbols.join("||").split("|");

  const numberOfColumns = MAX_RESOURCES * 2 - 1;
  while (columns.length < numberOfColumns) {
    columns.unshift("");
    columns.push("");
  }

  return columns;
}

function getTraits(card) {
  return card.traits?.toUpperCase() || "";
}

const tsvRows = cardData.map((row) => row.join("\t").trimEnd());
const tsv = tsvRows.join("\n") + "\n";
writeFileSync("cards.tsv", tsv);
