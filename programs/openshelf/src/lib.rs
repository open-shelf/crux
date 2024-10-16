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

declare_id!("FCSjz1q2kFjW4JovLVoAqVDKY1W927hEdcZMADHDii65");

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

    pub fn create_book_asset_full_ctx(ctx: Context<PurchaseFullBook>) -> Result<()> {
        nft::create_book_asset_full_ctx(
            ctx,
            PurchaseType::FullBookPurchase,
            "transaction_id".to_string(),
        )?;
        Ok(())
    }
    // Deprecated: Assets created along with purchasing
    // pub fn create_book_asset(ctx: Context<CreateBookAsset>, chapter_index: u8) -> Result<()> {
    //     let transactionId = "".to_string();
    //     let purchase_type = PurchaseType::ChapterPurchase {
    //         chapter_index: chapter_index,
    //     };
    //     nft::create_book_asset(ctx, purchase_type, transactionId)
    // }

    // pub fn create_chapter_asset(ctx: Context<CreateChapterAsset>, chapter_index: u8) -> Result<()> {
    //     nft::create_chapter_asset(ctx, chapter_index)
    // }
}
