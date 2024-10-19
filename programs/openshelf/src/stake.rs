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

    // Check if the book account has enough lamports
    require!(
        **book.to_account_info().try_borrow_lamports()? >= earnings,
        ProgramErrorCode::InsufficientFunds
    );

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

    // Check if the staker has purchased the full book
    require!(
        book.readers.contains(&staker_key),
        ProgramErrorCode::NotQualifiedForStaking
    );

    // Check if the stake amount is valid
    require!(amount > 0, ProgramErrorCode::InvalidStakeAmount);
    require!(
        amount <= 10_000_000_000, // 10 SOL (assuming 9 decimals)
        ProgramErrorCode::StakeAmountTooHigh
    );

    // Check if the staker has enough funds
    require!(
        ctx.accounts.staker.lamports() >= amount,
        ProgramErrorCode::InsufficientFunds
    );

    // Check if adding this stake would overflow the total stake
    let new_total_stake = book
        .total_stake
        .checked_add(amount)
        .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

    // Update or add stake
    if let Some(stake) = book.stakes.iter_mut().find(|s| s.staker == staker_key) {
        stake.amount = stake
            .amount
            .checked_add(amount)
            .ok_or(ProgramErrorCode::ArithmeticOverflow)?;
    } else {
        require!(book.stakes.len() < 255, ProgramErrorCode::MaxStakersReached);
        book.stakes.push(Stake {
            staker: staker_key,
            amount,
            earnings: 0,
            total_earning: 0,
        });
    }

    // Transfer the stake amount from staker to book account
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.staker.to_account_info(),
            to: book.to_account_info(),
        },
    );

    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Update the total stake
    book.total_stake = new_total_stake;

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
