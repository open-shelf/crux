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

declare_id!("CHvjheWKjEgv4xofs9jdKE1EA6tLSzpxbdptpyRFZpYE");

#[program]
pub mod openshelf {
    use super::*;

    pub fn add_book(
        ctx: Context<AddBook>,
        title: String,
        chapter_prices: Vec<u64>,
        full_book_price: u64,
    ) -> Result<()> {
        book::add_book(ctx, title, chapter_prices, full_book_price)
    }

    pub fn add_chapter(
        ctx: Context<AddChapter>,
        chapter_url: String,
        chapter_index: u8,
    ) -> Result<()> {
        chapter::add_chapter(ctx, chapter_url, chapter_index)
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
