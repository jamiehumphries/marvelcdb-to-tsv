import fs from "fs";
import _ from "lodash";
import path from "path";

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

let allCards = [];
const packsDirectory = "./data/pack";
for (const filename of fs.readdirSync(packsDirectory)) {
  const filepath = path.resolve(packsDirectory, filename);
  allCards = allCards.concat(readJson(filepath));
}

function readJson(filepath) {
  const content = fs.readFileSync(filepath);
  return JSON.parse(content);
}

fs.writeFileSync("cards.json", JSON.stringify(json, null, 2));

const excludedTypes = [
  "alter_ego",
  "attachment",
  "environment",
  "hero",
  "main_scheme",
  "minion",
  "side_scheme",
  "treachery",
  "villain",
];

const excludedSets = ["invocation", "weather"];

const excludedCards = [
  // Rise of the Red Skull
  "f4523729-9345-4631-9eb1-336792215768", // Zola's Algorithm
  "1eae5e27-e2c0-4744-812d-8e71238f3c90", // Medical Emergency
  "c6cbf34a-889e-4f70-919f-a21e691b4efa", // Martial Law
  "74c5f483-6f2a-4215-bcd6-4dea93cf8e3f", // Anti-Hero Propaganda
  // Galaxy's Most Wanted
  "9605100e-7f01-436a-85aa-4788d53aff5e", // Milano
  // The Mad Titan's Shadow
  "fe77df83-8a7b-4276-a731-a0a86432cdd9", // Lady Sif
  "5dc03f9b-b1d3-49a6-9f00-7ea867084676", // Fandral
  "8b9a9fd3-e243-4443-969f-eb5769874bb5", // Hogan
  "c66be24b-5558-45b2-9c9a-f0cfc883dcd4", // Volstagg
  // SP//dr
  "5b7da011-412e-452a-9edd-24618a031001", // SP//dr Suit
  "5b7da011-412e-452a-9edd-24618a031002", // SP//dr
  // Mutant Genesis
  "47d34c5d-5319-45a9-a2d6-1fb975032066", // Robert Kelly
  "47d34c5d-5319-45a9-a2d6-1fb975032171", // Metro P.D.
  "47d34c5d-5319-45a9-a2d6-1fb975032172", // Magneto
  "47d34c5d-5319-45a9-a2d6-1fb975032174", // Reactive Defenses
  // NeXt Evolution
  "104e1218-df9b-43f7-93e0-ca2ef9040079", // Morlock
  "104e1218-df9b-43f7-93e0-ca2ef9040130", // Hope Summers
  "104e1218-df9b-43f7-93e0-ca2ef9040196", // Pouches
  "104e1218-df9b-43f7-93e0-ca2ef9040197", // Safehouse
  // Age of Apocalypse
  "1ab538aa-6ad1-4d9d-83a6-3ebc3a045171", // Mission Team
];

const cards = _(allCards)
  .reject(
    (card) =>
      card.duplicate_of !== undefined ||
      excludedTypes.includes(card.type_code) ||
      excludedSets.includes(card.set_code) ||
      excludedCards.includes(card.octgn_id) ||
      (card.type_code === "obligation" && card.faction_code !== "campaign")
  )
  .uniqBy("octgn_id")
  .sortBy("code")
  .value();

const cardData = cards.map((card) => {
  const id = card.octgn_id;
  const name = card.subname ? `${card.name} (${card.subname})` : card.name;
  const unique = card.is_unique ? UNIQUE : "";
  const faction = getFactionName(card);
  const cost = getCost(card);
  const type = getTypeName(card);
  const resources = getResourceColumns(card);
  const traits = (card.traits || "").toUpperCase();
  return [id, name, unique, faction, cost, type, ...resources, traits];
});

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

function getFactionName(card) {
  const originalCode = card.faction_code;
  const codeToUse = originalCode === "encounter" ? "campaign" : originalCode;
  return getName(codeToUse, factions);
}

function getTypeName(card) {
  return getName(card.type_code, types);
}

function getName(code, lookup) {
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

  const columns = resources.flatMap((resource, i) => {
    const symbol = RESOURCE_SYMBOLS[resource];
    return i === 0 ? [symbol] : ["", symbol];
  });

  const numberOfColumns = MAX_RESOURCES * 2 - 1;
  while (columns.length < numberOfColumns) {
    if (columns.length % 2 === 1) {
      columns.push("");
    } else {
      columns.unshift("");
    }
  }

  return columns;
}

const rows = cardData.map((row) => row.join("\t").trimEnd());
const tsv = rows.join("\n") + "\n";
fs.writeFileSync("cards.tsv", tsv);
