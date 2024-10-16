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

declare_id!("2nL8bYp1CQQ8pDczs2bLr3Yspy5GUUUPAq3CVJhEP9v8");

#[program]
pub mod openshelf {
    use super::*;

    pub fn add_book(
        ctx: Context<AddBook>,
        title: String,
        description: String,
        genre: String,
        image: String,
    ) -> Result<()> {
        book::add_book(ctx, title, description, genre, image)
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

    pub fn purchase_chapter(ctx: Context<PurchaseContext>, chapter_index: u8) -> Result<()> {
        purchase::purchase_chapter(ctx, chapter_index)
    }

    pub fn purchase_chapter_with_existing_nft(
        ctx: Context<PurchaseUpdateContext>,
        chapter_index: u8,
    ) -> Result<()> {
        purchase::purchase_chapter_with_existing_nft(ctx, chapter_index)
    }

    pub fn purchase_full_book(ctx: Context<PurchaseContext>) -> Result<()> {
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

    pub fn create_book_asset_full_ctx(ctx: Context<PurchaseContext>) -> Result<()> {
        nft::create_book_asset(
            &ctx,
            PurchaseType::FullBookPurchase,
            "transaction_id".to_string(),
        )?;
        Ok(())
    }
}
