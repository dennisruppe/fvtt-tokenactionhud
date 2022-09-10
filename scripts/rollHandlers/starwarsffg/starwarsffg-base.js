import { RollHandler } from "../rollHandler.js";
import * as settings from "../../settings.js";

export class RollHandlerBaseStarWarsFFG extends RollHandler {
  constructor() {
    super();
  }

  doHandleActionEvent(event, encodedValue) {
    let payload = encodedValue.split("|");
    if (payload.length != 3) {
      super.throwInvalidValueErr();
    }

    let macroType = payload[0];
    let tokenId = payload[1];
    let actionId = payload[2];

    let actor = super.getActor(tokenId);

    switch (macroType) {
      case "gm":
        switch (actionId) {
          case "destiny":
            return this._rollDestiny();
        }
      case "weapon":
        return game.ffg.DiceHelpers.rollItem(actionId, actor.id);
      case "shipweapon":
        return this._rollShipWeapon(actor, actionId);
      case "skill":
        return this._rollSkill(actor, actionId, event);
      case "forcepower":
        return this._rollForcePower(actor, actionId);
    }
  }

  _rollForcePower(actor, itemId) {
    let item = actor.items.get(itemId);
    if (!item) {
      item = game.items.get(itemId);
    }
    if (!item) {
      item = ImportHelpers.findCompendiumEntityById("Item", itemId);
    }
    const forcedice =
      actor.data.data.stats.forcePool.max -
      actor.data.data.stats.forcePool.value;
    if (forcedice > 0) {
      let sheet = actor.sheet.getData();
      const dicePool = new DicePoolFFG({
        force: forcedice,
      });
      game.ffg.DiceHelpers.displayRollDialog(
        sheet,
        dicePool,
        `${game.i18n.localize("SWFFG.Rolling")} ${item.name}`,
        item.name,
        item
      );
    }
  }

  _rollDestiny() {
    game.settings.set("starwarsffg", "dPoolLight", 0);
    game.settings.set("starwarsffg", "dPoolDark", 0);
    const messageText = `<button class="ffg-destiny-roll">${game.i18n.localize(
      "SWFFG.DestinyPoolRoll"
    )}</button>`;

    new Map(
      [...game.settings.settings].filter(([k, v]) =>
        v.key.includes("destinyrollers")
      )
    ).forEach((i) => {
      game.settings.set(i.module, i.key, undefined);
    });

    CONFIG.FFG.DestinyGM = game.user.id;

    ChatMessage.create({
      user: game.user.id,
      content: messageText,
    });
  }

  _rollSkill(actor, skillname, event) {
    let difficulty = 2;
    if (event.ctrlKey && !event.shiftKey) {
      difficulty = 3;
    } else if (!event.ctrlKey && event.shiftKey) {
      difficulty = 1;
    }
    const actorSheet = actor.sheet.getData();
    const skill = actor.data.data.skills[skillname];
    const characteristic =
      actorSheet.data.characteristics[skill.characteristic];
    game.ffg.DiceHelpers.rollSkillDirect(
      skill,
      characteristic,
      difficulty,
      actorSheet
    );
  }

  async _rollShipWeapon(actor, itemId) {
    const item = actor.items.get(itemId);
    const actorSheet = actor.sheet.getData();
    const skillName = item.data.data.skill.value;
    
    let skills;
    const theme = await game.settings.get("starwarsffg", "skilltheme");
    try {
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === theme).skills));
    } catch (err) {
      // if we run into an error use the default starwars skill set
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === "starwars").skills));
      CONFIG.logger.warn(`Unable to load skill theme ${theme}, defaulting to starwars skill theme`, err);
    }

    let skillData = skills?.[skillName];

    if (!skillData) {
      skillData = data.data[skillName];
    }

    let skill = {
      rank: 0,
      characteristic: "",
      boost: 0,
      setback: 0,
      force: 0,
      advantage: 0,
      dark: 0,
      light: 0,
      failure: 0,
      threat: 0,
      success: 0,
      triumph: 0,
      despair: 0,
      label: skillData?.label ? game.i18n.localize(skillData.label) : game.i18n.localize(skillName),
    };
    let characteristic = {
      value: 0,
    };

    if (actorSheet?.data?.skills?.[skillName]) {
      skill = actorSheet.data.skills[skillName];
    }
    if (actorSheet?.data?.characteristics?.[skill?.characteristic]) {
      characteristic = actorSheet.data.characteristics[skill.characteristic];
    }

    game.ffg.DiceHelpers.rollSkillDirect(
      skill,
      characteristic,
      2,
      actorSheet
    )
  }
}
