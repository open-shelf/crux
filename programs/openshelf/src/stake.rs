use crate::state::*;
use anchor_lang::prelude::*;

pub fn stake_on_book(ctx: Context<StakeOnBook>, amount: u64) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let staker_key = *ctx.accounts.staker.key;

    // Update or add stake
    if let Some(stake) = book.stakes.iter_mut().find(|s| s.staker == staker_key) {
        stake.amount += amount;
    } else {
        book.stakes.push(Stake {
            staker: staker_key,
            amount,
            earnings: 0,
        });
    }

    book.total_stake += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct StakeOnBook<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub staker: Signer<'info>,
    pub system_program: Program<'info, System>,
}
