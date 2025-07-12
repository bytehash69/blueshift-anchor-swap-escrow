#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

pub use instructions::*;
pub use errors::*;

declare_id!("8p6yFycZLmZerMnytqAw8t241dLL2EJfvjz6JiRpiomC");
 
#[program]
  pub mod blueshift_anchor_escrow {
    use super::*;
 
    #[instruction(discriminator = 0)]
    pub fn make(ctx: Context<Make>, seed: u64, receive: u64, amount: u64) -> Result<()> {
        require_gte!(receive, 0, EscrowError::InvalidAmount);
        require_gte!(amount, 0, EscrowError::InvalidAmount);

        ctx.accounts.populate_escrow(seed, receive, ctx.bumps.escrow)?;
 
  // Deposit Tokens
        ctx.accounts.deposit_tokens(amount)?;
        Ok(())
    }
 
    // #[instruction(discriminator = 1)]
    // pub fn take(ctx: Context<Take>) -> Result<()> {
    //     Ok(())
    // }
 
    // #[instruction(discriminator = 2)]
    // pub fn refund(ctx: Context<Refund>) -> Result<()> {
    //     Ok(())
    // }
}