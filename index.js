require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { startKeepAliveServer } = require("./keepAlive");
const { errorEmbed, successEmbed } = require("./utils/embeds");
const { handleGuildMemberAdd } = require("./systems/antiRaid");
const { sendWelcomeMessage } = require("./systems/welcome");
const { handleVerifyButton } = require("./systems/verify");
const { createTicketChannel, isTicketOpener } = require("./systems/tickets");
const { isRoleMenuMessage, extractRoleIdFromEmbed } = require("./systems/rolemenu");
const { hasStaffRole } = require("./utils/staffCheck");
const { rollcallCheckins, xpCooldowns, coinCooldowns } = require("./state");
const db = require("./db");

// ---------------------------------------------------------------------------
// 24/7 KEEP-ALIVE SERVER
// See src/keepAlive.js for the full explanation + UptimeRobot instructions.
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8000;
startKeepAliveServer(PORT);

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error(
    "❌ Missing DISCORD_BOT_TOKEN. Set it in Replit Secrets (Tools > Secrets) before starting the bot."
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    // Needed so /rob can check whether the target member is online or offline.
    // Requires "Presence Intent" to be enabled in the Discord Developer Portal
    // (Bot settings > Privileged Gateway Intents) or login will fail.
    GatewayIntentBits.GuildPresences,
  ],
  // Message/Reaction/User partials are required so reaction events still fire
  // for messages/reactions the bot hasn't cached (e.g. after a restart).
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

// ---------------------------------------------------------------------------
// Command loader — every file in ./commands exports an array of
// { data: SlashCommandBuilder, execute(interaction) } command defs.
// ---------------------------------------------------------------------------
client.commands = new Collection();

const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const commandModule = require(path.join(commandsDir, file));
  for (const command of commandModule) {
    client.commands.set(command.data.name, command);
  }
}

const commandData = [...client.commands.values()].map((c) => c.data.toJSON());

async function registerCommandsForGuild(guild) {
  try {
    await guild.commands.set(commandData);
  } catch (err) {
    console.error(`Failed to register slash commands for guild ${guild.id}:`, err);
  }
}

client.once("clientReady", async () => {
  try {
    await db.init();
    console.log("🗄️  Database ready (warnings, XP, applications).");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
  }

  console.log(`✅ SFC Assistant is online and running 24/7 system active`);
  console.log(`Logged in as ${client.user.tag} | ${client.commands.size} commands loaded`);
  client.user.setActivity(`/help | ${config.CLAN_NAME}`);

  for (const guild of client.guilds.cache.values()) {
    await registerCommandsForGuild(guild);
  }
  console.log(`Slash commands registered in ${client.guilds.cache.size} server(s).`);
});

// ---------------------------------------------------------------------------
// Activity XP — members earn XP for chatting, with a per-user cooldown so
// spamming doesn't inflate the leaderboard.
// ---------------------------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const last = xpCooldowns.get(key) || 0;
  if (now - last < config.XP.COOLDOWN_MS) return;

  xpCooldowns.set(key, now);
  const amount =
    Math.floor(Math.random() * (config.XP.MAX_PER_MESSAGE - config.XP.MIN_PER_MESSAGE + 1)) +
    config.XP.MIN_PER_MESSAGE;

  try {
    await db.addXp(message.guild.id, message.author.id, amount);
  } catch (err) {
    console.error("Failed to add activity XP:", err);
  }
});

// ---------------------------------------------------------------------------
// Passive coin earning — separate cooldown from XP so the two systems can be
// tuned independently.
// ---------------------------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const last = coinCooldowns.get(key) || 0;
  if (now - last < config.ECONOMY.CHAT_EARN_COOLDOWN_MS) return;

  coinCooldowns.set(key, now);
  const amount =
    Math.floor(Math.random() * (config.ECONOMY.CHAT_EARN_MAX - config.ECONOMY.CHAT_EARN_MIN + 1)) +
    config.ECONOMY.CHAT_EARN_MIN;

  try {
    await db.addWallet(message.guild.id, message.author.id, amount);
  } catch (err) {
    console.error("Failed to add chat coins:", err);
  }
});

