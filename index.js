import fs from "fs";
import _ from "lodash";

const ENERGY = "";
const MENTAL = "";
const PHYSICAL = "";
const WILD = "";
const UNIQUE = "";

const MAX_RESOURCES = 3;

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

const cardIdsMissingFromFullList = [
  // Hero for Hire captive allies
  "04097", // Moon Knight
  "04098", // Shang-Chi
  "04099", // White Tiger
  "04100", // Elektra
];

const request = new Request("https://marvelcdb.com/api/public/cards/");
const response = await fetch(request);
const text = await response.text();
const json = JSON.parse(text);

for (const id of cardIdsMissingFromFullList) {
  const request = new Request(`https://marvelcdb.com/api/public/card/${id}`);
  const response = await fetch(request);
  const text = await response.text();
  json.push(JSON.parse(text));
}

fs.writeFileSync("cards.json", JSON.stringify(json, null, 2));

const excludedSets = ["invocation", "weather"];
const excludedTypes = [
  "alter_ego",
  "attachment",
  "environment",
  "hero",
  "minion",
  "side_scheme",
  "treachery",
];

const campaignTypes = ["modular", "villain"];

const cardsWithCostX = ["Speed Cyclone", "Lethal Intent"];

const cards = _.uniqBy(json, "octgn_id").filter(
  (card) =>
    card.octgn_id !== undefined &&
    !excludedSets.includes(card.card_set_code) &&
    !excludedTypes.includes(card.type_code)
);

const cardData = cards.map((card) => {
  const id = card.octgn_id;
  const name = card.subname ? `${card.name} (${card.subname})` : card.name;
  const unique = card.is_unique ? UNIQUE : "";
  const className = campaignTypes.includes(card.card_set_type_name_code)
    ? "Campaign"
    : card.faction_name;
  const cost = cardsWithCostX.includes(card.name)
    ? "X"
    : card.cost === undefined
    ? "-"
    : card.cost;
  const type = card.type_name;
  const resources = getResourceColumns(card);
  const traits = (card.traits || "").toUpperCase();
  return [id, name, unique, className, cost, type, ...resources, traits];
});

function getResourceColumns(card) {
  const resources = getResources(card);
  if (resources.length > MAX_RESOURCES) {
    throw new Error(
      `Could not handle "${card.name}", which has ${resources.length} resources.`
    );
  }
  const filterColumn = getResourceFilterColumn(resources);
  const symbolColumns = getResourceSymbolColumns(resources);
  return filterColumn.concat(symbolColumns);
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

function getResourceFilterColumn(resources) {
  return [resources.join("")];
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
const tsv = rows.join("\n");
fs.writeFileSync("cards.tsv", tsv);
