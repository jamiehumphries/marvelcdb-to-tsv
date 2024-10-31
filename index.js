import fs from "fs";
import _ from "lodash";
import path from "path";

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

const packs = fs.readdirSync("./data/pack", { withFileTypes: true });
const allCards = packs.flatMap((file) => {
  const filepath = path.resolve(file.parentPath, file.name);
  return readJson(filepath);
});

function readJson(filepath) {
  const content = fs.readFileSync(filepath);
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
      excludedSets.includes(card.set_code)
  )
  .uniqBy("octgn_id")
  .concat(getCampaignCards(allCards))
  .sortBy("code")
  .value();

const cardData = cards.map((card) => {
  const id = card.octgn_id;
  const name = getName(card);
  const unique = card.is_unique ? UNIQUE : "";
  const faction = getFactionName(card);
  const cost = getCost(card);
  const type = getTypeName(card);
  const resources = getResourceColumns(card);
  const traits = (card.traits || "").toUpperCase();
  return [id, name, unique, faction, cost, type, ...resources, traits];
});

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
  const type = (emoji, count = 0) => Array(count).fill(emoji);
  return [
    ...type("⚡", card.resource_energy),
    ...type("🧪", card.resource_mental),
    ...type("👊🏾", card.resource_physical),
    ...type("✨", card.resource_wild),
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

const rows = cardData.map((row) => row.join("\t").trimEnd());
const tsv = rows.join("\n") + "\n";
fs.writeFileSync("cards.tsv", tsv);
