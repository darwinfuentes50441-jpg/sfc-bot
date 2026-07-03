const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, errorEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const { trainingSessions } = require("../state");

function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

module.exports = [
  {
    data: new SlashCommandBuilder().setName("train_start").setDescription("Starts a training session (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const guildId = interaction.guild.id;
      if (trainingSessions.has(guildId)) {
        return interaction.reply({
          embeds: [errorEmbed("Session Already Active", "A training session is already in progress in this server.")],
        });
      }

      trainingSessions.set(guildId, {
        startedBy: interaction.user.id,
        startedAt: Date.now(),
        channelId: interaction.channel.id,
      });

      const embed = baseEmbed()
        .setTitle("🧪 Training Session Started")
        .setDescription(`A training session has begun, hosted by ${interaction.member}.\n\nGood luck, recruits!`);

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("train_end").setDescription("Ends the active training session (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const guildId = interaction.guild.id;
      const session = trainingSessions.get(guildId);
      if (!session) {
        return interaction.reply({
          embeds: [errorEmbed("No Active Session", "There's no training session currently running.")],
        });
      }

      trainingSessions.delete(guildId);
      const duration = formatDuration(Date.now() - session.startedAt);

      const embed = baseEmbed()
        .setTitle("🧪 Training Session Ended")
        .addFields(
          { name: "Hosted By", value: `<@${session.startedBy}>`, inline: true },
          { name: "Duration", value: duration, inline: true },
          { name: "Ended By", value: `${interaction.member}`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("train_report")
      .setDescription("Posts a training report (staff only)")
      .addStringOption((opt) =>
        opt.setName("attendees").setDescription("Who attended (mentions or names)").setRequired(true)
      )
      .addStringOption((opt) => opt.setName("notes").setDescription("Additional notes").setRequired(false)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const attendees = interaction.options.getString("attendees");
      const notes = interaction.options.getString("notes") || "None";

      const embed = baseEmbed()
        .setTitle("🧾 Training Report")
        .addFields(
          { name: "Hosted By", value: `${interaction.member}`, inline: true },
          { name: "Attendees", value: attendees },
          { name: "Notes", value: notes }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
];
