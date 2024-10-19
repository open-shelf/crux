use crate::errors::*;
use crate::nft;
use crate::state::*;
use crate::PurchaseType;
use anchor_lang::prelude::*;
use mpl_core::accounts::BaseCollectionV1;

pub const PLATFORM_PUB_KEY: Pubkey = pubkey!("6TRrKrkZENEVQyRmMc6NRgU1SYjWPRwQZqeVVmfr7vup");

fn validate_purchase(book: &Book, buyer_key: &Pubkey, chapter_index: Option<u8>) -> Result<()> {
    if let Some(index) = chapter_index {
        require!(
            index < book.chapters.len() as u8,
            ProgramErrorCode::InvalidChapterIndex
        );
        require!(
            !book.chapters[index as usize].readers.contains(buyer_key),
            ProgramErrorCode::AlreadyPurchased
        );
    } else {
        require!(
            !book.readers.contains(buyer_key),
            ProgramErrorCode::AlreadyPurchased
        );
    }
    Ok(())
}

fn calculate_shares(
    book: &Book,
    buyer_key: &Pubkey,
    chapter_index: Option<u8>,
) -> Result<(u64, u64, u64, u64)> {
    let price = if let Some(index) = chapter_index {
        book.chapters[index as usize].price
    } else {
        // For full book purchase, calculate price based on unbought chapters
        book.chapters
            .iter()
            .filter(|chapter| !chapter.readers.contains(buyer_key))
            .map(|chapter| chapter.price)
            .sum()
    };

    require!(price > 0, ProgramErrorCode::InvalidPrice);

    let author_share = price
        .checked_mul(70)
        .and_then(|result| result.checked_div(100))
        .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

    let stakers_share = price
        .checked_mul(10)
        .and_then(|result| result.checked_div(100))
        .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

    // Calculate platform_share as the remainder
    let platform_share = price
        .checked_sub(author_share)
        .and_then(|result| result.checked_sub(stakers_share))
        .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

    Ok((price, author_share, stakers_share, platform_share))
}

fn update_book_state(book: &mut Book, buyer_key: &Pubkey, chapter_index: Option<u8>) {
    if let Some(index) = chapter_index {
        if !book.chapters[index as usize].readers.contains(buyer_key) {
            book.chapters[index as usize].readers.push(*buyer_key);
        }
    } else {
        if !book.readers.contains(buyer_key) {
            book.readers.push(*buyer_key);
        }
        for chapter in &mut book.chapters {
            if !chapter.readers.contains(buyer_key) {
                chapter.readers.push(*buyer_key);
            }
        }
    }

    if book
        .chapters
        .iter()
        .all(|chapter| chapter.readers.contains(buyer_key))
        && !book.readers.contains(buyer_key)
    {
        book.readers.push(*buyer_key);
    }
}

fn determine_purchase_type(
    book: &Book,
    buyer_key: &Pubkey,
    chapter_index: Option<u8>,
) -> PurchaseType {
    if let Some(index) = chapter_index {
        if book
            .chapters
            .iter()
            .all(|chapter| chapter.readers.contains(buyer_key))
        {
            PurchaseType::FullBookPurchase
        } else {
            PurchaseType::ChapterPurchase {
                chapter_index: index,
            }
        }
    } else {
        PurchaseType::FullBookPurchase
    }
}

fn transfer_sol<'info>(
    from: &Signer<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    system_program: &Program<'info, System>,
) -> Result<()> {
    require!(
        **from.try_borrow_lamports()? >= amount,
        ProgramErrorCode::InsufficientFunds
    );

    let cpi_context = CpiContext::new(
        system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)
}

fn distribute_stakers_share(book: &mut Book, stakers_share: u64) -> Result<()> {
    let total_stake = book.total_stake;
    require!(total_stake > 0, ProgramErrorCode::NoStakers);

    for stake in &mut book.stakes {
        let staker_share = (stake.amount as u128)
            .checked_mul(stakers_share as u128)
            .and_then(|result| result.checked_div(total_stake as u128))
            .and_then(|result| u64::try_from(result).ok())
            .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

        stake.earnings = stake
            .earnings
            .checked_add(staker_share)
            .ok_or(ProgramErrorCode::ArithmeticOverflow)?;
        stake.total_earning = stake
            .total_earning
            .checked_add(staker_share)
            .ok_or(ProgramErrorCode::ArithmeticOverflow)?;
    }
    Ok(())
}

