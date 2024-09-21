use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

pub fn add_chapter(ctx: Context<AddChapter>, chapter_url: String, chapter_index: u8) -> Result<()> {
    let book = &mut ctx.accounts.book;
    require!(
        chapter_index < book.chapter_prices.len() as u8,
        ProgramErrorCode::InvalidChapterIndex
    );

    if chapter_index as usize >= book.chapters.len() {
        book.chapters.push(chapter_url);
    } else {
        book.chapters[chapter_index as usize] = chapter_url;
    }

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
