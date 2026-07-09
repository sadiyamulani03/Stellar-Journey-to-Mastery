/**
 * Centralized utility to map complex Soroban RPC/Horizon transaction errors
 * and wallet connection errors into friendly, plain-English messages.
 */
export function getFriendlyErrorMessage(err: any): string {
  if (!err) return 'An unknown error occurred.';
  
  const errMsg = typeof err === 'string' ? err : err.message || String(err);
  const errLower = errMsg.toLowerCase();

  // 1. User Cancellations / Rejections
  if (
    errLower.includes('reject') ||
    errLower.includes('cancel') ||
    errLower.includes('decline') ||
    errLower.includes('closed') ||
    errLower.includes('dismissed') ||
    errLower.includes('user rejected')
  ) {
    return 'Wallet transaction cancelled by user.';
  }

  // 2. Account Not Funded
  if (
    errLower.includes('404') ||
    errLower.includes('not found') ||
    errLower.includes('not_found') ||
    errLower.includes('no account') ||
    errLower.includes('account not found')
  ) {
    return 'Stellar account not funded. Please request Testnet XLM using the Faucet button first.';
  }

  // 3. Insufficient Balance / Low Reserve
  if (
    errLower.includes('insufficient') ||
    errLower.includes('underfunded') ||
    errLower.includes('op_low_reserve') ||
    errLower.includes('tx_insufficient_fee') ||
    errLower.includes('op_underfunded') ||
    errLower.includes('balance too low')
  ) {
    return 'Insufficient balance to perform transaction (XLM or asset balance too low).';
  }

  // 4. Network Mismatch
  if (
    errLower.includes('network') ||
    errLower.includes('passphrase') ||
    errLower.includes('bad network') ||
    errLower.includes('network mismatch')
  ) {
    return 'Stellar network mismatch. Please ensure your browser wallet extension is configured to Testnet.';
  }

  // 5. Timeout
  if (errLower.includes('timeout') || errLower.includes('timed out')) {
    return 'Transaction submission timed out. Please check the transaction status in the Transaction Center.';
  }

  // Fallback to cleaner message
  return errMsg.length > 150 ? `${errMsg.substring(0, 150)}...` : errMsg;
}
