const { ensureBadges } = require('../services/badge.service');
const { getCommunityConfig } = require('../services/config.service');

let bootstrapped = false;
let bootstrapping = null;

async function ensureCommunityBootstrapped(req, res, next) {
  try {
    if (bootstrapped) {
      return next();
    }

    if (!bootstrapping) {
      bootstrapping = Promise.all([ensureBadges(), getCommunityConfig()]).then(() => {
        bootstrapped = true;
      });
    }

    await bootstrapping;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { ensureCommunityBootstrapped };
