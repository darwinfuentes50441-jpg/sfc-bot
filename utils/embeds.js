const { EmbedBuilder } = require("discord.js");
const config = require("../config");

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(config.EMBED_COLOR)
    .setFooter({ text: config.CLAN_NAME })
    .setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed().setTitle(`✅ ${title}`).setDescription(description);
}

function errorEmbed(title, description) {
  return baseEmbed().setColor(0xed4245).setTitle(`⚠️ ${title}`).setDescription(description);
}

module.exports = { baseEmbed, successEmbed, errorEmbed };
