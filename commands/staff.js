const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const db = require("../db");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("announce")
      .setDescription("Sends a public announcement embed (staff only)")
      .addStringOption((opt) =>
        opt.setName("message").setDescription("The announcement text").setRequired(true)
      ),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const text = interaction.options.getString("message");
      const embed = baseEmbed()
        .setTitle("📢 Announcement")
        .setDescription(text)
        .setAuthor({
          name: interaction.member.displayName,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warns a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to warn").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the warning").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const targetUser = interaction.options.getUser("user");
      const target = await interaction.guild.members.fetch(targetUser.id);
      const reason = interaction.options.getString("reason");

      await db.addWarning(interaction.guild.id, target.id, interaction.user.id, reason);

      const embed = baseEmbed()
        .setColor(0xf0b232)
        .setTitle("⚠️ Warning Issued")
        .addFields(
          { name: "Member", value: `${target}`, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Staff", value: `${interaction.member}`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
      await target.send({ embeds: [embed] }).catch(() => {});
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("Shows a member's warning history (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to check").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const targetUser = interaction.options.getUser("user");
      const warnings = await db.getWarnings(interaction.guild.id, targetUser.id);

      const embed = baseEmbed().setTitle(`🧾 Warnings — ${targetUser.tag}`);

      if (warnings.length === 0) {
        embed.setDescription("This member has no warnings.");
      } else {
        embed.setDescription(
          warnings
            .slice(0, 10)
            .map(
              (w, i) =>
                `**${i + 1}.** ${w.reason}\n— by <@${w.moderator_id}> on <t:${Math.floor(
                  new Date(w.created_at).getTime() / 1000
                )}:D>`
            )
            .join("\n\n")
        );
        embed.setFooter({ text: `${config.CLAN_NAME} • ${warnings.length} total warning(s)` });
      }

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kicks a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to kick").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the kick").setRequired(false)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const targetUser = interaction.options.getUser("user");
      const target = await interaction.guild.members.fetch(targetUser.id);
      const reason = interaction.options.getString("reason") || "No reason provided";

      if (!target.kickable) {
        return interaction.reply({
          embeds: [errorEmbed("Cannot Kick", "I don't have permission to kick that member — check role hierarchy.")],
        });
      }

      try {
        await target.kick(reason);
        await interaction.reply({
          embeds: [successEmbed("Member Kicked", `${target.user.tag} was kicked.\n**Reason:** ${reason}`)],
        });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Kick", "Something went wrong.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Bans a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to ban").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const targetUser = interaction.options.getUser("user");
      const target = await interaction.guild.members.fetch(targetUser.id);
      const reason = interaction.options.getString("reason") || "No reason provided";

      if (!target.bannable) {
        return interaction.reply({
          embeds: [errorEmbed("Cannot Ban", "I don't have permission to ban that member — check role hierarchy.")],
        });
      }

      try {
        await target.ban({ reason });
        await interaction.reply({
          embeds: [successEmbed("Member Banned", `${target.user.tag} was banned.\n**Reason:** ${reason}`)],
        });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Ban", "Something went wrong.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Times out a member (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to mute").setRequired(true))
      .addIntegerOption((opt) =>
        opt.setName("time").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320)
      )
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the mute").setRequired(false)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const targetUser = interaction.options.getUser("user");
      const target = await interaction.guild.members.fetch(targetUser.id);
      const minutes = interaction.options.getInteger("time");
      const reason = interaction.options.getString("reason") || "No reason provided";

      if (!target.moderatable) {
        return interaction.reply({
          embeds: [errorEmbed("Cannot Mute", "I don't have permission to time out that member — check role hierarchy.")],
        });
      }

      try {
        await target.timeout(minutes * 60 * 1000, reason);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Member Muted",
              `${target.user.tag} was muted for ${minutes} minute(s).\n**Reason:** ${reason}`
            ),
          ],
        });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Mute", "Something went wrong.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Bulk deletes messages (staff only)")
      .addIntegerOption((opt) =>
        opt.setName("amount").setDescription("Number of messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
      ),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const amount = interaction.options.getInteger("amount");

      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({
          embeds: [successEmbed("Messages Cleared", `Deleted ${deleted.size} messages.`)],
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({
          embeds: [errorEmbed("Failed to Clear", "I can only bulk delete messages younger than 14 days.")],
          ephemeral: true,
        });
      }
    },
  },
];
