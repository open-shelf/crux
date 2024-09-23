use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn add_chapter(
    ctx: Context<AddChapter>,
    chapter_url: String,
    chapter_index: u8,
    price: u64,
) -> Result<()> {
    let book = &mut ctx.accounts.book;

    // Allow adding a new chapter if the index is equal to the current length of the chapters vector
    require!(
        chapter_index <= book.chapters.len() as u8,
        ProgramErrorCode::InvalidChapterIndex
    );

    let new_chapter = Chapter {
        price,
        url: chapter_url,
        index: chapter_index,
        readers: Vec::new(),
    };

    if chapter_index as usize == book.chapters.len() {
        book.chapters.push(new_chapter);
    } else {
        book.chapters[chapter_index as usize] = new_chapter;
    }

    // Update the full_book_price
    book.full_book_price += price;

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
