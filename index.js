import fs from "fs";
import _ from "lodash";

const ENERGY = "";
const MENTAL = "";
const PHYSICAL = "";
const WILD = "";
const UNIQUE = "";

const request = new Request("https://marvelcdb.com/api/public/cards/");
const response = await fetch(request);
const text = await response.text();
const json = JSON.parse(text);
fs.writeFileSync("cards.json", JSON.stringify(json, null, 2));

const excludedSetTypes = ["modular", "villain"];
const excludedSets = ["invocation", "weather"];
const excludedTypes = ["hero", "alter_ego"];

const cards = _.uniqBy(json, "octgn_id").filter(
  (card) =>
    !excludedSetTypes.includes(card.card_set_type_name_code) &&
    !excludedSets.includes(card.card_set_code) &&
    !excludedTypes.includes(card.type_code)
);

const cardData = cards.map((card) => {
  const id = card.octgn_id;
  const name = card.subname ? `${card.name} (${card.subname})` : card.name;
  const unique = card.is_unique ? UNIQUE : "";
  const className = card.faction_name;
  const cost =
    card.cost === -1 ? "X" : card.cost === undefined ? "-" : card.cost;
  const resources =
    ENERGY.repeat(card.resource_energy) +
    MENTAL.repeat(card.resource_mental) +
    PHYSICAL.repeat(card.resource_physical) +
    WILD.repeat(card.resource_wild);
  const type = card.type_name;
  const traits = (card.traits || "").toUpperCase();

  return [id, name, unique, className, cost, type, resources, traits];
});

const rows = cardData.map((row) => row.join("\t"));
const tsv = rows.join("\n");
fs.writeFileSync("cards.tsv", tsv);
