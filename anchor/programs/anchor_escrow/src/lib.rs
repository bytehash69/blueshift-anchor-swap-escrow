#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

mod errors;
mod instructions;
mod state;
use instructions::*;

declare_id!("8p6yFycZLmZerMnytqAw8t241dLL2EJfvjz6JiRpiomC");
 
#[program]
  pub mod anchor_escrow {
    use super::*;
 
    #[instruction(discriminator = 0)]
    pub fn make(ctx: Context<Make>, seed: u64, receive: u64, amount: u64) -> Result<()> {
        instructions::make::handler(ctx, seed, receive, amount)?;
        Ok(())
    }
 
    #[instruction(discriminator = 1)]
    pub fn take(ctx: Context<Take>) -> Result<()> {
        instructions::take::handler(ctx)?;
        Ok(())
    }
 
    #[instruction(discriminator = 2)]
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::refund::handler(ctx)?;
        Ok(())
    }
}