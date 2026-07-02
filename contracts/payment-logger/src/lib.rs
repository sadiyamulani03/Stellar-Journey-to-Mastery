#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contracttype, contractimpl, token, Env, Address, String, Symbol, symbol_short, BytesN};

const ADMIN: Symbol = symbol_short!("ADMIN");
const LOYALTY_ADDR: Symbol = symbol_short!("LOY_ADDR");
const RESOLVER_ADDR: Symbol = symbol_short!("RES_ADDR");
const COUNT_STREAM: Symbol = symbol_short!("COUNT_STR");
const DISPUTE_FEE_PCT: i128 = 5; // 5% flat dispute fee

#[soroban_sdk::contractclient(name = "PayLoyalResolverClient")]
pub trait PayLoyalResolverInterface {
    fn register_dispute(
        env: Env,
        escrow_contract: Address,
        stream_id: u64,
        employer: Address,
        contractor: Address,
        amount_locked: i128,
        fee_amount: i128,
        voting_duration: u64,
    ) -> u64;
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Stream {
    pub id: u64,
    pub employer: Address,
    pub contractor: Address,
    pub token: Address,
    pub amount: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub withdrawn_amount: i128,
    pub status: u32, // 0 = Created, 1 = Active, 2 = Completed, 3 = Paused, 4 = Disputed
    pub title: String,
    pub last_paused_time: u64,
    pub total_paused_duration: u64,
}

#[contracttype]
pub enum DataKey {
    Stream(u64),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowEvent {
    StreamCreated(u64, Address, Address, i128, String),
    StreamFunded(u64, Address, u64, u64),
    StreamPaused(u64, u64),
    StreamResumed(u64, u64),
    WagesWithdrawn(u64, Address, i128),
    DisputeRaised(u64, u64),
    StreamResolved(u64, i128, i128), // stream_id, released to contractor, refunded to employer
    LoyaltyConfigured(Address),
    ResolverConfigured(Address),
    ContractUpgraded(BytesN<32>),
}

#[soroban_sdk::contractclient(name = "LoyaltyClient")]
pub trait LoyaltyInterface {
    fn add_points(env: Env, caller: Address, user: Address, amount: i128) -> i128;
}

#[contract]
pub struct PaymentLogger;

#[contractimpl]
impl PaymentLogger {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().extend_ttl(5000, 5000);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get::<_, Address>(&ADMIN).expect("not initialized")
    }

