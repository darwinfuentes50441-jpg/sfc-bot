const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole, hasStaffRole } = require("../utils/staffCheck");
const { isTicketOpener } = require("../systems/tickets");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("setticketsystem")
      .setDescription("Posts the ticket panel members use to open a support ticket (staff only)"),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket:create")
        .setPlaceholder("Select a ticket category")
        .addOptions(
          config.TICKETS.TYPES.map((t) => ({
            label: t.label,
            value: t.id,
            description: t.description,
            emoji: t.emoji,
          }))
        );
      const row = new ActionRowBuilder().addComponents(menu);

      const embed = baseEmbed()
        .setTitle(`🎫 ${config.CLAN_NAME} Support Tickets`)
        .setDescription(
          "Need help or want to reach staff privately? Select a category below to open a ticket.\n\n" +
            config.TICKETS.TYPES.map((t) => `${t.emoji} **${t.label}** — ${t.description}`).join("\n")
        );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: "✅ Ticket system posted.", ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("closeticket")
      .setDescription("Closes the current ticket channel"),
    async execute(interaction) {
      const channel = interaction.channel;

      if (!channel.topic || !channel.topic.startsWith("ticket-opener:")) {
        return interaction.reply({
          embeds: [errorEmbed("Not a Ticket Channel", "This command can only be used inside a ticket channel.")],
          ephemeral: true,
        });
      }

      if (!hasStaffRole(interaction.member) && !isTicketOpener(channel, interaction.user.id)) {
        return interaction.reply({ content: config.NO_PERMISSION_MESSAGE, ephemeral: true });
      }

      await interaction.reply({
        embeds: [successEmbed("Closing Ticket", "This ticket will be deleted in 5 seconds.")],
      });
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("addticketuser")
      .setDescription("Adds a member to the current ticket (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to add").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const channel = interaction.channel;
      if (!channel.topic || !channel.topic.startsWith("ticket-opener:")) {
        return interaction.reply({
          embeds: [errorEmbed("Not a Ticket Channel", "This command can only be used inside a ticket channel.")],
          ephemeral: true,
        });
      }

      const target = interaction.options.getUser("user");
      await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });

      await interaction.reply({
        embeds: [successEmbed("Member Added", `${target} has been added to this ticket.`)],
      });
    },
  },
];
