const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed } = require("../utils/embeds");

module.exports = [
  {
    data: new SlashCommandBuilder().setName("help").setDescription("Show all available commands"),
    async execute(interaction) {
      const embed = baseEmbed()
        .setTitle(`🧾 ${config.CLAN_NAME} Assistant — Commands`)
        .addFields(
          { name: "General", value: "`/help` `/info` `/ping` `/server` `/invite`" },
          {
            name: "🛡️ Member Commands",
            value: "`/rank` `/roster` `/rules` `/profile` `/activity`",
          },
          {
            name: "🧾 Clan System",
            value: "`/promote` `/demote` `/setrank` `/ranklist`",
          },
          {
            name: "📢 Staff Commands",
            value: "`/announce` `/warn` `/warnings` `/kick` `/ban` `/mute` `/clear`",
          },
          { name: "🧠 Review System", value: "`/review`" },
          { name: "🧪 Training System", value: "`/train_start` `/train_end` `/train_report`" },
          { name: "🧾 Application System", value: "`/apply` `/accept` `/deny` `/appstatus`" },
          { name: "🏅 Activity System", value: "`/leaderboard` `/xp` `/addxp` `/removexp`" },
          { name: "🔐 Security", value: "`/lock` `/unlock` `/slowmode` `/nuke`" },
          { name: "🎖️ Fun", value: "`/mission` `/quote` `/status` `/rollcall`" },
          { name: "🧩 Roles & Raid Protection", value: "`/rolemenu` `/verify` `/lockdown`" }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("info").setDescription("Shows SFC clan information"),
    async execute(interaction) {
      const embed = baseEmbed()
        .setTitle(`🛡️ ${config.CLAN_FULL_NAME}`)
        .setDescription(config.CLAN_DESCRIPTION);

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("ping").setDescription("Shows bot latency"),
    async execute(interaction) {
      const sent = await interaction.reply({ content: "🏓 Pinging...", fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const embed = baseEmbed()
        .setTitle("🏓 Pong!")
        .addFields(
          { name: "Message Latency", value: `${latency}ms`, inline: true },
          { name: "API Latency", value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
        );
      await interaction.editReply({ content: null, embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("server").setDescription("Shows server stats"),
    async execute(interaction) {
      const guild = interaction.guild;
      if (!guild) return;

      await interaction.deferReply();
      await guild.channels.fetch();

      const textChannels = guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread()).size;
      const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size;

      const embed = baseEmbed()
        .setTitle(`📋 ${guild.name}`)
        .setThumbnail(guild.iconURL() || null)
        .addFields(
          { name: "Members", value: `${guild.memberCount}`, inline: true },
          { name: "Text Channels", value: `${textChannels}`, inline: true },
          { name: "Voice Channels", value: `${voiceChannels}`, inline: true },
          {
            name: "Created",
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
            inline: true,
          },
          { name: "Owner", value: `<@${guild.ownerId}>`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("invite").setDescription("Shows the server invite link"),
    async execute(interaction) {
      await interaction.deferReply();

      try {
        const invites = await interaction.guild.invites.fetch();
        let invite = invites.find((i) => !i.temporary) || invites.first();

        if (!invite) {
          const channel = interaction.guild.channels.cache.find(
            (c) =>
              c.isTextBased() &&
              !c.isThread() &&
              c.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
          );

          if (!channel) {
            return interaction.editReply({
              embeds: [
                errorEmbed(
                  "No Invite Available",
                  "I don't have permission to create an invite in any channel. Ask an admin to create one manually."
                ),
              ],
            });
          }

          invite = await channel.createInvite({ maxAge: 0, unique: false });
        }

        const embed = baseEmbed()
          .setTitle("🔗 Server Invite")
          .setDescription(`https://discord.gg/${invite.code}`);

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "Failed to Get Invite",
              "I need the Create Invite / Manage Server permission to fetch or create an invite."
            ),
          ],
        });
      }
    },
  },
];
