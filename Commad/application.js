const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const db = require("../db");

module.exports = [
  {
    data: new SlashCommandBuilder().setName("apply").setDescription("Shows application info and submits your application"),
    async execute(interaction) {
      const application = await db.createApplication(interaction.guild.id, interaction.user.id);

      const embed = baseEmbed()
        .setTitle(`🧾 ${config.CLAN_NAME} Application`)
        .setDescription(
          `Thanks for your interest in joining ${config.CLAN_FULL_NAME}!\n\n` +
            `Your application status is now **${application.status}**. Staff will review it and use ` +
            `\`/accept\` or \`/deny\` — check back with \`/appstatus\`.`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("accept")
      .setDescription("Accepts an applicant (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Applicant to accept").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const application = await db.decideApplication(interaction.guild.id, target.id, "accepted", interaction.user.id);

      if (!application) {
        return interaction.reply({
          embeds: [errorEmbed("No Application Found", `${target} hasn't submitted an application with \`/apply\`.`)],
        });
      }

      await interaction.reply({
        embeds: [successEmbed("Applicant Accepted", `${target} has been accepted into ${config.CLAN_NAME}!`)],
      });
      await interaction.guild.members
        .fetch(target.id)
        .then((m) => m.send({ embeds: [successEmbed("Application Accepted", `You've been accepted into ${config.CLAN_FULL_NAME}!`)] }))
        .catch(() => {});
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("deny")
      .setDescription("Denies an applicant (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Applicant to deny").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for denial").setRequired(false)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const application = await db.decideApplication(interaction.guild.id, target.id, "denied", interaction.user.id);

      if (!application) {
        return interaction.reply({
          embeds: [errorEmbed("No Application Found", `${target} hasn't submitted an application with \`/apply\`.`)],
        });
      }

      await interaction.reply({
        embeds: [successEmbed("Applicant Denied", `${target}'s application was denied.\n**Reason:** ${reason}`)],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("appstatus")
      .setDescription("Shows an applicant's application status")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to check").setRequired(false)),
    async execute(interaction) {
      const target = interaction.options.getUser("user") || interaction.user;
      const application = await db.getLatestApplication(interaction.guild.id, target.id);

      if (!application) {
        return interaction.reply({
          embeds: [errorEmbed("No Application Found", `${target} hasn't submitted an application yet.`)],
          ephemeral: target.id === interaction.user.id,
        });
      }

      const statusEmoji = { pending: "🕒", accepted: "✅", denied: "❌" }[application.status] || "🕒";
      const embed = baseEmbed()
        .setTitle(`🧾 Application Status — ${target.tag}`)
        .addFields(
          { name: "Status", value: `${statusEmoji} ${application.status}`, inline: true },
          {
            name: "Applied",
            value: `<t:${Math.floor(new Date(application.applied_at).getTime() / 1000)}:D>`,
            inline: true,
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: target.id === interaction.user.id });
    },
  },
];
