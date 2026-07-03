const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../config");
const { baseEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Post the member verification panel"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const button = new ButtonBuilder()
        .setCustomId("verify:confirm")
        .setLabel("Verify")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      const embed = baseEmbed()
        .setTitle(`🛡️ Verify to access ${config.CLAN_NAME}`)
        .setDescription(
          `Press the button below to verify yourself and get full access to the server.\n\n` +
            `This removes your **${config.UNVERIFIED_ROLE_NAME}** role and grants you the **${config.VERIFIED_ROLE_NAME}** role.`
        );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: "✅ Verification panel posted.", ephemeral: true });
    },
  },
];
