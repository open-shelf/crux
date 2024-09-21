use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn purchase_chapter(ctx: Context<PurchaseChapter>, chapter_index: u8) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    require!(
        chapter_index < book.chapter_prices.len() as u8,
        ProgramErrorCode::InvalidChapterIndex
    );
    require!(
        !book.chapter_readers[chapter_index as usize].contains(&buyer_key),
        ProgramErrorCode::AlreadyPurchased
    );

    let price = book.chapter_prices[chapter_index as usize];
    let author_share = price * 70 / 100; // 70% to author
    let stakers_share = price - author_share; // 30% to stakers

    // Transfer author's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.author.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, author_share)?;

    // Distribute stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }
    }

    book.chapter_readers[chapter_index as usize].push(buyer_key);

    // Check if the buyer has purchased all chapters
    if book
        .chapter_readers
        .iter()
        .all(|readers| readers.contains(&buyer_key))
    {
        book.readers.push(buyer_key);
    }

    Ok(())
}

pub fn purchase_full_book(ctx: Context<PurchaseFullBook>) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    require!(
        !book.readers.contains(&buyer_key),
        ProgramErrorCode::AlreadyPurchased
    );

    let price = book.full_book_price;
    let author_share = price * 70 / 100; // 70% to author
    let stakers_share = price - author_share; // 30% to stakers

    // Transfer author's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.author.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, author_share)?;

    // Distribute stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }
    }

    book.readers.push(buyer_key);
    for chapter_readers in book.chapter_readers.iter_mut() {
        if !chapter_readers.contains(&buyer_key) {
            chapter_readers.push(buyer_key);
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct PurchaseChapter<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub author: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseFullBook<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub author: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
