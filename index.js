import fs from "fs";
import _ from "lodash";
import path from "path";

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

const FACTION_NAMES = {
  hero: "Hero",
  aggression: "Aggression",
  justice: "Justice",
  leadership: "Leadership",
  protection: "Protection",
  pool: "'Pool",
  basic: "Basic",
  campaign: "Campaign",
  encounter: "Campaign",
};

const TYPE_NAMES = {
  ally: "Ally",
  event: "Event",
  obligation: "Obligation",
  player_side_scheme: "Player Side Scheme",
  resource: "Resource",
  support: "Support",
  upgrade: "Upgrade",
};

let json = [];
const packsDirectory = "./data/pack";
for (const filename of fs.readdirSync(packsDirectory)) {
  const filepath = path.resolve(packsDirectory, filename);
  const content = fs.readFileSync(filepath);
  json = json.concat(JSON.parse(content));
}

fs.writeFileSync("cards.json", JSON.stringify(json, null, 2));

const excludedSets = ["invocation", "weather"];
const excludedTypes = [
  "alter_ego",
  "attachment",
  "encounter",
  "environment",
  "hero",
  "main_scheme",
  "minion",
  "side_scheme",
  "treachery",
  "villain",
];

const cards = _(json)
  .reject(
    (card) =>
      card.duplicate_of !== undefined ||
      excludedSets.includes(card.set_code) ||
      excludedTypes.includes(card.type_code) ||
      (card.type_code === "obligation" && card.faction_code !== "campaign")
  )
  .uniqBy("octgn_id")
  .sortBy("code")
  .value();

const cardData = cards.map((card) => {
  const id = card.octgn_id;
  const name = card.subname ? `${card.name} (${card.subname})` : card.name;
  const unique = card.is_unique ? UNIQUE : "";
  const faction = FACTION_NAMES[card.faction_code] || card.faction_code;
  const cost =
    card.cost === -1 ? "X" : card.cost === undefined ? "-" : card.cost;
  const type = TYPE_NAMES[card.type_code] || card.type_code;
  const resources = getResourceColumns(card);
  const traits = (card.traits || "").toUpperCase();
  return [id, name, unique, faction, cost, type, ...resources, traits];
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
const tsv = rows.join("\n") + "\n";
fs.writeFileSync("cards.tsv", tsv);
