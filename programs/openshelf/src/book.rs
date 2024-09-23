use crate::state::*;
use anchor_lang::prelude::*;

pub fn add_book(ctx: Context<AddBook>, title: String, meta_url: String) -> Result<()> {
    let book = &mut ctx.accounts.book;
    book.author = *ctx.accounts.author.key;
    book.title = title;
    book.meta_url = meta_url; // Add meta_url field
    book.full_book_price = 0;
    book.total_stake = 0;
    book.chapters = Vec::new();
    book.stakes = Vec::new();
    Ok(())
}

#[derive(Accounts)]
pub struct AddBook<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + // discriminator
                32 + // author pubkey
                4 + 50 + // title (4 bytes for string length + max 50 chars)
                4 + 50 + // meta_url (4 bytes for string length + max 50 chars)
                8 + // full_book_price
                8 + // total_stake
                4 + (32 * 10) + // readers (4 bytes for vec length + up to 10 Pubkeys)
                4 + (4 + (32 * 10)) * 5 + // chapter_readers (4 bytes for vec length + 5 chapters with 10 readers each)
                4 + (4 + 100) * 5 + // chapters (4 bytes for vec length + 5 chapters with 100 char URLs)
                4 + (40 * 5) // stakes (4 bytes for vec length + 5 stakes of 40 bytes each)
    )]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}
