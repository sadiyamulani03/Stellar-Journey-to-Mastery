#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, Env, String, Symbol, symbol_short};

const COUNT_PAY: Symbol = symbol_short!("COUNT_PAY");

#[contracttype]
#[derive(Clone, Debug)]
pub struct Payment {
    pub pay_id: u64,
    pub tx_hash: String,
    pub from: String,
    pub to: String,
    pub amount: i128,
}

#[contracttype]
pub enum Paybook {
    Payment(u64),
}

#[contract]
pub struct PaymentLogger;

#[contractimpl]
impl PaymentLogger {
    pub fn log_payment(env: Env, tx_hash: String, from: String, to: String, amount: i128) -> u64 {
        let mut pay_count: u64 = env.storage().instance().get(&COUNT_PAY).unwrap_or(0);
        pay_count += 1;

        let mut pay_details = Self::fetch_payment(env.clone(), pay_count.clone());

        pay_details.pay_id = pay_count;
        pay_details.tx_hash = tx_hash;
        pay_details.from = from;
        pay_details.to = to;
        pay_details.amount = amount;

        env.storage().instance().set(&Paybook::Payment(pay_details.pay_id.clone()), &pay_details);
        env.storage().instance().set(&COUNT_PAY, &pay_details.pay_id.clone());
        env.storage().instance().extend_ttl(5000, 5000);

        pay_details.pay_id
    }

    pub fn fetch_payment(env: Env, pay_id: u64) -> Payment {
        let key = Paybook::Payment(pay_id.clone());
        env.storage().instance().get(&key).unwrap_or(Payment {
            pay_id: 0,
            tx_hash: String::from_str(&env, ""),
            from: String::from_str(&env, ""),
            to: String::from_str(&env, ""),
            amount: 0,
        })
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNT_PAY).unwrap_or(0)
    }
}
