export function getCampaignCards(allCards) {
  return allCards
    .filter(
      (card) =>
        isCampaignCardFromTheRiseOfRedSkull(card) ||
        isCampaignCardFromGalaxysMostWanted(card) ||
        isCampaignCardFromTheMadTitansShadow(card) ||
        isCampaignCardFromSinisterMotives(card) ||
        isCampaignCardFromMutantGenesis(card) ||
        isCampaignCardFromMojoMania(card) ||
        isCampaignCardFromNeXtEvolution(card) ||
        isCampaignCardFromAgeOfApocalypse(card)
    )
    .map(withPseudoOctgnId);
}

function isCampaignCardFromTheRiseOfRedSkull(card) {
  const isCampaignUpgrade = card.set_code === "hydra_camp";
  const isTaskmasterCaptive =
    card.set_code === "taskmaster" && card.type_code === "ally";
  return isCampaignUpgrade || isTaskmasterCaptive;
}

function isCampaignCardFromGalaxysMostWanted(card) {
  const isMarketCard = card.set_code === "the_market";
  return isMarketCard;
}

function isCampaignCardFromTheMadTitansShadow(card) {
  const campaignCards = [
    "21139b", // Odin
    "21180b", // Cosmo
    "21183", // Shawarma
    "21185", // System Shock
    "21187a", // Norn Stone
  ];
  return campaignCards.includes(card.code);
}

function isCampaignCardFromSinisterMotives(card) {
  const isShieldTech = card.set_code === "shield_tech";
  return isShieldTech;
}

function isCampaignCardFromMutantGenesis(card) {
  const roleSets = ["brawler", "commander", "defender", "peacekeeper"];
  const isCampaignRoleCard = roleSets.includes(card.set_code);
  const isMasterMoldCaptive =
    card.set_code === "project_wideawake" && card.type_code === "ally";
  return isCampaignRoleCard || isMasterMoldCaptive;
}

function isCampaignCardFromMojoMania(card) {
  const isLongshot = card.set_code === "longshot";
  return isLongshot;
}

function isCampaignCardFromNeXtEvolution(card) {
  const isCampaignPlayerSideScheme =
    card.set_code === "next_evol_campaign" &&
    ["player_side_scheme", "environment"].includes(card.type_code);
  return isCampaignPlayerSideScheme;
}

function isCampaignCardFromAgeOfApocalypse(card) {
  const isCampaignMissionSuccessReward =
    card.pack_code === "aoa" &&
    card.faction_code === "campaign" &&
    ["ally", "upgrade"].includes(card.type_code);
  const isCampaignMissionFailureObligation =
    card.set_code === "aoa_campaign" && card.type_code === "obligation";
  return isCampaignMissionSuccessReward || isCampaignMissionFailureObligation;
}

function withPseudoOctgnId(card) {
  let suffix = card.code;
  while (suffix.length < 12) {
    suffix = "0" + suffix;
  }
  card.octgn_id = `campaign-0000-0000-0000-${suffix}`;
  return card;
}
