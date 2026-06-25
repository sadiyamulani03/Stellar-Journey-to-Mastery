#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contracttype, contractimpl, token, Env, Address, String, Symbol, symbol_short, BytesN};

const ADMIN: Symbol = symbol_short!("ADMIN");
const LOYALTY_ADDR: Symbol = symbol_short!("LOY_ADDR");
const COUNT_AGREEMENT: Symbol = symbol_short!("COUNT_AGR");

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Agreement {
    pub id: u64,
    pub employer: Address,
    pub contractor: Address,
    pub token: Address,
    pub amount: i128,
    pub status: u32, // 0 = Created, 1 = Funded/Active, 2 = Completed, 3 = Cancelled
    pub title: String,
}

#[contracttype]
pub enum DataKey {
    Agreement(u64),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowEvent {
    AgreementCreated(u64, Address, Address, i128),
    AgreementFunded(u64, Address, i128),
    PaymentReleased(u64, Address, i128),
    AgreementCancelled(u64),
    LoyaltyConfigured(Address),
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

    pub fn create_agreement(
        env: Env,
        employer: Address,
        contractor: Address,
        token: Address,
        amount: i128,
        title: String,
    ) -> u64 {
        employer.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut count: u64 = env.storage().instance().get(&COUNT_AGREEMENT).unwrap_or(0);
        count += 1;

        let agreement = Agreement {
            id: count,
            employer: employer.clone(),
            contractor: contractor.clone(),
            token,
            amount,
            status: 0, // Created
            title,
        };

        env.storage().instance().set(&DataKey::Agreement(count), &agreement);
        env.storage().instance().set(&COUNT_AGREEMENT, &count);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("created")),
            EscrowEvent::AgreementCreated(count, employer, contractor, amount),
        );

        count
    }

    pub fn fund_agreement(env: Env, agreement_id: u64) {
        let mut agreement = Self::fetch_agreement(env.clone(), agreement_id);
        if agreement.status != 0 {
            panic!("agreement is not in Created status");
        }

        agreement.employer.require_auth();

        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(
            &agreement.employer,
            &env.current_contract_address(),
            &agreement.amount,
        );

        agreement.status = 1; // Funded
        env.storage().instance().set(&DataKey::Agreement(agreement_id), &agreement);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("funded")),
            EscrowEvent::AgreementFunded(agreement_id, agreement.employer.clone(), agreement.amount),
        );
    }

    pub fn release_payment(env: Env, agreement_id: u64) {
        let mut agreement = Self::fetch_agreement(env.clone(), agreement_id);
        if agreement.status != 1 {
            panic!("agreement is not in Funded status");
        }

        agreement.employer.require_auth();

        let token_client = token::Client::new(&env, &agreement.token);
        token_client.transfer(
            &env.current_contract_address(),
            &agreement.contractor,
            &agreement.amount,
        );

        agreement.status = 2; // Completed
        env.storage().instance().set(&DataKey::Agreement(agreement_id), &agreement);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("released")),
            EscrowEvent::PaymentReleased(agreement_id, agreement.contractor.clone(), agreement.amount),
        );

        if let Some(loyalty_token_addr) = env.storage().instance().get::<_, Address>(&LOYALTY_ADDR) {
            let mut reward_points = agreement.amount / 10_000_000;
            if reward_points <= 0 {
                reward_points = 1;
            }

            let loyalty_client = LoyaltyClient::new(&env, &loyalty_token_addr);
            loyalty_client.add_points(&env.current_contract_address(), &agreement.contractor, &reward_points);
        }
    }

    pub fn cancel_agreement(env: Env, agreement_id: u64) {
        let mut agreement = Self::fetch_agreement(env.clone(), agreement_id);
        if agreement.status != 0 && agreement.status != 1 {
            panic!("agreement cannot be cancelled");
        }

        agreement.employer.require_auth();

        if agreement.status == 1 {
            let token_client = token::Client::new(&env, &agreement.token);
            token_client.transfer(
                &env.current_contract_address(),
                &agreement.employer,
                &agreement.amount,
            );
        }

        agreement.status = 3; // Cancelled
        env.storage().instance().set(&DataKey::Agreement(agreement_id), &agreement);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("cancelled")),
            EscrowEvent::AgreementCancelled(agreement_id),
        );
    }

    pub fn fetch_agreement(env: Env, agreement_id: u64) -> Agreement {
        let key = DataKey::Agreement(agreement_id);
        env.storage().instance().get(&key).expect("agreement not found")
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNT_AGREEMENT).unwrap_or(0)
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
    use soroban_sdk::testutils::Address as _;
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

        let title = String::from_str(&env, "Monthly Retainer");
        let agr_id = logger_client.create_agreement(&employer, &contractor, &token_id, &50_000_000, &title);
        assert_eq!(agr_id, 1);

        let agr = logger_client.fetch_agreement(&1);
        assert_eq!(agr.status, 0);

        logger_client.fund_agreement(&1);
        assert_eq!(token_client.balance(&employer), 50_000_000);
        assert_eq!(token_client.balance(&logger_id), 50_000_000);

        let agr = logger_client.fetch_agreement(&1);
        assert_eq!(agr.status, 1);

        logger_client.release_payment(&1);
        assert_eq!(token_client.balance(&logger_id), 0);
        assert_eq!(token_client.balance(&contractor), 50_000_000);

        let agr = logger_client.fetch_agreement(&1);
        assert_eq!(agr.status, 2);

        let mock_loyalty_client = MockLoyaltyClient::new(&env, &loyalty_id);
        assert_eq!(mock_loyalty_client.get_points(&contractor), 5);
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
