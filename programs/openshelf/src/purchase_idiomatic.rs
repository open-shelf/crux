pub fn process_purchase(
    ctx: PurchaseContextWrapper,
    chapter_index: Option<u8>,
    existing_nft: bool,
) -> Result<()> {
    let book = &mut if ctx.is_update_context {
        ctx.purchase_update_context.unwrap().book
    } else {
        ctx.purchase_context.unwrap().book
    };
    let buyer_key = *ctx.buyer().key;

    // Validate purchase
    validate_purchase(book, &buyer_key, chapter_index)?;

    // Calculate price and shares
    let (price, author_share, stakers_share, platform_share) =
        calculate_shares(book, chapter_index);

    // Transfer funds
    transfer_funds(ctx, author_share, platform_share, stakers_share)?;

    // Update book state
    update_book_state(book, &buyer_key, chapter_index);

    // Handle NFT
    let purchase_type = determine_purchase_type(book, &buyer_key, chapter_index);
    handle_nft(ctx, &purchase_type, existing_nft)?;

    Ok(())
}

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

fn calculate_shares(book: &Book, chapter_index: Option<u8>) -> (u64, u64, u64, u64) {
    let price = if let Some(index) = chapter_index {
        book.chapters[index as usize].price
    } else {
        book.full_book_price
    };
    let author_share = price * 70 / 100;
    let stakers_share = price * 20 / 100;
    let platform_share = price * 10 / 100;
    (price, author_share, stakers_share, platform_share)
}

fn transfer_funds(
    ctx: PurchaseContextWrapper,
    author_share: u64,
    platform_share: u64,
    stakers_share: u64,
) -> Result<()> {
    // Transfer author's share
    transfer_sol(
        ctx.buyer(),
        ctx.author(),
        author_share,
        ctx.system_program(),
    )?;

    // Transfer platform's share
    transfer_sol(
        ctx.buyer(),
        ctx.platform(),
        platform_share,
        ctx.system_program(),
    )?;

    // Handle stakers' share
    let book = ctx.book();
    if book.total_stake > 0 {
        distribute_stakers_share(book, stakers_share);
        transfer_sol(
            ctx.buyer(),
            book.to_account_info(),
            stakers_share,
            ctx.system_program(),
        )?;
    }

    Ok(())
}

fn transfer_sol<'info>(
    from: &Signer<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    system_program: &Program<'info, System>,
) -> Result<()> {
    let cpi_context = CpiContext::new(
        system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)
}

fn distribute_stakers_share(book: &mut Book, stakers_share: u64) {
    let total_stake = book.total_stake;
    for stake in &mut book.stakes {
        let staker_share =
            (stake.amount as u128 * stakers_share as u128 / total_stake as u128) as u64;
        stake.earnings += staker_share;
    }
}

fn update_book_state(book: &mut Book, buyer_key: &Pubkey, chapter_index: Option<u8>) {
    if let Some(index) = chapter_index {
        book.chapters[index as usize].readers.push(*buyer_key);
    } else {
        book.readers.push(*buyer_key);
        for chapter in &mut book.chapters {
            if !chapter.readers.contains(buyer_key) {
                chapter.readers.push(*buyer_key);
            }
        }
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

fn handle_nft(
    ctx: PurchaseContextWrapper,
    purchase_type: &PurchaseType,
    existing_nft: bool,
) -> Result<()> {
    let transaction_id = "".to_string();
    if existing_nft {
        if check_book_nft_exists(ctx.book_nft())? {
            nft::update_attributes_plugin(&ctx, purchase_type.clone(), transaction_id)?;
        }
    } else {
        nft::create_book_asset(&ctx, purchase_type.clone(), transaction_id)?;
    }
    Ok(())
}

pub struct PurchaseContextWrapper<'info> {
    pub is_update_context: bool,
    pub purchase_context: Option<PurchaseContext<'info>>,
    pub purchase_update_context: Option<PurchaseUpdateContext<'info>>,
}