    pub fn set_loyalty_token(env: Env, address: Address) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();
        env.storage().instance().set(&LOYALTY_ADDR, &address);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("loy_set")),
            EscrowEvent::LoyaltyConfigured(address),
        );
    }

    pub fn get_loyalty_token(env: Env) -> Option<Address> {
        env.storage().instance().get(&LOYALTY_ADDR)
    }

    pub fn set_dispute_resolver(env: Env, address: Address) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();
        env.storage().instance().set(&RESOLVER_ADDR, &address);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("res_set")),
            EscrowEvent::ResolverConfigured(address),
        );
    }

    pub fn get_dispute_resolver(env: Env) -> Option<Address> {
        env.storage().instance().get(&RESOLVER_ADDR)
    }

    pub fn create_stream(
        env: Env,
        employer: Address,
        contractor: Address,
        token: Address,
        amount: i128,
        duration_seconds: u64,
        title: String,
    ) -> u64 {
        employer.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        if duration_seconds <= 0 {
            panic!("duration must be positive");
        }

        let mut count: u64 = env.storage().instance().get(&COUNT_STREAM).unwrap_or(0);
        count += 1;

        let stream = Stream {
            id: count,
            employer: employer.clone(),
            contractor,
            token,
            amount,
            start_time: 0,
            end_time: duration_seconds, // temporarily stores duration before funding
            withdrawn_amount: 0,
            status: 0, // Created
            title: title.clone(),
            last_paused_time: 0,
            total_paused_duration: 0,
        };

        env.storage().instance().set(&DataKey::Stream(count), &stream);
        env.storage().instance().set(&COUNT_STREAM, &count);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("created")),
            EscrowEvent::StreamCreated(count, employer, stream.contractor.clone(), amount, title),
        );

        count
    }

    pub fn fund_stream(env: Env, stream_id: u64) {
        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 0 {
            panic!("stream is not in Created status");
        }

        stream.employer.require_auth();

        let token_client = token::Client::new(&env, &stream.token);
        token_client.transfer(
            &stream.employer,
            &env.current_contract_address(),
            &stream.amount,
        );

        let now = env.ledger().timestamp();
        let duration = stream.end_time; // end_time temporarily held duration
        stream.start_time = now;
        stream.end_time = now + duration;
        stream.status = 1; // Active

        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("funded")),
            EscrowEvent::StreamFunded(stream_id, stream.employer.clone(), stream.start_time, stream.end_time),
        );
    }

    pub fn pause_stream(env: Env, stream_id: u64) {
        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 1 {
            panic!("stream is not Active");
        }

        stream.employer.require_auth();

        let now = env.ledger().timestamp();
        stream.status = 3; // Paused
        stream.last_paused_time = now;

        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("paused")),
            EscrowEvent::StreamPaused(stream_id, now),
        );
    }

    pub fn resume_stream(env: Env, stream_id: u64) {
        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 3 {
            panic!("stream is not Paused");
        }

        stream.employer.require_auth();

        let now = env.ledger().timestamp();
        let pause_diff = now - stream.last_paused_time;
        stream.total_paused_duration += pause_diff;
        stream.status = 1; // Active

        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("resumed")),
            EscrowEvent::StreamResumed(stream_id, now),
        );
    }

    pub fn calculate_earned(_env: Env, stream: Stream, current_time: u64) -> i128 {
        if stream.status == 0 {
            return 0;
        }
        if stream.status == 2 {
            return stream.amount;
        }

        let duration = (stream.end_time - stream.start_time) as i128;
        if duration <= 0 {
            return stream.amount;
        }

        let calculation_time = match stream.status {
            3 => stream.last_paused_time, // frozen at pause time
            4 => stream.last_paused_time, // frozen at dispute time
            _ => current_time,
        };

        let elapsed = if calculation_time <= stream.start_time {
            0
        } else {
            (calculation_time - stream.start_time - stream.total_paused_duration) as i128
        };

        if elapsed >= duration {
            stream.amount
        } else if elapsed <= 0 {
            0
        } else {
            (stream.amount * elapsed) / duration
        }
    }

    pub fn calculate_withdrawable(env: Env, stream_id: u64, current_timestamp: u64) -> i128 {
        let stream = Self::fetch_stream(env.clone(), stream_id);
        let earned = Self::calculate_earned(env.clone(), stream.clone(), current_timestamp);
        let withdrawable = earned - stream.withdrawn_amount;
        if withdrawable <= 0 {
            0
        } else {
            withdrawable
        }
    }

    pub fn withdraw_wages(env: Env, stream_id: u64) {
        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 1 && stream.status != 3 {
            panic!("stream is not withdrawable");
        }

        stream.contractor.require_auth();

        let now = env.ledger().timestamp();
        let earned = Self::calculate_earned(env.clone(), stream.clone(), now);
        let withdrawable = earned - stream.withdrawn_amount;

        if withdrawable <= 0 {
            panic!("no wages earned to withdraw");
        }

        let token_client = token::Client::new(&env, &stream.token);
        token_client.transfer(
            &env.current_contract_address(),
            &stream.contractor,
            &withdrawable,
        );

        stream.withdrawn_amount += withdrawable;
        if stream.withdrawn_amount >= stream.amount {
            stream.status = 2; // Completed
        }

        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("withdrew")),
            EscrowEvent::WagesWithdrawn(stream_id, stream.contractor.clone(), withdrawable),
        );

        // Add Loyalty Points (1 LP per 10 tokens withdrawn)
        if let Some(loyalty_token_addr) = env.storage().instance().get::<_, Address>(&LOYALTY_ADDR) {
            let mut reward_points = withdrawable / 10_000_000;
            if reward_points <= 0 {
                reward_points = 1;
            }

            let loyalty_client = LoyaltyClient::new(&env, &loyalty_token_addr);
            loyalty_client.add_points(&env.current_contract_address(), &stream.contractor, &reward_points);
        }
    }

    pub fn raise_dispute(env: Env, caller: Address, stream_id: u64) {
        caller.require_auth();
        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 1 && stream.status != 3 {
            panic!("cannot dispute stream in current status");
        }

        if caller != stream.employer && caller != stream.contractor {
            panic!("caller must be employer or contractor");
        }

        let now = env.ledger().timestamp();
        let remaining_locked = stream.amount - stream.withdrawn_amount;
        if remaining_locked <= 0 {
            panic!("no funds remain to dispute");
        }

        let fee_amount = (remaining_locked * DISPUTE_FEE_PCT) / 100;
        let locked_amount = remaining_locked - fee_amount;

        let was_paused = stream.status == 3;
        stream.status = 4; // Disputed
        if !was_paused {
            stream.last_paused_time = now; // Store dispute timestamp here for calculation consistency
        }
        // reserve fee portion from the stream balance
        stream.withdrawn_amount += fee_amount;

        env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().extend_ttl(5000, 5000);

        let resolver_address = Self::get_dispute_resolver(env.clone()).expect("resolver not set");
        let resolver_client = PayLoyalResolverClient::new(&env, &resolver_address);
        resolver_client.register_dispute(
            &env.current_contract_address(),
            &stream_id,
            &stream.employer,
            &stream.contractor,
            &locked_amount,
            &fee_amount,
            &86400, // default 24-hour voting window
        );

        // transfer fee portion to the dispute resolver contract for arbiter reward distribution
        if fee_amount > 0 {
            let token_client = token::Client::new(&env, &stream.token);
            token_client.transfer(
                &env.current_contract_address(),
                &resolver_address,
                &fee_amount,
            );
        }

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("disputed")),
            EscrowEvent::DisputeRaised(stream_id, now),
        );
    }

    pub fn resolve_stream(env: Env, stream_id: u64, contractor_share_pct: u32) {
        // Only authorized dispute resolver contract can call this
        let resolver = env.storage().instance().get::<_, Address>(&RESOLVER_ADDR).expect("resolver not set");
        resolver.require_auth();

        if contractor_share_pct > 100 {
            panic!("contractor share percentage cannot exceed 100");
        }

        let mut stream = Self::fetch_stream(env.clone(), stream_id);
        if stream.status != 4 {
            panic!("stream is not under active dispute");
        }

        // Remaining locked funds in escrow (fee already reserved at dispute time)
        let remaining_total = stream.amount - stream.withdrawn_amount;
        if remaining_total > 0 {
            let contractor_payout = (remaining_total * (contractor_share_pct as i128)) / 100;
            let employer_refund = remaining_total - contractor_payout;

            let token_client = token::Client::new(&env, &stream.token);

            if contractor_payout > 0 {
                token_client.transfer(
                    &env.current_contract_address(),
                    &stream.contractor,
                    &contractor_payout,
                );

                // loyalty points for contractor payout
                if let Some(loyalty_token_addr) = env.storage().instance().get::<_, Address>(&LOYALTY_ADDR) {
                    let mut reward_points = contractor_payout / 10_000_000;
                    if reward_points <= 0 {
                        reward_points = 1;
                    }
                    let loyalty_client = LoyaltyClient::new(&env, &loyalty_token_addr);
                    loyalty_client.add_points(&env.current_contract_address(), &stream.contractor, &reward_points);
                }
            }

            if employer_refund > 0 {
                token_client.transfer(
                    &env.current_contract_address(),
                    &stream.employer,
                    &employer_refund,
                );
            }

            stream.withdrawn_amount = stream.amount; // close out stream balance
            stream.status = 2; // Completed / Resolved
            
            env.storage().instance().set(&DataKey::Stream(stream_id), &stream);
            env.storage().instance().extend_ttl(5000, 5000);

            env.events().publish(
                (symbol_short!("escrow"), symbol_short!("resolved")),
                EscrowEvent::StreamResolved(stream_id, contractor_payout, employer_refund),
            );
        }
    }

    pub fn fetch_stream(env: Env, stream_id: u64) -> Stream {
        let key = DataKey::Stream(stream_id);
        env.storage().instance().get(&key).expect("stream not found")
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNT_STREAM).unwrap_or(0)
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("upgrade")),
            EscrowEvent::ContractUpgraded(new_wasm_hash),
        );
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address, String};
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::token;

    #[test]
    fn test_payroll_escrow_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let employer = Address::generate(&env);
        let contractor = Address::generate(&env);

        let logger_id = env.register(PaymentLogger, ());
        let logger_client = PaymentLoggerClient::new(&env, &logger_id);
        logger_client.initialize(&admin);

        let loyalty_id = env.register(MockLoyaltyToken, ());
        logger_client.set_loyalty_token(&loyalty_id);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_id);
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

        token_admin_client.mint(&employer, &100_000_000);
        assert_eq!(token_client.balance(&employer), 100_000_000);

        let title = String::from_str(&env, "Developer Stream");
        // Create stream: 50,000,000 stroops (5 XLM equivalent), duration = 100 seconds
        let str_id = logger_client.create_stream(&employer, &contractor, &token_id, &50_000_000, &100, &title);
        assert_eq!(str_id, 1);

        let stream = logger_client.fetch_stream(&1);
        assert_eq!(stream.status, 0); // Created

        // Set ledger timestamp
        env.ledger().set_timestamp(1000);
        logger_client.fund_stream(&1);
        assert_eq!(token_client.balance(&employer), 50_000_000);
        assert_eq!(token_client.balance(&logger_id), 50_000_000);

        let stream = logger_client.fetch_stream(&1);
        assert_eq!(stream.status, 1); // Active
        assert_eq!(stream.start_time, 1000);
        assert_eq!(stream.end_time, 1100);

        // Advance ledger time by 50 seconds (50% progress)
        env.ledger().set_timestamp(1050);
        logger_client.withdraw_wages(&1);
        assert_eq!(token_client.balance(&contractor), 25_000_000); // 50% earned
        assert_eq!(token_client.balance(&logger_id), 25_000_000);

        let mock_loyalty_client = MockLoyaltyClient::new(&env, &loyalty_id);
        assert_eq!(mock_loyalty_client.get_points(&contractor), 2); // 25,000,000 / 10,000,000 = 2 LP

        // Pause stream at t = 1060
        env.ledger().set_timestamp(1060);
        logger_client.pause_stream(&1);

        // Advance time in paused state by 20 seconds. Earliest withdrawable should still be capped at progress at pause (60% total)
        env.ledger().set_timestamp(1080);
        let stream = logger_client.fetch_stream(&1);
        assert_eq!(stream.status, 3); // Paused

        // Resume at t = 1090 (paused for 30 seconds total: 1060 to 1090)
        env.ledger().set_timestamp(1090);
        logger_client.resume_stream(&1);

        // Advance to 1120. Elapsed active time = (1120 - 1000) - 30 = 90 seconds. We should have 90% earned.
        env.ledger().set_timestamp(1120);
        logger_client.withdraw_wages(&1);
        assert_eq!(token_client.balance(&contractor), 45_000_000); // 90% total withdrawn (25m + 20m)
    }
}

#[contract]
pub struct MockLoyaltyToken;

#[contractimpl]
impl MockLoyaltyToken {
    pub fn add_points(env: Env, _caller: Address, user: Address, amount: i128) -> i128 {
        let key = (symbol_short!("BALANCE"), user);
        let mut balance: i128 = env.storage().instance().get(&key).unwrap_or(0);
        balance += amount;
        env.storage().instance().set(&key, &balance);
        balance
    }

    pub fn get_points(env: Env, user: Address) -> i128 {
        let key = (symbol_short!("BALANCE"), user);
        env.storage().instance().get(&key).unwrap_or(0)
    }
}

#[soroban_sdk::contractclient(name = "MockLoyaltyClient")]
pub trait MockLoyaltyInterface {
    fn get_points(env: Env, user: Address) -> i128;
}
