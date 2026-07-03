const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const db = require("../db");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function scoreBar(score) {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("review")
      .setDescription("Shows a member's evaluation (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to review").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      await interaction.deferReply();

      const target = interaction.options.getUser("user");
      const guildId = interaction.guild.id;

      const xp = await db.getXp(guildId, target.id);
      const warnings = await db.getWarnings(guildId, target.id);
      const recentWarnings = warnings.filter(
        (w) => Date.now() - new Date(w.created_at).getTime() < THIRTY_DAYS_MS
      );

      const activityScore = Math.max(0, Math.min(100, Math.round(xp / 5)));
      const behaviorScore = Math.max(0, 100 - warnings.length * 15);
      const disciplineScore = Math.max(0, 100 - recentWarnings.length * 25);
      const overall = Math.round((activityScore + behaviorScore + disciplineScore) / 3);

      let recommendation;
      if (overall >= 80) recommendation = "✅ Promote";
      else if (overall >= 50) recommendation = "👀 Watch";
      else recommendation = "❌ Deny";

      const embed = baseEmbed()
        .setTitle(`🧠 Evaluation — ${target.tag}`)
        .addFields(
          { name: "Activity Score", value: `${scoreBar(activityScore)} ${activityScore}/100` },
          { name: "Behavior Score", value: `${scoreBar(behaviorScore)} ${behaviorScore}/100` },
          { name: "Discipline Score", value: `${scoreBar(disciplineScore)} ${disciplineScore}/100` },
          { name: "Overall Rating", value: `**${overall}/100**`, inline: true },
          { name: "Recommendation", value: `**${recommendation}**`, inline: true }
        )
        .setFooter({ text: `Based on ${xp} XP and ${warnings.length} total warning(s)` });

      await interaction.editReply({ embeds: [embed] });
    },
  },
];
