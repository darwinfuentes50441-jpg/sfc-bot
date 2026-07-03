const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed } = require("../utils/embeds");
const { getMemberRank, findRankRole } = require("../utils/ranks");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Shows a member's current rank")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to check").setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser("user");
      const target = user ? await interaction.guild.members.fetch(user.id) : interaction.member;
      const rank = getMemberRank(target);

      const embed = baseEmbed()
        .setTitle(`🛡️ ${target.displayName}'s Rank`)
        .setThumbnail(target.user.displayAvatarURL())
        .setDescription(rank ? `**${rank.role.name}**` : "No clan rank yet.");

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("roster").setDescription("Shows the clan hierarchy"),
    async execute(interaction) {
      await interaction.deferReply();
      await interaction.guild.members.fetch();

      const embed = baseEmbed().setTitle(`📋 ${config.CLAN_NAME} Roster`);

      const ownership = interaction.guild.roles.cache.find((r) => r.name === config.OWNER_ROLE);
      const staffRoleNames = config.STAFF_ROLES.filter((name) => name !== config.OWNER_ROLE);

      if (ownership && ownership.members.size > 0) {
        embed.addFields({
          name: `👑 ${ownership.name} (${ownership.members.size})`,
          value: ownership.members.map((m) => m.displayName).slice(0, 25).join(", "),
        });
      }

      for (const roleName of staffRoleNames) {
        const role = interaction.guild.roles.cache.find((r) => r.name === roleName);
        if (!role || role.members.size === 0) continue;
        embed.addFields({
          name: `🛡️ ${role.name} (${role.members.size})`,
          value: role.members.map((m) => m.displayName).slice(0, 25).join(", "),
        });
      }

      const memberLines = [];
      for (const rankName of [...config.RANKS].reverse()) {
        const role = findRankRole(interaction.guild, rankName);
        if (!role || role.members.size === 0) continue;
        memberLines.push(`**${rankName}** (${role.members.size}): ${role.members.map((m) => m.displayName).slice(0, 15).join(", ")}`);
      }

      if (memberLines.length > 0) {
        embed.addFields({ name: "👥 Members", value: memberLines.join("\n") });
      }

      if (!embed.data.fields || embed.data.fields.length === 0) {
        embed.setDescription(
          "No hierarchy roles found. Make sure your server roles match the names in `config.js`."
        );
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("rules").setDescription("Displays clan rules"),
    async execute(interaction) {
      const embed = baseEmbed()
        .setTitle(`🧾 ${config.CLAN_NAME} Rules`)
        .setDescription(config.RULES.map((rule, i) => `**${i + 1}.** ${rule}`).join("\n"));

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("profile")
      .setDescription("Shows a member's profile")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to view").setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser("user");
      const target = user ? await interaction.guild.members.fetch(user.id) : interaction.member;
      const rank = getMemberRank(target);

      const roles = target.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())
        .slice(0, 15)
        .join(", ") || "None";

      const embed = baseEmbed()
        .setTitle(`🧾 ${target.user.tag}`)
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          { name: "Clan Rank", value: rank ? rank.role.name : "Unranked", inline: true },
          {
            name: "Joined Server",
            value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`,
            inline: true,
          },
          {
            name: "Account Created",
            value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:D>`,
            inline: true,
          },
          { name: "Roles", value: roles }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("activity").setDescription("Shows an activity reminder"),
    async execute(interaction) {
      const embed = baseEmbed()
        .setTitle("📢 Activity Reminder")
        .setDescription(
          `Stay active, ${config.CLAN_NAME} member! Attend trainings, participate in events, and stay engaged in the server to maintain your rank and earn XP.`
        );
      await interaction.reply({ embeds: [embed] });
    },
  },
];
