import fs from "fs";
import _ from "lodash";

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

const resourceOrderExceptions = {
  // Shawarma
  "c9fe2c83-ea8b-479d-a5b2-da837f497576": ["👊🏾", "🧪", "⚡"],
};

const request = new Request("https://marvelcdb.com/api/public/cards/");
const response = await fetch(request);
const text = await response.text();
const json = JSON.parse(text);
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
  const cost =
    card.cost === -1 ? "X" : card.cost === undefined ? "-" : card.cost;
  const resources = getResourceColumns(card);
  const type = card.type_name;
  const traits = (card.traits || "").toUpperCase();

  return [id, name, unique, className, cost, type, ...resources, traits];
});

function getResourceColumns(card) {
  const resources = getResources(card);

  const filter = resources.join("");
  const symbol = (i) => RESOURCE_SYMBOLS[resources[i]];

  switch (resources.length) {
    case 0:
      return [filter, "", "", "", "", ""];
    case 1:
      return [filter, "", "", symbol(0), "", ""];
    case 2:
      return [filter, "", symbol(0), "", symbol(1), ""];
    case 3:
      return [filter, symbol(0), "", symbol(1), "", symbol(2)];
    default:
      throw new Error(
        `Could not handle "${card.name}", which has ${resources.length} resources.`
      );
  }
}

function getResources(card) {
  const exception = resourceOrderExceptions[card.octgn_id];
  if (exception) {
    return exception;
  }

  const type = (emoji, count = 0) => Array(count).fill(emoji);

  return [
    ...type("⚡", card.resource_energy),
    ...type("🧪", card.resource_mental),
    ...type("👊🏾", card.resource_physical),
    ...type("✨", card.resource_wild),
  ];
}

const rows = cardData.map((row) => row.join("\t"));
const tsv = rows.join("\n");
fs.writeFileSync("cards.tsv", tsv);
