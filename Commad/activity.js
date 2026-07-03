const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, errorEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const db = require("../db");

function levelFor(xp) {
  return Math.floor(xp / 100);
}

module.exports = [
  {
    data: new SlashCommandBuilder().setName("leaderboard").setDescription("Shows the most active members"),
    async execute(interaction) {
      await interaction.deferReply();

      const top = await db.getLeaderboard(interaction.guild.id, 10);
      if (top.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed("No Activity Yet", "No members have earned XP yet. Chat around the server to start earning XP!")],
        });
      }

      const medals = ["🥇", "🥈", "🥉"];
      const lines = top.map((row, i) => `${medals[i] || `**${i + 1}.**`} <@${row.user_id}> — ${row.xp} XP (Lv. ${levelFor(row.xp)})`);

      const embed = baseEmbed().setTitle("🏅 Activity Leaderboard").setDescription(lines.join("\n"));
      await interaction.editReply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("xp")
      .setDescription("Shows a member's XP level")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to check").setRequired(false)),
    async execute(interaction) {
      const target = interaction.options.getUser("user") || interaction.user;
      const xp = await db.getXp(interaction.guild.id, target.id);

      const embed = baseEmbed()
        .setTitle(`🏅 ${target.tag}'s XP`)
        .addFields(
          { name: "Total XP", value: `${xp}`, inline: true },
          { name: "Level", value: `${levelFor(xp)}`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("addxp")
      .setDescription("Adds XP to a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to update").setRequired(true))
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount of XP to add").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const newXp = await db.addXp(interaction.guild.id, target.id, amount);

      const embed = baseEmbed().setTitle("🏅 XP Added").setDescription(`Added **${amount} XP** to ${target}.\nNew total: **${newXp} XP**`);
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("removexp")
      .setDescription("Removes XP from a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to update").setRequired(true))
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount of XP to remove").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const newXp = await db.addXp(interaction.guild.id, target.id, -amount);

      const embed = baseEmbed().setTitle("🏅 XP Removed").setDescription(`Removed **${amount} XP** from ${target}.\nNew total: **${newXp} XP**`);
      await interaction.reply({ embeds: [embed] });
    },
  },
];
