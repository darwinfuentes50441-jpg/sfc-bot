const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const { lockdownGuilds, trainingSessions, rollcallCheckins } = require("../state");

const MISSIONS = [
  "🎯 Infiltrate and secure the objective point without detection.",
  "🎯 Escort the VIP safely through hostile territory.",
  "🎯 Defend the outpost against incoming waves for 10 minutes.",
  "🎯 Recon the enemy base and report back troop positions.",
  "🎯 Retrieve the intel package and extract via the north checkpoint.",
];

const QUOTES = [
  '"Discipline is the bridge between goals and accomplishment." — Jim Rohn',
  '"The more you sweat in training, the less you bleed in battle." — Military Proverb',
  '"A leader leads by example, not by force." — Sun Tzu',
  '"Unity is strength... when there is teamwork and collaboration, wonderful things can be achieved." — Mattie Stepanek',
  '"Excellence is not a skill, it\'s an attitude." — Ralph Marston',
];

module.exports = [
  {
    data: new SlashCommandBuilder().setName("mission").setDescription("Shows a random clan mission"),
    async execute(interaction) {
      const mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
      const embed = baseEmbed().setTitle("🎖️ Mission Briefing").setDescription(mission);
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("quote").setDescription("Shows a military-style quote"),
    async execute(interaction) {
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      const embed = baseEmbed().setTitle("🎖️ Quote of the Moment").setDescription(quote);
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("status").setDescription("Shows clan readiness status"),
    async execute(interaction) {
      const guildId = interaction.guild.id;
      const lockdown = lockdownGuilds.has(guildId);
      const training = trainingSessions.has(guildId);

      const embed = baseEmbed()
        .setTitle(`🎖️ ${config.CLAN_NAME} Readiness Status`)
        .addFields(
          { name: "Members Online", value: `${interaction.guild.memberCount}`, inline: true },
          { name: "Lockdown", value: lockdown ? "🔒 Active" : "🟢 Normal", inline: true },
          { name: "Training", value: training ? "🧪 In Progress" : "🟢 None Active", inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("rollcall").setDescription("Starts a member check-in roll call (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const button = new ButtonBuilder()
        .setCustomId("rollcall:checkin")
        .setLabel("Check In")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(button);

      const embed = baseEmbed()
        .setTitle("📋 Roll Call")
        .setDescription("Click below to confirm you're active and present.\n\n**Checked in (0):** _none yet_");

      const sent = await interaction.channel.send({ embeds: [embed], components: [row] });
      rollcallCheckins.set(sent.id, new Set());

      await interaction.reply({ content: "✅ Roll call posted.", ephemeral: true });
    },
  },
];
