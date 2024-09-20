use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("6sPkjZEfevcJVmUVzvvW57QAZnu3Q8mvLg1CcJLZyaL4");

#[program]
pub mod openshelf {
    use super::*;

    pub fn create_book(ctx: Context<CreateBook>, title: String, author: Pubkey) -> ProgramResult {
        let book = &mut ctx.accounts.book;
        book.title = title;
        book.author = author;
        book.chapter_count = 0;
        book.total_staked = 0;
        Ok(())
    }

    pub fn add_chapter(ctx: Context<AddChapter>, content: String, price: u64) -> ProgramResult {
        let book = &mut ctx.accounts.book;
        let chapter = &mut ctx.accounts.chapter;
        chapter.content = content;
        chapter.price = price;
        chapter.purchases = 0;
        book.chapter_count += 1;
        Ok(())
    }

    pub fn stake_on_book(ctx: Context<StakeOnBook>, amount: u64) -> ProgramResult {
        let book = &mut ctx.accounts.book;
        let stake = &mut ctx.accounts.stake;
        stake.amount = amount;
        book.total_staked += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBook<'info> {
    #[account(init, payer = author, space = 8 + 32 + 32 + 8 + 8)]
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddChapter<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(init, payer = author, space = 8 + 256 + 8 + 8)]
    pub chapter: Account<'info, Chapter>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeOnBook<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
    #[account(init, payer = staker, space = 8 + 8)]
    pub stake: Account<'info, Stake>,
    #[account(mut)]
    pub staker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Book {
    pub title: String,
    pub author: Pubkey,
    pub chapter_count: u64,
    pub total_staked: u64,
}

#[account]
pub struct Chapter {
    pub content: String,
    pub price: u64,
    pub purchases: u64,
}

#[account]
pub struct Stake {
    pub amount: u64,
}
