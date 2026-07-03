const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole, requireOwnerRole } = require("../utils/staffCheck");
const { getMemberRank, findRankRole } = require("../utils/ranks");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("promote")
      .setDescription("Promotes a member to the next rank (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to promote").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = await interaction.guild.members.fetch(interaction.options.getUser("user").id);
      const current = getMemberRank(target);
      const nextIndex = current ? current.index + 1 : 0;

      if (nextIndex >= config.RANKS.length) {
        return interaction.reply({
          embeds: [errorEmbed("Already Max Rank", `${target} is already at the highest rank.`)],
        });
      }

      const nextRoleName = config.RANKS[nextIndex];
      const nextRole = findRankRole(interaction.guild, nextRoleName);
      if (!nextRole) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Role Not Found",
              `The role \`${nextRoleName}\` doesn't exist in this server. Create it or update \`config.js\`.`
            ),
          ],
        });
      }

      try {
        if (current) await target.roles.remove(current.role);
        await target.roles.add(nextRole);
        await interaction.reply({
          embeds: [successEmbed("Member Promoted", `${target} has been promoted to **${nextRoleName}**.`)],
        });
      } catch (err) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Failed to Promote",
              "I couldn't change that member's roles. Check that my role is above theirs in the role list."
            ),
          ],
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("demote")
      .setDescription("Demotes a member to the previous rank (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to demote").setRequired(true)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = await interaction.guild.members.fetch(interaction.options.getUser("user").id);
      const current = getMemberRank(target);

      if (!current || current.index === 0) {
        return interaction.reply({
          embeds: [errorEmbed("Already Lowest Rank", `${target} has no rank to demote from.`)],
        });
      }

      const prevRoleName = config.RANKS[current.index - 1];
      const prevRole = findRankRole(interaction.guild, prevRoleName);
      if (!prevRole) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Role Not Found",
              `The role \`${prevRoleName}\` doesn't exist in this server. Create it or update \`config.js\`.`
            ),
          ],
        });
      }

      try {
        await target.roles.remove(current.role);
        await target.roles.add(prevRole);
        await interaction.reply({
          embeds: [successEmbed("Member Demoted", `${target} has been demoted to **${prevRoleName}**.`)],
        });
      } catch (err) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Failed to Demote",
              "I couldn't change that member's roles. Check that my role is above theirs in the role list."
            ),
          ],
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("setrank")
      .setDescription("Directly sets a member's rank (Ownership only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to update").setRequired(true))
      .addStringOption((opt) =>
        opt
          .setName("rank")
          .setDescription("Rank to assign")
          .setRequired(true)
          .addChoices(...config.RANKS.map((r) => ({ name: r, value: r })))
      ),
    async execute(interaction) {
      if (!requireOwnerRole(interaction)) return;

      const target = await interaction.guild.members.fetch(interaction.options.getUser("user").id);
      const rankName = interaction.options.getString("rank");
      const newRole = findRankRole(interaction.guild, rankName);

      if (!newRole) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              "Role Not Found",
              `The role \`${rankName}\` doesn't exist in this server. Create it or update \`config.js\`.`
            ),
          ],
        });
      }

      try {
        const rolesToRemove = target.roles.cache.filter((r) => config.RANKS.includes(r.name));
        if (rolesToRemove.size > 0) await target.roles.remove(rolesToRemove);
        await target.roles.add(newRole);
        await interaction.reply({
          embeds: [successEmbed("Rank Set", `${target}'s rank has been set to **${rankName}**.`)],
        });
      } catch (err) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Failed to Set Rank",
              "I couldn't change that member's roles. Check that my role is above theirs in the role list."
            ),
          ],
        });
      }
    },
  },
  {
    data: new SlashCommandBuilder().setName("ranklist").setDescription("Shows all ranks in order"),
    async execute(interaction) {
      const embed = baseEmbed()
        .setTitle(`🧾 ${config.CLAN_NAME} Rank List`)
        .setDescription(
          [...config.RANKS]
            .reverse()
            .map((rank, i) => `**${config.RANKS.length - i}.** ${rank}`)
            .join("\n")
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
];
