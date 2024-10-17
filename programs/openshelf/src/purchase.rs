use crate::errors::*;
use crate::nft;
use crate::purchase;
use crate::state::*;
use crate::PurchaseType;
use anchor_lang::prelude::*;
use mpl_core::accounts::BaseCollectionV1;

pub fn purchase_chapter(ctx: Context<PurchaseContext>, chapter_index: u8) -> Result<()> {
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

    // Handle stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }

        // Transfer stakers' share to the book account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: book.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, stakers_share)?;
    }

    book.chapters[chapter_index as usize]
        .readers
        .push(buyer_key);

    let mut purchase_type = PurchaseType::ChapterPurchase {
        chapter_index: chapter_index,
    };

    // Check if the buyer has purchased all chapters
    if book
        .chapters
        .iter()
        .all(|chapter| chapter.readers.contains(&buyer_key))
    {
        book.readers.push(buyer_key);
        purchase_type = PurchaseType::FullBookPurchase;
    }

    let transaction_id = "".to_string();
    // Check if book NFT exists already
    if !check_book_nft_exists(&ctx.accounts.book_nft)? {
        nft::create_book_asset(&ctx, purchase_type, transaction_id.clone())?;
    }

    Ok(())
}

pub fn purchase_chapter_with_existing_nft(
    ctx: Context<PurchaseUpdateContext>,
    chapter_index: u8,
) -> Result<()> {
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

    // Handle stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }

        // Transfer stakers' share to the book account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: book.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, stakers_share)?;
    }

    book.chapters[chapter_index as usize]
        .readers
        .push(buyer_key);

    let mut purchase_type = PurchaseType::ChapterPurchase {
        chapter_index: chapter_index,
    };

    // Check if the buyer has purchased all chapters
    if book
        .chapters
        .iter()
        .all(|chapter| chapter.readers.contains(&buyer_key))
    {
        book.readers.push(buyer_key);
        purchase_type = PurchaseType::FullBookPurchase;
    }

    let transaction_id = "".to_string();
    // Check if book NFT exists already
    if check_book_nft_exists(&ctx.accounts.book_nft)? {
        nft::update_attributes_plugin(&ctx, purchase_type, transaction_id)?;
    }

    Ok(())
}

fn check_book_nft_exists(book_nft: &AccountInfo) -> Result<bool> {
    Ok(if **book_nft.try_borrow_lamports()? > 0 {
        msg!("This account has been initialized");
        true
    } else {
        false
    })
}

pub fn purchase_full_book(ctx: Context<PurchaseContext>) -> Result<()> {
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

    let book = &mut ctx.accounts.book;

    // Handle stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }

        // Transfer stakers' share to the book account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: book.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, stakers_share)?;
    }

    book.readers.push(buyer_key);
    for chapter in book.chapters.iter_mut() {
        if !chapter.readers.contains(&buyer_key) {
            chapter.readers.push(buyer_key);
        }
    }

    let transaction_id = "".to_string();
    nft::create_book_asset(&ctx, PurchaseType::FullBookPurchase, transaction_id.clone())?;

    Ok(())
}

pub fn purchase_full_book_with_existing_nft(ctx: Context<PurchaseUpdateContext>) -> Result<()> {
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

    let book = &mut ctx.accounts.book;

    // Handle stakers' share
    if book.total_stake > 0 {
        let total_stake = book.total_stake;
        for stake in &mut book.stakes {
            let staker_share =
                (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
            stake.earnings += staker_share;
        }

        // Transfer stakers' share to the book account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: book.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, stakers_share)?;
    }

    book.readers.push(buyer_key);
    for chapter in book.chapters.iter_mut() {
        if !chapter.readers.contains(&buyer_key) {
            chapter.readers.push(buyer_key);
        }
    }

    let transaction_id = "".to_string();
    // Check if book NFT exists already
    if check_book_nft_exists(&ctx.accounts.book_nft)? {
        nft::update_attributes_plugin(&ctx, PurchaseType::FullBookPurchase, transaction_id)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct PurchaseContext<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub author: AccountInfo<'info>,
    #[account(mut)]
    pub collection: Account<'info, BaseCollectionV1>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    /// CHECK: This is used for updating the NFT
    #[account(mut)]
    pub book_nft: Signer<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub struct PurchaseContextWrapper<'info> {
    pub is_update_context: bool,
    pub purchase_context: Option<PurchaseContext<'info>>,
    pub purchase_update_context: Option<PurchaseUpdateContext<'info>>,
}

#[derive(Accounts)]
pub struct PurchaseUpdateContext<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub author: AccountInfo<'info>,
    #[account(mut)]
    pub collection: Account<'info, BaseCollectionV1>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    /// CHECK: This is used for updating the NFT
    #[account(mut)]
    pub book_nft: AccountInfo<'info>,
    /// CHECK: This is safe because we're only transferring SOL to this account
    #[account(mut)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
