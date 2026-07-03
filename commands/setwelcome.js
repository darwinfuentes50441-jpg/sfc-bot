const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const db = require("../db");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("setwelcome")
      .setDescription("Sets the welcome, verify, and/or roles channels used by the welcome message (staff only)")
      .addChannelOption((opt) =>
        opt
          .setName("welcome_channel")
          .setDescription("Channel the welcome message is posted in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("verify_channel")
          .setDescription("Channel new members should verify in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("roles_channel")
          .setDescription("Channel new members should pick roles in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      ),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const welcomeChannel = interaction.options.getChannel("welcome_channel");
      const verifyChannel = interaction.options.getChannel("verify_channel");
      const rolesChannel = interaction.options.getChannel("roles_channel");

      if (!welcomeChannel && !verifyChannel && !rolesChannel) {
        return interaction.reply({
          content: "⚠️ Provide at least one channel to set (welcome_channel, verify_channel, or roles_channel).",
          ephemeral: true,
        });
      }

      const updates = [];
      if (welcomeChannel) {
        await db.setGuildSetting(interaction.guild.id, "welcome_channel_id", welcomeChannel.id);
        updates.push(`**Welcome channel:** ${welcomeChannel}`);
      }
      if (verifyChannel) {
        await db.setGuildSetting(interaction.guild.id, "verify_channel_id", verifyChannel.id);
        updates.push(`**Verify channel:** ${verifyChannel}`);
      }
      if (rolesChannel) {
        await db.setGuildSetting(interaction.guild.id, "roles_channel_id", rolesChannel.id);
        updates.push(`**Roles channel:** ${rolesChannel}`);
      }

      await interaction.reply({
        embeds: [successEmbed("Welcome Settings Updated", updates.join("\n"))],
        ephemeral: true,
      });
    },
  },
];
