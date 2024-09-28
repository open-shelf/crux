use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn purchase_chapter(ctx: Context<PurchaseChapter>, chapter_index: u8) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    require!(
        chapter_index < book.chapters.len() as u8,
        ProgramErrorCode::InvalidChapterIndex
    );
    require!(
        !book.chapters[chapter_index as usize]
            .readers
            .contains(&buyer_key),
        ProgramErrorCode::AlreadyPurchased
    );

    let price = book.chapters[chapter_index as usize].price;
    let author_share = price * 70 / 100; // 70% to author
    let stakers_share = price * 20 / 100; // 20% to stakers
    let platform_share = price * 10 / 100; // 10% to platform

    // Transfer author's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.author.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, author_share)?;

    // Transfer platform's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.platform.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, platform_share)?;

    // Distribute stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;

            // Transfer staker's share
            // let cpi_context = CpiContext::new(
            //     ctx.accounts.system_program.to_account_info(),
            //     anchor_lang::system_program::Transfer {
            //         from: ctx.accounts.buyer.to_account_info(),
            //         to: stake.staker.to_account_info(),
            //     },
            // );
            // anchor_lang::system_program::transfer(cpi_context, staker_share)?;
        }
    }

    book.chapters[chapter_index as usize]
        .readers
        .push(buyer_key);

    // Check if the buyer has purchased all chapters
    if book
        .chapters
        .iter()
        .all(|chapter| chapter.readers.contains(&buyer_key))
    {
        book.readers.push(buyer_key);
    }

    Ok(())
}

pub fn purchase_full_book(ctx: Context<PurchaseFullBook>) -> Result<()> {
    let buyer_key = *ctx.accounts.buyer.key;

    // Check if the buyer has already purchased the book
    require!(
        !ctx.accounts.book.readers.contains(&buyer_key),
        ProgramErrorCode::AlreadyPurchased
    );

    let price = ctx.accounts.book.full_book_price;
    let author_share = price * 70 / 100; // 70% to author
    let stakers_share = price * 20 / 100; // 20% to stakers
    let platform_share = price * 10 / 100; // 10% to platform

    // Transfer author's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.author.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, author_share)?;

    // Transfer platform's share
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.platform.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, platform_share)?;

    // Transfer stakers' share to book account
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.book.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, stakers_share)?;

    let book = &mut ctx.accounts.book;

    // Distribute stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;

            // // Transfer staker's share
            // let cpi_context = CpiContext::new(
            //     ctx.accounts.system_program.to_account_info(),
            //     anchor_lang::system_program::Transfer {
            //         from: ctx.accounts.buyer.to_account_info(),
            //         to: stake.staker.to_account_info(),
            //     },
            // );
            // anchor_lang::system_program::transfer(cpi_context, staker_share)?;
        }
    }

    book.readers.push(buyer_key);
    for chapter in book.chapters.iter_mut() {
        if !chapter.readers.contains(&buyer_key) {
            chapter.readers.push(buyer_key);
        }
    }

    Ok(())
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
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
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
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
