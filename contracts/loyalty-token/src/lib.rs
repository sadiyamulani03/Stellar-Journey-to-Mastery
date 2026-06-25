#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contractimpl, contracttype, Env, Address, BytesN, Symbol, symbol_short};

const BALANCE: Symbol = symbol_short!("BALANCE");
const LOYALTY_ADMIN: Symbol = symbol_short!("ADMIN");
const ISSUER: Symbol = symbol_short!("ISSUER");

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LoyaltyEvent {
    Reward(Address, i128, i128), // User, amount, new_balance
    Burn(Address, i128, i128),   // User, amount, new_balance
    AdminChanged(Address, Address), // Old, new
    IssuerAuthorized(Address),
    IssuerDeauthorized(Address),
    ContractUpgraded(BytesN<32>),
}

#[contract]
pub struct LoyaltyToken;

#[contractimpl]
impl LoyaltyToken {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&LOYALTY_ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&LOYALTY_ADMIN, &admin);
        env.storage().instance().extend_ttl(5000, 5000);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get::<_, Address>(&LOYALTY_ADMIN).expect("not initialized")
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();
        env.storage().instance().set(&LOYALTY_ADMIN, &new_admin);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("set_admin")),
            LoyaltyEvent::AdminChanged(admin, new_admin),
        );
    }

    pub fn authorize_issuer(env: Env, issuer: Address) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();

        let key = (ISSUER, issuer.clone());
        env.storage().instance().set(&key, &true);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("auth_iss")),
            LoyaltyEvent::IssuerAuthorized(issuer),
        );
    }

    pub fn deauthorize_issuer(env: Env, issuer: Address) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();

        let key = (ISSUER, issuer.clone());
        env.storage().instance().remove(&key);

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("deauth")),
            LoyaltyEvent::IssuerDeauthorized(issuer),
        );
    }

    pub fn is_issuer(env: Env, address: Address) -> bool {
        let key = (ISSUER, address);
        env.storage().instance().get::<_, bool>(&key).unwrap_or(false)
    }

    pub fn add_points(env: Env, caller: Address, user: Address, amount: i128) -> i128 {
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let admin = Self::get_admin(env.clone());
        if caller == admin {
            admin.require_auth();
        } else {
            let key = (ISSUER, caller.clone());
            let is_auth = env.storage().instance().get::<_, bool>(&key).unwrap_or(false);
            if !is_auth {
                panic!("not authorized issuer");
            }
            caller.require_auth();
        }

        let key = (BALANCE, user.clone());
        let mut balance: i128 = env.storage().instance().get(&key).unwrap_or(0);
        balance += amount;
        env.storage().instance().set(&key, &balance);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("reward")),
            LoyaltyEvent::Reward(user, amount, balance),
        );

        balance
    }

    pub fn burn_points(env: Env, user: Address, amount: i128) -> i128 {
        user.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let key = (BALANCE, user.clone());
        let mut balance: i128 = env.storage().instance().get(&key).unwrap_or(0);
        if balance < amount {
            panic!("insufficient balance");
        }
        balance -= amount;
        env.storage().instance().set(&key, &balance);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("burn")),
            LoyaltyEvent::Burn(user, amount, balance),
        );

        balance
    }

    pub fn get_points(env: Env, user: Address) -> i128 {
        let key = (BALANCE, user);
        env.storage().instance().get(&key).unwrap_or(0)
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin = Self::get_admin(env.clone());
        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());

        env.events().publish(
            (symbol_short!("loyalty"), symbol_short!("upgrade")),
            LoyaltyEvent::ContractUpgraded(new_wasm_hash),
        );
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Address};
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_loyalty_flow() {
        let env = Env::default();
        let admin = Address::generate(&env);
        
        let contract_id = env.register(LoyaltyToken, ());
        let client = LoyaltyTokenClient::new(&env, &contract_id);

        client.initialize(&admin);

        let user = Address::generate(&env);
        assert_eq!(client.get_points(&user), 0);

        env.mock_all_auths();
        
        // Admin is authorized by default
        assert_eq!(client.add_points(&admin, &user, &10), 10);
        assert_eq!(client.get_points(&user), 10);

        // Test issuer auth
        let issuer = Address::generate(&env);
        client.authorize_issuer(&issuer);
        assert_eq!(client.is_issuer(&issuer), true);

        // Issuer adds points
        assert_eq!(client.add_points(&issuer, &user, &5), 15);
        assert_eq!(client.get_points(&user), 15);

        // Burn points
        assert_eq!(client.burn_points(&user, &7), 8);
        assert_eq!(client.get_points(&user), 8);
    }
}

