use anchor_lang::prelude::*;

mod book;
mod chapter;
mod errors;
mod purchase;
mod stake;
mod state;

use book::*;
use chapter::*;
use purchase::*;
use stake::*;

declare_id!("AAekmk2UZgmN1Av5EC5uHhuqENnXzXeRvjVNs514u653");

#[program]
pub mod openshelf {
    use super::*;

    pub fn add_book(ctx: Context<AddBook>, title: String, meta_url: String) -> Result<()> {
        book::add_book(ctx, title, meta_url)
    }

    pub fn add_chapter(
        ctx: Context<AddChapter>,
        chapter_url: String,
        chapter_index: u8,
        price: u64,
        name: String,
    ) -> Result<()> {
        chapter::add_chapter(ctx, chapter_url, chapter_index, price, name)
    }

    pub fn purchase_chapter(ctx: Context<PurchaseChapter>, chapter_index: u8) -> Result<()> {
        purchase::purchase_chapter(ctx, chapter_index)
    }

    pub fn purchase_full_book(ctx: Context<PurchaseFullBook>) -> Result<()> {
        purchase::purchase_full_book(ctx)
    }

    pub fn stake_on_book(ctx: Context<StakeOnBook>, amount: u64) -> Result<()> {
        stake::stake_on_book(ctx, amount)
    }
}
