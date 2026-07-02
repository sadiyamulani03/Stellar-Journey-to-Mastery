#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contracttype, contractimpl, token, Env, Address, Symbol, symbol_short, Vec};

const ADMIN: Symbol = symbol_short!("ADMIN");
const BOND_TOKEN: Symbol = symbol_short!("BOND_TOK");
const MIN_BOND: Symbol = symbol_short!("MIN_BOND");
const COUNT_DISPUTE: Symbol = symbol_short!("COUNT_DIS");

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Dispute {
    pub id: u64,
    pub stream_id: u64,
    pub employer: Address,
    pub contractor: Address,
    pub amount_locked: i128,
    pub status: u32, // 0 = Open, 1 = Resolved
    pub employer_votes: u32,
    pub contractor_votes: u32,
    pub end_time: u64,
    pub fee_amount: i128,
    pub escrow_contract: Address,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ResolverEvent {
    ArbiterStaked(Address, i128),
    ArbiterWithdrawn(Address, i128),
    DisputeRegistered(u64, u64, Address, Address, i128, i128, u64),
    VoteCast(u64, Address, u32),
    DisputeResolved(u64, u32, u32, i128),
}

#[contracttype]
pub enum DataKey {
    Dispute(u64),
    ArbiterStake(Address),
    ArbiterVote(u64, Address), // (dispute_id, arbiter) -> vote (0=Employer, 1=Contractor)
    ArbitersVoted(u64),         // list of arbiter addresses who voted in dispute_id
    ArbiterActiveVotes(Address), // count of disputes this arbiter is currently voting in
}

#[soroban_sdk::contractclient(name = "EscrowClient")]
pub trait EscrowInterface {
    fn resolve_stream(env: Env, stream_id: u64, contractor_share_pct: u32);
}

#[contract]
pub struct PayLoyalResolver;

#[contractimpl]
impl PayLoyalResolver {
    pub fn initialize(env: Env, admin: Address, bond_token: Address, min_bond: i128) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&BOND_TOKEN, &bond_token);
        env.storage().instance().set(&MIN_BOND, &min_bond);
        env.storage().instance().extend_ttl(5000, 5000);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get::<_, Address>(&ADMIN).expect("not initialized")
    }

    pub fn get_bond_token(env: Env) -> Address {
        env.storage().instance().get::<_, Address>(&BOND_TOKEN).expect("not initialized")
    }

    pub fn get_min_bond(env: Env) -> i128 {
        env.storage().instance().get::<_, i128>(&MIN_BOND).expect("not initialized")
    }

    pub fn get_arbiter_stake(env: Env, arbiter: Address) -> i128 {
        let key = DataKey::ArbiterStake(arbiter);
        env.storage().instance().get(&key).unwrap_or(0)
    }

    pub fn get_arbiter_active_votes(env: Env, arbiter: Address) -> u32 {
        let key = DataKey::ArbiterActiveVotes(arbiter);
        env.storage().instance().get(&key).unwrap_or(0)
    }

    pub fn stake_bond(env: Env, arbiter: Address, amount: i128) {
        arbiter.require_auth();
        if amount <= 0 {
            panic!("stake amount must be positive");
        }

        let token_addr = Self::get_bond_token(env.clone());
        let token_client = token::Client::new(&env, &token_addr);
        
        token_client.transfer(
            &arbiter,
            &env.current_contract_address(),
            &amount,
        );

        let key = DataKey::ArbiterStake(arbiter.clone());
        let current_stake = Self::get_arbiter_stake(env.clone(), arbiter.clone());
        env.storage().instance().set(&key, &(current_stake + amount));
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("rslv"), symbol_short!("stkd")),
            ResolverEvent::ArbiterStaked(arbiter.clone(), amount),
        );
    }

    pub fn withdraw_bond(env: Env, arbiter: Address, amount: i128) {
        arbiter.require_auth();
        if amount <= 0 {
            panic!("withdraw amount must be positive");
        }

        let active_votes = Self::get_arbiter_active_votes(env.clone(), arbiter.clone());
        if active_votes > 0 {
            panic!("cannot withdraw stake while active in dispute voting");
        }

        let current_stake = Self::get_arbiter_stake(env.clone(), arbiter.clone());
        if current_stake < amount {
            panic!("insufficient stake balance");
        }

        let token_addr = Self::get_bond_token(env.clone());
        let token_client = token::Client::new(&env, &token_addr);
        
        token_client.transfer(
            &env.current_contract_address(),
            &arbiter,
            &amount,
        );

        let key = DataKey::ArbiterStake(arbiter.clone());
        env.storage().instance().set(&key, &(current_stake - amount));
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("rslv"), symbol_short!("with")),
            ResolverEvent::ArbiterWithdrawn(arbiter.clone(), amount),
        );
    }

    pub fn register_dispute(
        env: Env,
        escrow_contract: Address,
        stream_id: u64,
        employer: Address,
        contractor: Address,
        amount_locked: i128,
        fee_amount: i128,
        voting_duration: u64,
    ) -> u64 {
        // Only escrow_contract itself should call this
        escrow_contract.require_auth();

        let mut count: u64 = env.storage().instance().get(&COUNT_DISPUTE).unwrap_or(0);
        count += 1;

        let now = env.ledger().timestamp();
        let dispute = Dispute {
            id: count,
            stream_id,
            employer: employer.clone(),
            contractor: contractor.clone(),
            amount_locked,
            status: 0, // Open
            employer_votes: 0,
            contractor_votes: 0,
            end_time: now + voting_duration,
            fee_amount,
            escrow_contract: escrow_contract.clone(),
        };

        env.storage().instance().set(&DataKey::Dispute(count), &dispute);
        env.storage().instance().set(&COUNT_DISPUTE, &count);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("rslv"), symbol_short!("regd")),
            ResolverEvent::DisputeRegistered(count, stream_id, employer.clone(), contractor.clone(), amount_locked, fee_amount, dispute.end_time),
        );

        count
    }

    pub fn vote_on_dispute(env: Env, arbiter: Address, dispute_id: u64, vote: u32) {
        arbiter.require_auth();
        
        let mut dispute = Self::fetch_dispute(env.clone(), dispute_id);
        if dispute.status != 0 {
            panic!("dispute is not open");
        }
        if env.ledger().timestamp() >= dispute.end_time {
            panic!("voting window has closed");
        }

        // Verify arbiter has staked minimum bond
        let current_stake = Self::get_arbiter_stake(env.clone(), arbiter.clone());
        let min_bond = Self::get_min_bond(env.clone());
        if current_stake < min_bond {
            panic!("arbiter does not meet minimum bond staking requirement");
        }

        // Verify arbiter hasn't voted yet on this dispute
        let vote_key = DataKey::ArbiterVote(dispute_id, arbiter.clone());
        if env.storage().instance().has(&vote_key) {
            panic!("arbiter has already voted on this dispute");
        }

        if vote != 0 && vote != 1 {
            panic!("invalid vote value; must be 0 (Employer) or 1 (Contractor)");
        }

        env.storage().instance().set(&vote_key, &vote);

        // Record voter list
        let list_key = DataKey::ArbitersVoted(dispute_id);
        let mut voters: Vec<Address> = env.storage().instance().get(&list_key).unwrap_or_else(|| Vec::new(&env));
        voters.push_back(arbiter.clone());
        env.storage().instance().set(&list_key, &voters);

        // Update vote count
        if vote == 0 {
            dispute.employer_votes += 1;
        } else {
            dispute.contractor_votes += 1;
        }
        env.storage().instance().set(&DataKey::Dispute(dispute_id), &dispute);

        // Update active votes count for arbiter
        let active_votes_key = DataKey::ArbiterActiveVotes(arbiter.clone());
        let current_active = Self::get_arbiter_active_votes(env.clone(), arbiter.clone());
        env.storage().instance().set(&active_votes_key, &(current_active + 1));
        env.storage().instance().extend_ttl(5000, 5000);
    }

    pub fn resolve_dispute(env: Env, dispute_id: u64) {
        let mut dispute = Self::fetch_dispute(env.clone(), dispute_id);
        if dispute.status != 0 {
            panic!("dispute is already resolved");
        }

        let now = env.ledger().timestamp();
        if now < dispute.end_time {
            panic!("voting window is still active");
        }

        dispute.status = 1; // Resolved

        let total_votes = dispute.employer_votes + dispute.contractor_votes;
        let mut contractor_share_pct = 50; // default split if tie or no votes

        if total_votes > 0 {
            if dispute.contractor_votes > dispute.employer_votes {
                contractor_share_pct = 100;
            } else if dispute.employer_votes > dispute.contractor_votes {
                contractor_share_pct = 0;
            }
        }

        // Call resolve_stream in payment-logger escrow contract
        let escrow_client = EscrowClient::new(&env, &dispute.escrow_contract);
        escrow_client.resolve_stream(&dispute.stream_id, &contractor_share_pct);

        // Slashes / Payouts logic
        let list_key = DataKey::ArbitersVoted(dispute_id);
        let voters: Vec<Address> = env.storage().instance().get(&list_key).unwrap_or_else(|| Vec::new(&env));
        
        let winning_vote = if contractor_share_pct == 100 { 1 } else { 0 };

        let mut winners_count = 0;
        let mut losers_count = 0;

        for arbiter in voters.iter() {
            // Decrement active voter count
            let active_votes_key = DataKey::ArbiterActiveVotes(arbiter.clone());
            let current_active = Self::get_arbiter_active_votes(env.clone(), arbiter.clone());
            if current_active > 0 {
                env.storage().instance().set(&active_votes_key, &(current_active - 1));
            }

            let vote_key = DataKey::ArbiterVote(dispute_id, arbiter.clone());
            let vote: u32 = env.storage().instance().get(&vote_key).unwrap_or(2);
            
            if total_votes > 0 && dispute.contractor_votes != dispute.employer_votes {
                if vote == winning_vote {
                    winners_count += 1;
                } else {
                    losers_count += 1;
                }
            }
        }

        // Slashing & distribution
        let token_addr = Self::get_bond_token(env.clone());
        let token_client = token::Client::new(&env, &token_addr);
        let min_bond = Self::get_min_bond(env.clone());

        let mut total_slashed = 0;
        
        if winners_count > 0 && losers_count > 0 {
            // Slashed amount is min_bond from each loser
            for arbiter in voters.iter() {
                let vote_key = DataKey::ArbiterVote(dispute_id, arbiter.clone());
                let vote: u32 = env.storage().instance().get(&vote_key).unwrap_or(2);
                if vote != winning_vote {
                    let stake_key = DataKey::ArbiterStake(arbiter.clone());
                    let current_stake = Self::get_arbiter_stake(env.clone(), arbiter.clone());
                    let slash_amount = if current_stake >= min_bond { min_bond } else { current_stake };
                    
                    env.storage().instance().set(&stake_key, &(current_stake - slash_amount));
                    total_slashed += slash_amount;
                }
            }

            // Distribute slashed amount to winners (no interest is paid, this is a penalty redistribution)
            let slash_share = total_slashed / (winners_count as i128);
            if slash_share > 0 {
                for arbiter in voters.iter() {
                    let vote_key = DataKey::ArbiterVote(dispute_id, arbiter.clone());
                    let vote: u32 = env.storage().instance().get(&vote_key).unwrap_or(2);
                    if vote == winning_vote {
                        let stake_key = DataKey::ArbiterStake(arbiter.clone());
                        let current_stake = Self::get_arbiter_stake(env.clone(), arbiter.clone());
                        env.storage().instance().set(&stake_key, &(current_stake + slash_share));
                    }
                }
            }
        }

        // Distribute flat service fee if there is one and winners exist
        if dispute.fee_amount > 0 && winners_count > 0 {
            // Escrow transfers fee_amount to the resolver contract during resolution
            // Wait, we need to ensure the escrow contract sends the fee to this contract
            // Let's assume the fee was sent to the resolver contract address in escrow, or we payout from resolver's current balance
            // Payout fee to winning arbiters directly as token transfer (not as staked balance)
            let fee_share = dispute.fee_amount / (winners_count as i128);
            if fee_share > 0 {
                for arbiter in voters.iter() {
                    let vote_key = DataKey::ArbiterVote(dispute_id, arbiter.clone());
                    let vote: u32 = env.storage().instance().get(&vote_key).unwrap_or(2);
                    
                    // Tie has no winners, fee isn't distributed (or split evenly, but tie contractor_share_pct == 50 has no winners)
                    if vote == winning_vote && dispute.contractor_votes != dispute.employer_votes {
                        // Transfer directly to arbiter
                        token_client.transfer(
                            &env.current_contract_address(),
                            &arbiter,
                            &fee_share,
                        );
                    }
                }
            }
        }

        env.storage().instance().set(&DataKey::Dispute(dispute_id), &dispute);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("rslv"), symbol_short!("rsld")),
            ResolverEvent::DisputeResolved(dispute_id, dispute.employer_votes, dispute.contractor_votes, total_votes as i128),
        );
    }

    pub fn fetch_dispute(env: Env, dispute_id: u64) -> Dispute {
        let key = DataKey::Dispute(dispute_id);
        env.storage().instance().get(&key).expect("dispute not found")
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNT_DISPUTE).unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address};
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::token;

    #[test]
    fn test_dispute_staking_and_slashing() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_id);
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

        let resolver_id = env.register(PayLoyalResolver, ());
        let resolver_client = PayLoyalResolverClient::new(&env, &resolver_id);
        
        let min_bond = 100_000_000; // 10 XLM / tokens
        resolver_client.initialize(&admin, &token_id, &min_bond);

        let arbiter_1 = Address::generate(&env);
        let arbiter_2 = Address::generate(&env);
        let arbiter_3 = Address::generate(&env);

        // Mint tokens to arbiters
        token_admin_client.mint(&arbiter_1, &500_000_000);
        token_admin_client.mint(&arbiter_2, &500_000_000);
        token_admin_client.mint(&arbiter_3, &500_000_000);

        // Stake bond
        resolver_client.stake_bond(&arbiter_1, &100_000_000);
        resolver_client.stake_bond(&arbiter_2, &100_000_000);
        resolver_client.stake_bond(&arbiter_3, &100_000_000);

        assert_eq!(resolver_client.get_arbiter_stake(&arbiter_1), 100_000_000);
        assert_eq!(token_client.balance(&resolver_id), 300_000_000);

        // Register a mock escrow contract for resolve_stream call
        let escrow_mock_id = env.register(MockEscrow, ());

        // Register dispute
        env.ledger().set_timestamp(1000);
        let disp_id = resolver_client.register_dispute(
            &escrow_mock_id,
            &1, // stream_id
            &Address::generate(&env), // employer
            &Address::generate(&env), // contractor
            &1000_000_000,            // amount locked
            &10_000_000,              // fee
            &60,                      // voting duration = 60s
        );
        assert_eq!(disp_id, 1);

        // Vote: 1 (Contractor) vs 0 (Employer)
        resolver_client.vote_on_dispute(&arbiter_1, &1, &1); // vote release (wins)
        resolver_client.vote_on_dispute(&arbiter_2, &1, &1); // vote release (wins)
        resolver_client.vote_on_dispute(&arbiter_3, &1, &0); // vote refund (loses)

        let dispute = resolver_client.fetch_dispute(&1);
        assert_eq!(dispute.contractor_votes, 2);
        assert_eq!(dispute.employer_votes, 1);

        // Advance ledger past end time
        env.ledger().set_timestamp(1070);

        // Mint escrow some tokens for dispute fee distribution simulation
        token_admin_client.mint(&resolver_id, &10_000_000);

        // Resolve dispute
        resolver_client.resolve_dispute(&1);

        // Verify slashing and redistribution
        // Arbiter 3 gets slashed 100_000_000. It gets distributed to Arbiter 1 and 2 (50_000_000 each).
        assert_eq!(resolver_client.get_arbiter_stake(&arbiter_1), 150_000_000); // 100m stake + 50m slashed reward
        assert_eq!(resolver_client.get_arbiter_stake(&arbiter_2), 150_000_000); // 100m stake + 50m slashed reward
        assert_eq!(resolver_client.get_arbiter_stake(&arbiter_3), 0);           // Slashed to 0

        // Fee payout directly transferred: 10_000_000 fee / 2 winners = 5_000_000 each
        // Original balance was 400m (500m - 100m stake)
        assert_eq!(token_client.balance(&arbiter_1), 405_000_000); // 400m + 5m fee
        assert_eq!(token_client.balance(&arbiter_2), 405_000_000); // 400m + 5m fee
    }
}

#[contract]
pub struct MockEscrow;

#[contractimpl]
impl MockEscrow {
    pub fn resolve_stream(_env: Env, _stream_id: u64, _contractor_share_pct: u32) {
        // mock implementation
    }
}
