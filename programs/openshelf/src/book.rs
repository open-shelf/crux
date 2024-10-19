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
    // Check title length
    require!(!title.is_empty(), ProgramErrorCode::EmptyBookTitle);
    require!(title.len() <= 50, ProgramErrorCode::BookTitleTooLong);

    // Check description length
    require!(
        !description.is_empty(),
        ProgramErrorCode::EmptyBookDescription
    );
    require!(
        description.len() <= 200,
        ProgramErrorCode::BookDescriptionTooLong
    );

    // Check genre length
    require!(!genre.is_empty(), ProgramErrorCode::EmptyBookGenre);
    require!(genre.len() <= 50, ProgramErrorCode::BookGenreTooLong);

    // Check image URL
    require!(!image_url.is_empty(), ProgramErrorCode::EmptyImageUrl);
    require!(image_url.len() <= 200, ProgramErrorCode::ImageUrlTooLong);

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
        require!(
            chapter_inputs.len() <= 255,
            ProgramErrorCode::TooManyChapters
        );

        let mut used_indices = std::collections::HashSet::new();
        let mut total_price: u64 = 0;

        for chapter_input in chapter_inputs {
            // Check if the chapter index is unique
            require!(
                used_indices.insert(chapter_input.index),
                ProgramErrorCode::DuplicateChapterIndex
            );

            // Check chapter name
            require!(
                !chapter_input.name.is_empty(),
                ProgramErrorCode::EmptyChapterName
            );
            require!(
                chapter_input.name.len() <= 50,
                ProgramErrorCode::ChapterNameTooLong
            );

            // Check chapter URL
            require!(
                !chapter_input.url.is_empty(),
                ProgramErrorCode::EmptyChapterUrl
            );
            require!(
                chapter_input.url.len() <= 100,
                ProgramErrorCode::ChapterUrlTooLong
            );

            // Check chapter price
            require!(
                chapter_input.price > 0,
                ProgramErrorCode::InvalidChapterPrice
            );
            require!(
                chapter_input.price <= 1_000_000_000, // 1 SOL (assuming 9 decimals)
                ProgramErrorCode::ChapterPriceTooHigh
            );

            let new_chapter = Chapter {
                price: chapter_input.price,
                url: chapter_input.url,
                index: chapter_input.index,
                readers: Vec::new(),
                name: chapter_input.name,
            };

            book.chapters.push(new_chapter);
            total_price = total_price
                .checked_add(chapter_input.price)
                .ok_or(ProgramErrorCode::ArithmeticOverflow)?;
        }

        // Sort chapters by index
        book.chapters.sort_by_key(|c| c.index);

        // Check if indices are continuous
        for (i, chapter) in book.chapters.iter().enumerate() {
            require!(
                chapter.index as usize == i,
                ProgramErrorCode::NonContinuousChapterIndices
            );
        }

        book.full_book_price = total_price;
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
