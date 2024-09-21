use anchor_lang::prelude::*;

declare_id!("6sPkjZEfevcJVmUVzvvW57QAZnu3Q8mvLg1CcJLZyaL4");

#[program]
pub mod openshelf {
    use super::*;

    pub fn add_book(
        ctx: Context<AddBook>,
        title: String,
        chapter_prices: Vec<u64>,
        full_book_price: u64,
    ) -> Result<()> {
        let book = &mut ctx.accounts.book;
        book.author = *ctx.accounts.author.key;
        book.title = title;
        book.chapter_prices = chapter_prices;
        book.full_book_price = full_book_price;
        book.total_stake = 0;
        Ok(())
    }

    pub fn add_chapter(
        ctx: Context<AddChapter>,
        chapter_content: String,
        chapter_index: u8,
    ) -> Result<()> {
        let book = &mut ctx.accounts.book;
        require!(
            chapter_index < book.chapter_prices.len() as u8,
            ErrorCode::InvalidChapterIndex
        );

        let chapter = &mut ctx.accounts.chapter;
        chapter.content = chapter_content;
        chapter.book = book.key();
        chapter.index = chapter_index;

        Ok(())
    }

    pub fn purchase_chapter(ctx: Context<PurchaseChapter>, chapter_index: u8) -> Result<()> {
        let book = &mut ctx.accounts.book;
        let buyer_key = *ctx.accounts.buyer.key;

        require!(
            chapter_index < book.chapter_prices.len() as u8,
            ErrorCode::InvalidChapterIndex
        );
        require!(
            !book.chapter_readers[chapter_index as usize].contains(&buyer_key),
            ErrorCode::AlreadyPurchased
        );

        // Transfer SOL from buyer to author
        let price = book.chapter_prices[chapter_index as usize];
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.author.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, price)?;

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
            ErrorCode::AlreadyPurchased
        );

        // Transfer SOL from buyer to author
        let price = book.full_book_price;
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.author.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, price)?;

        book.readers.push(buyer_key);
        for chapter_readers in book.chapter_readers.iter_mut() {
            if !chapter_readers.contains(&buyer_key) {
                chapter_readers.push(buyer_key);
            }
        }

        Ok(())
    }

    pub fn stake_on_book(ctx: Context<StakeOnBook>, amount: u64) -> Result<()> {
        let book = &mut ctx.accounts.book;
        let staker_key = *ctx.accounts.staker.key;

        require!(
            book.readers.contains(&staker_key),
            ErrorCode::NotQualifiedForStaking
        );

        book.total_stake += amount;

        // Transfer SOL from staker to stake pool
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.staker.to_account_info(),
                to: ctx.accounts.stake_pool.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct AddBook<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + // discriminator
                32 + // author pubkey
                4 + 50 + // title (4 bytes for string length + max 50 chars)
                4 + (8 * 5) + // chapter_prices (4 bytes for vec length + up to 5 u64 prices)
                8 + // full_book_price
                8 // total_stake
    )]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddChapter<'info> {
    #[account(mut, has_one = author)]
    pub book: Account<'info, Book>,
    #[account(init, payer = author, space = 8 + 1000 + 32 + 1)]
    pub chapter: Account<'info, Chapter>,
    #[account(mut)]
    pub author: Signer<'info>,
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

#[account]
pub struct Book {
    pub author: Pubkey,
    pub title: String,
    pub chapter_prices: Vec<u64>,
    pub full_book_price: u64,
    pub total_stake: u64,
    pub readers: Vec<Pubkey>,
    pub chapter_readers: Vec<Vec<Pubkey>>,
}

#[account]
pub struct Chapter {
    pub content: String,
    pub book: Pubkey,
    pub index: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BookInfo {
    pub title: String,
    pub author: Pubkey,
    pub chapter_prices: Vec<u64>,
    pub full_book_price: u64,
    pub total_stake: u64,
    pub readers_count: u64,
    pub chapters_count: u64,
    pub stakers: Vec<Pubkey>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You have already purchased this chapter or book")]
    AlreadyPurchased,
    #[msg("You must purchase all chapters or the full book before staking")]
    NotQualifiedForStaking,
    #[msg("Invalid chapter index")]
    InvalidChapterIndex,
}
