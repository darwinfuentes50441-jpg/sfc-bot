const config = require("../config");

// Returns the highest-index rank role (per config.RANKS ordering) that the
// given guild member currently holds, or null if they hold none of them.
function getMemberRank(member) {
  let best = null;
  let bestIndex = -1;

  for (const role of member.roles.cache.values()) {
    const index = config.RANKS.indexOf(role.name);
    if (index > bestIndex) {
      bestIndex = index;
      best = role;
    }
  }

  return best ? { role: best, index: bestIndex } : null;
}

function findRankRole(guild, rankName) {
  return guild.roles.cache.find((r) => r.name === rankName);
}

module.exports = { getMemberRank, findRankRole };
