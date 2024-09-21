use crate::state::*;
use anchor_lang::prelude::*;

pub fn stake_on_book(ctx: Context<StakeOnBook>, amount: u64) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let staker_key = *ctx.accounts.staker.key;

    // Transfer SOL from staker to stake pool
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.staker.to_account_info(),
            to: ctx.accounts.stake_pool.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;

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
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub stake_pool: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
