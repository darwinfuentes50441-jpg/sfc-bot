const config = require("../config");

function hasStaffRole(member) {
  return member.roles.cache.some((r) => config.STAFF_ROLES.includes(r.name));
}

function hasOwnerRole(member) {
  return member.roles.cache.some((r) => r.name === config.OWNER_ROLE);
}

// Replies with the exact required denial message and returns false if the
// interaction's member is not on a staff role. Returns true otherwise.
function requireStaffRole(interaction) {
  if (!hasStaffRole(interaction.member)) {
    interaction.reply({ content: config.NO_PERMISSION_MESSAGE, ephemeral: true });
    return false;
  }
  return true;
}

function requireOwnerRole(interaction) {
  if (!hasOwnerRole(interaction.member)) {
    interaction.reply({ content: config.NO_PERMISSION_MESSAGE, ephemeral: true });
    return false;
  }
  return true;
}

module.exports = { hasStaffRole, hasOwnerRole, requireStaffRole, requireOwnerRole };