// Register commands automatically if the bot is invited to a new server later.
client.on("guildCreate", (guild) => registerCommandsForGuild(guild));

// ---------------------------------------------------------------------------
// Anti-raid system — runs on every member join.
// ---------------------------------------------------------------------------
client.on("guildMemberAdd", (member) => {
  handleGuildMemberAdd(member).catch((err) => console.error("Anti-raid handler error:", err));
  sendWelcomeMessage(member).catch((err) => console.error("Welcome message error:", err));
});

// ---------------------------------------------------------------------------
// Interaction handling: slash commands, role menu, verify button.
// ---------------------------------------------------------------------------
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error running command "${interaction.commandName}":`, err);
      const payload = {
        embeds: [
          errorEmbed(
            "Something Went Wrong",
            "That command hit an unexpected error. Please try again or contact staff."
          ),
        ],
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === "verify:confirm") {
    await handleVerifyButton(interaction).catch((err) => console.error("Verify button error:", err));
    return;
  }

  if (interaction.isButton() && interaction.customId === "rollcall:checkin") {
    try {
      const set = rollcallCheckins.get(interaction.message.id) || new Set();
      set.add(interaction.user.id);
      rollcallCheckins.set(interaction.message.id, set);

      const names = [...set].map((id) => `<@${id}>`).join(", ") || "_none yet_";
      const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(
        `Click below to confirm you're active and present.\n\n**Checked in (${set.size}):** ${names}`
      );

      await interaction.update({ embeds: [embed] });
    } catch (err) {
      console.error("Rollcall button error:", err);
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket:create") {
    try {
      const typeId = interaction.values[0];
      const type = config.TICKETS.TYPES.find((t) => t.id === typeId);
      if (!type) return;

      const modal = new ModalBuilder().setCustomId(`ticket:modal:${typeId}`).setTitle(`${type.label} Ticket`);
      const descriptionInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Describe what you need help with")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));
      await interaction.showModal(modal);
    } catch (err) {
      console.error("Ticket select menu error:", err);
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket:modal:")) {
    try {
      const typeId = interaction.customId.split(":")[2];
      const type = config.TICKETS.TYPES.find((t) => t.id === typeId);
      const description = interaction.fields.getTextInputValue("description");

      await interaction.deferReply({ ephemeral: true });
      const channel = await createTicketChannel(interaction.guild, interaction.member, type, description);
      await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
    } catch (err) {
      console.error("Ticket modal submit error:", err);
      const payload = { content: "⚠️ I couldn't create your ticket. Please contact staff directly." };
      if (interaction.deferred) await interaction.editReply(payload).catch(() => {});
      else await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === "ticket:close") {
    try {
      const channel = interaction.channel;
      if (!hasStaffRole(interaction.member) && !isTicketOpener(channel, interaction.user.id)) {
        return interaction.reply({ content: config.NO_PERMISSION_MESSAGE, ephemeral: true });
      }

      await interaction.reply({
        embeds: [successEmbed("Closing Ticket", "This ticket will be deleted in 5 seconds.")],
      });
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    } catch (err) {
      console.error("Ticket close button error:", err);
    }
    return;
  }

});

// ---------------------------------------------------------------------------
// Reaction role menu — reacting adds the mapped role, removing the reaction
// removes it. The role mapping is read straight from the embed fields on the
// message itself (emoji name -> role mention), so it survives bot restarts.
// ---------------------------------------------------------------------------
async function handleRoleMenuReaction(reaction, user, action) {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (!isRoleMenuMessage(reaction.message)) return;

    const roleId = extractRoleIdFromEmbed(reaction.message, reaction.emoji.name);
    if (!roleId) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id);
    if (action === "add") {
      await member.roles.add(roleId);
    } else {
      await member.roles.remove(roleId);
    }
  } catch (err) {
    console.error(`Role menu reaction ${action} error:`, err);
  }
}

client.on("messageReactionAdd", (reaction, user) => handleRoleMenuReaction(reaction, user, "add"));
client.on("messageReactionRemove", (reaction, user) => handleRoleMenuReaction(reaction, user, "remove"));

client.login(process.env.DISCORD_BOT_TOKEN);
