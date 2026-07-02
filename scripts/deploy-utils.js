function buildDeploymentMetadata({ network, adminPublicKey, contractIds }) {
  return {
    network,
    admin: adminPublicKey,
    loyaltyTokenId: contractIds.loyaltyTokenId,
    paymentLoggerId: contractIds.paymentLoggerId,
    resolverId: contractIds.resolverId,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  buildDeploymentMetadata,
};
