const { SlashCommandBuilder } = require("discord.js");
const { baseEmbed, errorEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const { ROLE_MENU_TITLE, REACTION_EMOJIS } = require("../systems/rolemenu");

// Discord hard-caps slash command options at 25 — this is also how many
// reaction emoji we have mapped (10 numbers + 15 letters), so it lines up.
const MAX_ROLE_OPTIONS = REACTION_EMOJIS.length;

const builder = new SlashCommandBuilder()
  .setName("rolemenu")
  .setDescription("Post a reaction role menu (react to get a role, unreact to remove it)")
  .addRoleOption((opt) => opt.setName("role1").setDescription("A selectable role").setRequired(true));

for (let i = 2; i <= MAX_ROLE_OPTIONS; i++) {
  builder.addRoleOption((opt) =>
    opt.setName(`role${i}`).setDescription("An additional selectable role").setRequired(false)
  );
}

module.exports = [
  {
    data: builder,
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const roles = [];
      for (let i = 1; i <= MAX_ROLE_OPTIONS; i++) {
        const role = interaction.options.getRole(`role${i}`);
        if (role) roles.push(role);
      }

      const botMember = interaction.guild.members.me;
      const tooHigh = roles.find((r) => r.position >= botMember.roles.highest.position);
      if (tooHigh) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Role Hierarchy Issue",
              `My highest role must be above **${tooHigh.name}** for me to manage it. Move my role up in Server Settings > Roles.`
            ),
          ],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const embed = baseEmbed()
        .setTitle(ROLE_MENU_TITLE)
        .setDescription("React below to get a role. Remove your reaction to remove the role.")
        .addFields(roles.map((role, i) => ({ name: REACTION_EMOJIS[i], value: `${role}`, inline: true })));

      const message = await interaction.channel.send({ embeds: [embed] });

      for (let i = 0; i < roles.length; i++) {
        await message.react(REACTION_EMOJIS[i]);
      }

      await interaction.editReply({ content: "✅ Role menu posted." });
    },
  },
];
