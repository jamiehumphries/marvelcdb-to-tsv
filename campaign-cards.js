export function getCampaignCards(allCards) {
  return allCards
    .filter(
      (card) =>
        isTheRiseOfRedSkullCampaignCard(card) ||
        isGalaxysMostWantedCampaignCard(card) ||
        isTheMadTitansShadowCampaignCard(card) ||
        isSinisterMotivesCampaignCard(card) ||
        isMutantGenesisCampaignCard(card) ||
        isMojoManiaCampaignCard(card) ||
        isNeXtEvolutionCampaignCard(card) ||
        isAgeOfApocalypseCampaignCard(card)
    )
    .map(withPseudoProperties);
}

function isTheRiseOfRedSkullCampaignCard(card) {
  const isCampaignUpgrade = card.set_code === "hydra_camp";
  const isTaskmasterCaptive =
    card.set_code === "taskmaster" && card.type_code === "ally";
  return isCampaignUpgrade || isTaskmasterCaptive;
}

function isGalaxysMostWantedCampaignCard(card) {
  const isMarketCard = card.set_code === "the_market";
  return isMarketCard;
}

function isTheMadTitansShadowCampaignCard(card) {
  const campaignCards = [
    "21139b", // Odin (King)
    "21180b", // Cosmo
    "21183", // Shawarma
    "21185", // System Shock
    "21187a", // Norn Stone
  ];
  return campaignCards.includes(card.code);
}

function isSinisterMotivesCampaignCard(card) {
  const isShieldTech = card.set_code === "shield_tech";
  return isShieldTech;
}

function isMutantGenesisCampaignCard(card) {
  const roleSets = ["brawler", "commander", "defender", "peacekeeper"];
  const isCampaignRoleCard = roleSets.includes(card.set_code);
  const isMasterMoldCaptive =
    card.set_code === "project_wideawake" && card.type_code === "ally";
  return isCampaignRoleCard || isMasterMoldCaptive;
}

function isMojoManiaCampaignCard(card) {
  const isLongshot = card.set_code === "longshot";
  return isLongshot;
}

function isNeXtEvolutionCampaignCard(card) {
  const isCampaignPlayerSideScheme =
    card.set_code === "next_evol_campaign" &&
    [card.type_code, card.back_card?.type_code].includes("player_side_scheme");
  return isCampaignPlayerSideScheme;
}

function isAgeOfApocalypseCampaignCard(card) {
  const isCampaignMissionSuccessReward =
    card.pack_code === "aoa" &&
    card.faction_code === "campaign" &&
    ["ally", "upgrade"].includes(card.type_code);
  const isCampaignMissionFailureObligation =
    card.set_code === "aoa_campaign" && card.type_code === "obligation";
  return isCampaignMissionSuccessReward || isCampaignMissionFailureObligation;
}

function withPseudoProperties(card) {
  const suffix = card.code.padStart(12, "0");
  card.octgn_id = `campaign-0000-0000-0000-${suffix}`;
  card.faction_code = "campaign";
  card.deck_limit ||= 1;
  return card;
}
