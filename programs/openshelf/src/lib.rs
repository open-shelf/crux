use anchor_lang::prelude::*;

mod book;
mod chapter;
mod errors;
mod nft;
mod purchase;
mod stake;
mod state;

use book::*;
use chapter::*;
use nft::*;
use purchase::*;
use stake::*;

declare_id!("7nMw3278JMFJrCwtiWW4kLe7qMjY9zAftk6t8gNCVNEH");

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

    pub fn claim_staker_earnings(ctx: Context<ClaimStakerEarnings>) -> Result<()> {
        stake::claim_staker_earnings(ctx)
    }

    pub fn create_user_collection(ctx: Context<CreateUserCollection>) -> Result<()> {
        nft::create_user_collection(ctx)
    }

    pub fn create_book_asset(ctx: Context<CreateBookAsset>, book_pub_key: String) -> Result<()> {
        nft::create_book_asset(ctx, book_pub_key)
    }

    pub fn create_chapter_asset(
        ctx: Context<CreateChapterAsset>,
        book_pub_key: String,
        chapter_index: u64,
    ) -> Result<()> {
        nft::create_chapter_asset(ctx, book_pub_key, chapter_index)
    }
}
