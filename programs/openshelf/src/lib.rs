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

declare_id!("9xQuQk8u7L5kRifgPY5xjXhrtfjR3fp5kEekXPUpPzY8");

#[program]
pub mod openshelf {
    use errors::ProgramErrorCode;

    use super::*;

    pub fn add_book(
        ctx: Context<AddBook>,
        title: String,
        description: String,
        genre: String,
        image: String,
        chapters: Option<Vec<ChapterInput>>,
    ) -> Result<()> {
        book::add_book(ctx, title, description, genre, image, chapters)
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

    pub fn purchase_chapter(
        ctx: Context<PurchaseContext>,
        chapter_index: u8,
        need_nft: bool,
    ) -> Result<()> {
        purchase::purchase_chapter(ctx, chapter_index, need_nft)
    }

    pub fn purchase_chapter_with_existing_nft(
        ctx: Context<PurchaseUpdateContext>,
        chapter_index: u8,
        need_nft: bool,
    ) -> Result<()> {
        purchase::purchase_chapter_with_existing_nft(ctx, chapter_index, need_nft)
    }

    pub fn purchase_full_book(ctx: Context<PurchaseContext>, need_nft: bool) -> Result<()> {
        purchase::purchase_full_book(ctx, need_nft)
    }

    pub fn purchase_full_book_with_existing_nft(
        ctx: Context<PurchaseUpdateContext>,
        need_nft: bool,
    ) -> Result<()> {
        purchase::purchase_full_book_with_existing_nft(ctx, need_nft)
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

    pub fn mint_book_nft(ctx: Context<PurchaseContext>) -> Result<()> {
        //Check if bookNFT is created by our code
        for attrib in nft::fetch_attrib_list(&ctx.accounts.book_nft)? {
            if !attrib.key.eq(&"fully_purchased".to_string()) {
                return err!(ProgramErrorCode::BookNotPurchased);
            }
        }
        nft::create_book_asset(
            &ctx,
            PurchaseType::FullBookPurchase,
            "transaction_id".to_string(),
        )?;
        Ok(())
    }
}
