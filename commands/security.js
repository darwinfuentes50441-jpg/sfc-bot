const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");

module.exports = [
  {
    data: new SlashCommandBuilder().setName("lock").setDescription("Locks the current channel (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false,
        });
        await interaction.reply({ embeds: [successEmbed("Channel Locked", `🔒 ${interaction.channel} is now locked.`)] });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Lock", "I need Manage Channels permission here.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder().setName("unlock").setDescription("Unlocks the current channel (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: null,
        });
        await interaction.reply({ embeds: [successEmbed("Channel Unlocked", `🔓 ${interaction.channel} is now unlocked.`)] });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Unlock", "I need Manage Channels permission here.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("slowmode")
      .setDescription("Sets channel slowmode (staff only)")
      .addIntegerOption((opt) =>
        opt.setName("seconds").setDescription("Slowmode delay in seconds (0 to disable)").setRequired(true).setMinValue(0).setMaxValue(21600)
      ),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const seconds = interaction.options.getInteger("seconds");
      try {
        await interaction.channel.setRateLimitPerUser(seconds);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Slowmode Updated",
              seconds === 0 ? `Slowmode disabled in ${interaction.channel}.` : `Slowmode set to **${seconds}s** in ${interaction.channel}.`
            ),
          ],
        });
      } catch (err) {
        await interaction.reply({ embeds: [errorEmbed("Failed to Set Slowmode", "I need Manage Channels permission here.")] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("nuke")
      .setDescription("⚠️ Clears the entire channel by recreating it (staff only)")
      .addBooleanOption((opt) =>
        opt.setName("confirm").setDescription("Set to true to confirm this destructive action").setRequired(true)
      ),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const confirm = interaction.options.getBoolean("confirm");
      if (!confirm) {
        return interaction.reply({
          embeds: [errorEmbed("Cancelled", "Set `confirm` to true to actually nuke this channel. This cannot be undone.")],
          ephemeral: true,
        });
      }

      if (interaction.channel.type !== ChannelType.GuildText) {
        return interaction.reply({ embeds: [errorEmbed("Unsupported Channel", "This can only be used in text channels.")] });
      }

      try {
        const oldChannel = interaction.channel;
        const newChannel = await oldChannel.clone({ reason: `Nuked by ${interaction.user.tag}` });
        await newChannel.setPosition(oldChannel.position);
        await oldChannel.delete(`Nuked by ${interaction.user.tag}`);
        await newChannel.send({
          embeds: [baseEmbed().setTitle("💥 Channel Nuked").setDescription(`This channel was cleared by ${interaction.user}.`)],
        });
      } catch (err) {
        await interaction.reply({
          embeds: [errorEmbed("Failed to Nuke", "I need Manage Channels permission to do that.")],
        });
      }
    },
  },
];
