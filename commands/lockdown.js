const { SlashCommandBuilder } = require("discord.js");
const { lockdownGuilds } = require("../state");
const { successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("lockdown")
      .setDescription("Manually lock the server down against raids")
      .addSubcommand((sub) => sub.setName("on").setDescription("Enable lockdown — new joins are kicked"))
      .addSubcommand((sub) => sub.setName("off").setDescription("Disable lockdown"))
      .addSubcommand((sub) => sub.setName("status").setDescription("Check current lockdown status")),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;

      if (sub === "on") {
        lockdownGuilds.add(guildId);
        return interaction.reply({
          embeds: [
            successEmbed(
              "Lockdown Enabled",
              "🔒 New members will be kicked automatically until lockdown is turned off."
            ),
          ],
        });
      }

      if (sub === "off") {
        lockdownGuilds.delete(guildId);
        return interaction.reply({
          embeds: [successEmbed("Lockdown Disabled", "🔓 New members can join normally again.")],
        });
      }

      const active = lockdownGuilds.has(guildId);
      return interaction.reply({
        embeds: [
          successEmbed("Lockdown Status", active ? "🔒 Currently **active**." : "🔓 Currently **inactive**."),
        ],
      });
    },
  },
];