pub fn purchase_chapter(
    ctx: Context<PurchaseContext>,
    chapter_index: u8,
    need_nft: bool,
) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    validate_purchase(book, &buyer_key, Some(chapter_index))?;

    let (price, author_share, stakers_share, platform_share) =
        calculate_shares(book, &buyer_key, Some(chapter_index))?;

    // Check if the buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= price,
        ProgramErrorCode::InsufficientFunds
    );

    // Transfer author's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.author,
        author_share,
        &ctx.accounts.system_program,
    )?;

    // Transfer platform's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.platform,
        platform_share,
        &ctx.accounts.system_program,
    )?;

    // Handle stakers' share
    if book.total_stake > 0 {
        let _ = distribute_stakers_share(book, stakers_share)?;
        transfer_sol(
            &ctx.accounts.buyer,
            &book.to_account_info(),
            stakers_share,
            &ctx.accounts.system_program,
        )?;
    }

    update_book_state(book, &buyer_key, Some(chapter_index));

    let purchase_type = determine_purchase_type(book, &buyer_key, Some(chapter_index));

    if need_nft {
        let transaction_id = "".to_string();
        // Check if book NFT exists already
        if !check_book_nft_exists(&ctx.accounts.book_nft)? {
            nft::create_book_asset(&ctx, purchase_type, transaction_id.clone())?;
        }
    }

    Ok(())
}

pub fn purchase_chapter_with_existing_nft(
    ctx: Context<PurchaseUpdateContext>,
    chapter_index: u8,
    need_nft: bool,
) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    validate_purchase(book, &buyer_key, Some(chapter_index))?;

    let (_price, author_share, stakers_share, platform_share) =
        calculate_shares(book, &buyer_key, Some(chapter_index))?;

    // Transfer author's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.author,
        author_share,
        &ctx.accounts.system_program,
    )?;

    // Transfer platform's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.platform,
        platform_share,
        &ctx.accounts.system_program,
    )?;

    // Handle stakers' share
    if book.total_stake > 0 {
        distribute_stakers_share(book, stakers_share);
        transfer_sol(
            &ctx.accounts.buyer,
            &book.to_account_info(),
            stakers_share,
            &ctx.accounts.system_program,
        )?;
    }

    update_book_state(book, &buyer_key, Some(chapter_index));

    let purchase_type = determine_purchase_type(book, &buyer_key, Some(chapter_index));

    if need_nft {
        let transaction_id = "".to_string();
        // Check if book NFT exists already
        if check_book_nft_exists(&ctx.accounts.book_nft)? {
            nft::update_attributes_plugin(&ctx, purchase_type, transaction_id)?;
        }
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

pub fn purchase_full_book(ctx: Context<PurchaseContext>, need_nft: bool) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    validate_purchase(book, &buyer_key, None)?;

    let (price, author_share, stakers_share, platform_share) =
        calculate_shares(book, &buyer_key, None)?;

    // Check if the buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= price,
        ProgramErrorCode::InsufficientFunds
    );

    // Transfer author's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.author,
        author_share,
        &ctx.accounts.system_program,
    )?;

    // Transfer platform's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.platform,
        platform_share,
        &ctx.accounts.system_program,
    )?;

    // Handle stakers' share
    if book.total_stake > 0 {
        distribute_stakers_share(book, stakers_share)?;
        transfer_sol(
            &ctx.accounts.buyer,
            &book.to_account_info(),
            stakers_share,
            &ctx.accounts.system_program,
        )?;
    }

    update_book_state(book, &buyer_key, None);

    if need_nft {
        let transaction_id = "".to_string();
        nft::create_book_asset(&ctx, PurchaseType::FullBookPurchase, transaction_id.clone())?;
    }
    Ok(())
}

pub fn purchase_full_book_with_existing_nft(
    ctx: Context<PurchaseUpdateContext>,
    need_nft: bool,
) -> Result<()> {
    let book = &mut ctx.accounts.book;
    let buyer_key = *ctx.accounts.buyer.key;

    validate_purchase(book, &buyer_key, None)?;

    let (price, author_share, stakers_share, platform_share) =
        calculate_shares(book, &buyer_key, None)?;

    // Check if the buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= price,
        ProgramErrorCode::InsufficientFunds
    );

    // Transfer author's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.author,
        author_share,
        &ctx.accounts.system_program,
    )?;

    // Transfer platform's share
    transfer_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.platform,
        platform_share,
        &ctx.accounts.system_program,
    )?;

    // Handle stakers' share
    if book.total_stake > 0 {
        distribute_stakers_share(book, stakers_share)?;
        transfer_sol(
            &ctx.accounts.buyer,
            &book.to_account_info(),
            stakers_share,
            &ctx.accounts.system_program,
        )?;
    }

    update_book_state(book, &buyer_key, None);

    if need_nft {
        let transaction_id = "".to_string();
        // Check if book NFT exists already
        if check_book_nft_exists(&ctx.accounts.book_nft)? {
            nft::update_attributes_plugin(&ctx, PurchaseType::FullBookPurchase, transaction_id)?;
        }
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
    #[account(mut, address = PLATFORM_PUB_KEY)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
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
    #[account(mut, address = PLATFORM_PUB_KEY)]
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
