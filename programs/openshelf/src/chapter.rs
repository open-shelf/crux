use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn add_chapter(
    ctx: Context<AddChapter>,
    chapter_url: String,
    chapter_index: u8,
    price: u64,
    name: String,
) -> Result<()> {
    let book = &mut ctx.accounts.book;

    // Check if the maximum number of chapters has been reached
    require!(
        book.chapters.len() < 255,
        ProgramErrorCode::MaxChaptersReached
    );

    // Allow adding a new chapter if the index is equal to the current length of the chapters vector
    require!(
        chapter_index <= book.chapters.len() as u8,
        ProgramErrorCode::InvalidChapterIndex
    );

    // Check if the chapter URL is not empty
    require!(!chapter_url.is_empty(), ProgramErrorCode::EmptyChapterUrl);

    // Check if the chapter name is not empty and within a reasonable length
    require!(!name.is_empty(), ProgramErrorCode::EmptyChapterName);
    require!(name.len() <= 100, ProgramErrorCode::ChapterNameTooLong);

    // Check if the price is within a reasonable range
    require!(price > 0, ProgramErrorCode::InvalidChapterPrice);
    require!(
        price <= 1_000_000_000,
        ProgramErrorCode::ChapterPriceTooHigh
    ); // 1 SOL (assuming 9 decimals)

    let new_chapter = Chapter {
        price,
        url: chapter_url,
        index: chapter_index,
        readers: Vec::new(),
        name,
    };

    if chapter_index as usize == book.chapters.len() {
        book.chapters.push(new_chapter);
    } else {
        book.chapters[chapter_index as usize] = new_chapter;
    }

    // Update the full_book_price
    book.full_book_price = book
        .full_book_price
        .checked_add(price)
        .ok_or(ProgramErrorCode::ArithmeticOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct AddChapter<'info> {
    #[account(mut, has_one = author)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}
