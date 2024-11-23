import { readdirSync, readFileSync, writeFileSync } from "fs";
import _ from "lodash";
import { resolve } from "path";

import { getCampaignCards } from "./campaign-cards.js";

const MAX_RESOURCES = 3;

// Install the bundled marvel-icons.ttf font file to see these icons
const ENERGY = "";
const MENTAL = "";
const PHYSICAL = "";
const WILD = "";
const UNIQUE = "";

// Use emoji instead of "" for simplicity
const PER_HERO = "👤";

const RESOURCE_FILTER_EMOJI = Object.fromEntries([
  [ENERGY, "⚡"],
  [MENTAL, "🧪"],
  [PHYSICAL, "👊🏾"],
  [WILD, "✨"],
]);

const resourceOrderSpecialCases = {
  // Shawarma
  21183: [PHYSICAL, MENTAL, ENERGY],
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

const excludedFactionCodes = new Set(
  factions
    .filter((faction) => !faction.is_primary && faction.code !== "hero")
    .map((faction) => faction.code)
);

const heroSetCodes = new Set(
  allCards
    .filter((card) => card.type_code === "hero")
    .map((card) => card.set_code)
);

const cards = _(allCards)
  .reject(
    (card) =>
      card.hidden ||
      card.duplicate_of !== undefined ||
      card.deck_limit === undefined ||
      card.type_code === "hero" ||
      excludedFactionCodes.has(card.faction_code) ||
      // e.g. Doctor Strange's Invocation cards
      (card.faction_code === "hero" && !heroSetCodes.has(card.set_code))
  )
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
  const code = card.is_campaign ? "campaign" : card.faction_code;
  return lookupName(code, factions);
}

function getCost(card) {
  switch (card.cost) {
    case -1:
      return "X";
    case undefined:
      return "-";
    default:
      return card.cost.toString() + (card.cost_per_hero ? PER_HERO : "");
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
  const filterColumn = getResourceFilterColumn(resources);
  const symbolColumns = getResourceSymbolColumns(resources);
  return [filterColumn, ...symbolColumns];
}

function getResources(card) {
  const specialCase = resourceOrderSpecialCases[card.code];
  if (specialCase) {
    return specialCase;
  }
  const repeat = (symbol, count = 0) => Array(count).fill(symbol);
  return [
    ...repeat(ENERGY, card.resource_energy),
    ...repeat(MENTAL, card.resource_mental),
    ...repeat(PHYSICAL, card.resource_physical),
    ...repeat(WILD, card.resource_wild),
  ];
}

function getResourceFilterColumn(resources) {
  return resources.map((resource) => RESOURCE_FILTER_EMOJI[resource]).join("");
}

function getResourceSymbolColumns(resources) {
  // 0 resources | | | | | |
  // 1 resource  | | |#| | |
  // 2 resources | |#| |#| |
  // 3 resources |#| |#| |#|

  const columns = resources.join("||").split("|");

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
