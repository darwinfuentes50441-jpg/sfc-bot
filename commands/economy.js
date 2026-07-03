const { SlashCommandBuilder } = require("discord.js");
const config = require("../config");
const { baseEmbed, errorEmbed, successEmbed } = require("../utils/embeds");
const { requireStaffRole } = require("../utils/staffCheck");
const { robCooldowns } = require("../state");
const db = require("../db");

const CURRENCY = config.ECONOMY.CURRENCY_EMOJI;
const NAME = config.ECONOMY.CURRENCY_NAME;

function fmt(amount) {
  return `${CURRENCY} **${amount.toLocaleString()}** ${NAME}`;
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("balance")
      .setDescription(`Shows your (or another member's) wallet and bank`)
      .addUserOption((opt) => opt.setName("user").setDescription("Member to check").setRequired(false)),
    async execute(interaction) {
      const target = interaction.options.getUser("user") || interaction.user;
      const { wallet, bank } = await db.getEconomy(interaction.guild.id, target.id);

      const embed = baseEmbed()
        .setTitle(`${CURRENCY} ${target.tag}'s Balance`)
        .addFields(
          { name: "Wallet", value: fmt(wallet), inline: true },
          { name: "Bank", value: fmt(bank), inline: true },
          { name: "Total", value: fmt(wallet + bank), inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("give")
      .setDescription("Give coins from your wallet to another member")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to give coins to").setRequired(true))
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to give").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const target = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");

      if (target.id === interaction.user.id) {
        return interaction.reply({
          embeds: [errorEmbed("Invalid Target", "You can't give coins to yourself.")],
          ephemeral: true,
        });
      }
      if (target.bot) {
        return interaction.reply({ embeds: [errorEmbed("Invalid Target", "You can't give coins to a bot.")], ephemeral: true });
      }

      try {
        await db.transferWallet(interaction.guild.id, interaction.user.id, target.id, amount);
        await interaction.reply({
          embeds: [successEmbed("Coins Sent", `You gave ${fmt(amount)} to ${target}.`)],
        });
      } catch (err) {
        if (err.message === "INSUFFICIENT_FUNDS") {
          return interaction.reply({
            embeds: [errorEmbed("Not Enough Coins", `You don't have ${fmt(amount)} in your wallet.`)],
            ephemeral: true,
          });
        }
        throw err;
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("deposit")
      .setDescription("Move coins from your wallet into your bank (safe from robbery)")
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to deposit").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const amount = interaction.options.getInteger("amount");
      try {
        const { wallet, bank } = await db.depositToBank(interaction.guild.id, interaction.user.id, amount);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Deposited",
              `Moved ${fmt(amount)} into your bank.\nWallet: ${fmt(wallet)} | Bank: ${fmt(bank)}`
            ),
          ],
          ephemeral: true,
        });
      } catch (err) {
        if (err.message === "INSUFFICIENT_FUNDS") {
          return interaction.reply({
            embeds: [errorEmbed("Not Enough Coins", `You don't have ${fmt(amount)} in your wallet.`)],
            ephemeral: true,
          });
        }
        throw err;
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("withdraw")
      .setDescription("Move coins from your bank back into your wallet")
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to withdraw").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      const amount = interaction.options.getInteger("amount");
      try {
        const { wallet, bank } = await db.withdrawFromBank(interaction.guild.id, interaction.user.id, amount);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Withdrawn",
              `Moved ${fmt(amount)} into your wallet.\nWallet: ${fmt(wallet)} | Bank: ${fmt(bank)}`
            ),
          ],
          ephemeral: true,
        });
      } catch (err) {
        if (err.message === "INSUFFICIENT_FUNDS") {
          return interaction.reply({
            embeds: [errorEmbed("Not Enough Coins", `You don't have ${fmt(amount)} in your bank.`)],
            ephemeral: true,
          });
        }
        throw err;
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("rob")
      .setDescription("Attempt to rob another member's wallet â only works while they're offline")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to rob").setRequired(true)),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.id === interaction.user.id) {
        return interaction.reply({ embeds: [errorEmbed("Invalid Target", "You can't rob yourself.")], ephemeral: true });
      }
      if (target.bot) {
        return interaction.reply({ embeds: [errorEmbed("Invalid Target", "You can't rob a bot.")], ephemeral: true });
      }

      const cooldownKey = `${interaction.guild.id}:${interaction.user.id}`;
      const last = robCooldowns.get(cooldownKey) || 0;
      const remaining = config.ECONOMY.ROB.COOLDOWN_MS - (Date.now() - last);
      if (remaining > 0) {
        return interaction.reply({
          embeds: [errorEmbed("On Cooldown", `You can attempt another robbery <t:${Math.floor((Date.now() + remaining) / 1000)}:R>.`)],
          ephemeral: true,
        });
      }

      const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ embeds: [errorEmbed("Not Found", "That member isn't in this server.")], ephemeral: true });
      }

      const status = targetMember.presence?.status;
      const isOffline = !status || status === "offline" || status === "invisible";
      if (!isOffline) {
        return interaction.reply({
          embeds: [errorEmbed("Target Is Online", `${target} is currently online â you can only rob offline members.`)],
          ephemeral: true,
        });
      }

      const { wallet: victimWallet } = await db.getEconomy(interaction.guild.id, target.id);
      if (victimWallet < config.ECONOMY.ROB.MIN_VICTIM_WALLET) {
        return interaction.reply({
          embeds: [errorEmbed("Not Worth It", `${target} doesn't have enough coins in their wallet to rob.`)],
          ephemeral: true,
        });
      }

      robCooldowns.set(cooldownKey, Date.now());

      const succeeded = Math.random() < config.ECONOMY.ROB.SUCCESS_CHANCE;

      if (succeeded) {
        const percent =
          config.ECONOMY.ROB.MIN_STEAL_PERCENT +
          Math.random() * (config.ECONOMY.ROB.MAX_STEAL_PERCENT - config.ECONOMY.ROB.MIN_STEAL_PERCENT);
        const amount = Math.max(1, Math.floor(victimWallet * percent));

        await db.transferWallet(interaction.guild.id, target.id, interaction.user.id, amount);

        return interaction.reply({
          embeds: [successEmbed("Robbery Successful!", `You snuck up on ${target} while they were offline and stole ${fmt(amount)}!`)],
        });
      }

      const { wallet: robberWallet } = await db.getEconomy(interaction.guild.id, interaction.user.id);
      const fine = Math.min(
        robberWallet,
        Math.floor(
          config.ECONOMY.ROB.FAIL_FINE_MIN +
            Math.random() * (config.ECONOMY.ROB.FAIL_FINE_MAX - config.ECONOMY.ROB.FAIL_FINE_MIN)
        )
      );

      if (fine > 0) {
        await db.transferWallet(interaction.guild.id, interaction.user.id, target.id, fine);
      }

      return interaction.reply({
        embeds: [
          errorEmbed(
            "Robbery Failed!",
            fine > 0
              ? `You got caught trying to rob ${target} and had to pay them ${fmt(fine)} as a penalty.`
              : `You got caught trying to rob ${target}, but you had no coins to pay a penalty.`
          ),
        ],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("givecoins")
      .setDescription("Adds coins to a member's wallet, including yourself (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to update").setRequired(true))
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount of coins to add").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const { wallet } = await db.addWallet(interaction.guild.id, target.id, amount);

      await interaction.reply({
        embeds: [successEmbed("Coins Added", `Added ${fmt(amount)} to ${target}'s wallet.\nNew wallet total: ${fmt(wallet)}`)],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("takecoins")
      .setDescription("Removes coins from a member's wallet (staff only)")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to update").setRequired(true))
      .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount of coins to remove").setRequired(true).setMinValue(1)),
    async execute(interaction) {
      if (!requireStaffRole(interaction)) return;

      const target = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const { wallet } = await db.addWallet(interaction.guild.id, target.id, -amount);

      await interaction.reply({
        embeds: [successEmbed("Coins Removed", `Removed ${fmt(amount)} from ${target}'s wallet.\nNew wallet total: ${fmt(wallet)}`)],
      });
    },
  },
];
