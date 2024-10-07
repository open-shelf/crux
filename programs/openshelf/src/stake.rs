use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn claim_staker_earnings(ctx: Context<ClaimStakerEarnings>) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let staker_key = *ctx.accounts.staker.key;

    // Find the stake for this staker
    let stake_index = book
        .stakes
        .iter()
        .position(|s| s.staker == staker_key)
        .ok_or(ProgramErrorCode::StakerNotFound)?;

    let earnings = book.stakes[stake_index].earnings;
    require!(earnings > 0, ProgramErrorCode::NoEarningsToClaim);

    // Transfer earnings to staker
    **book.to_account_info().try_borrow_mut_lamports()? -= earnings;
    **ctx.accounts.staker.try_borrow_mut_lamports()? += earnings;

    // Reset earnings
    book.stakes[stake_index].earnings = 0;

    Ok(())
}

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

#[derive(Accounts)]
pub struct ClaimStakerEarnings<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub staker: Signer<'info>,
    pub system_program: Program<'info, System>,
}
