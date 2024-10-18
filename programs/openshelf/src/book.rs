use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn add_book(
    ctx: Context<AddBook>,
    title: String,
    description: String,
    genre: String,
    image_url: String,
    chapters: Option<Vec<ChapterInput>>,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;

    let metadata = MetaData {
        description,
        publish_date: current_timestamp,
        genre,
        image_url,
    };

    let book = &mut ctx.accounts.book;
    book.author = *ctx.accounts.author.key;
    book.title = title;
    book.metadata = metadata;
    book.full_book_price = 0;
    book.total_stake = 0;
    book.chapters = Vec::new();
    book.stakes = Vec::new();

    // Process optional chapters
    if let Some(chapter_inputs) = chapters {
        let mut used_indices = std::collections::HashSet::new();

        for chapter_input in chapter_inputs {
            // Check if the chapter index is unique
            if !used_indices.insert(chapter_input.index) {
                return Err(ProgramErrorCode::DuplicateChapterIndex.into());
            }

            let new_chapter = Chapter {
                price: chapter_input.price,
                url: chapter_input.url,
                index: chapter_input.index,
                readers: Vec::new(),
                name: chapter_input.name,
            };

            book.chapters.push(new_chapter);
            book.full_book_price += chapter_input.price;
        }

        // Sort chapters by index
        book.chapters.sort_by_key(|c| c.index);
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ChapterInput {
    pub url: String,
    pub index: u8,
    pub price: u64,
    pub name: String,
}

#[derive(Accounts)]
pub struct AddBook<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + // discriminator
                32 + // author pubkey
                4 + 50 + // title (4 bytes for string length + max 50 chars)
                // MetaData fields
                4 + 200 + // description (4 bytes for string length + max 200 chars)
                8 + // publish_date (i64)
                4 + 50 + // genre (4 bytes for string length + max 50 chars)
                4 + 200 + // image_url (4 bytes for string length + max 200 chars)
                8 + // full_book_price
                8 + // total_stake
                4 + (32 * 10) + // readers (4 bytes for vec length + up to 10 Pubkeys)
                4 + (4 + (32 * 10)) * 10 + // chapter_readers (4 bytes for vec length + 10 chapters with 10 readers each)
                4 + (4 + 100 + 8 + 4 + 50) * 10 + // chapters (4 bytes for vec length + 10 chapters with 100 char URLs, 8 byte price, 4 byte index, 50 char name)
                4 + (40 * 5) // stakes (4 bytes for vec length + 5 stakes of 40 bytes each)
    )]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}
