import { describe, expect, it } from 'vitest';
import { buildDeploymentMetadata } from '../../scripts/deploy-utils.js';

describe('deployment metadata', () => {
  it('creates deployment metadata with contract addresses and timestamps', () => {
    const metadata = buildDeploymentMetadata({
      network: 'testnet',
      adminPublicKey: 'GB123',
      contractIds: {
        loyaltyTokenId: 'CC1',
        paymentLoggerId: 'CA1',
        resolverId: 'CC2',
      },
    });

    expect(metadata.network).toBe('testnet');
    expect(metadata.admin).toBe('GB123');
    expect(metadata.loyaltyTokenId).toBe('CC1');
    expect(metadata.paymentLoggerId).toBe('CA1');
    expect(metadata.resolverId).toBe('CC2');
    expect(metadata.timestamp).toBeTruthy();
  });
});
