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

declare_id!("AGVyPYiXUtSnKqqgLWcs5LAfh94ct1CtuaiCSFuGMxxW");

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

    pub fn create_book_asset(ctx: Context<CreateBookAsset>) -> Result<()> {
        nft::create_book_asset(ctx)
    }

    pub fn create_chapter_asset(
        ctx: Context<CreateChapterAsset>,
        chapter_index: u64,
    ) -> Result<()> {
        nft::create_chapter_asset(ctx, chapter_index)
    }

    pub fn create_user_collection_and_book_asset(
        ctx: Context<CreateUserCollectionAndBookAsset>,
        chapter_index: usize,
    ) -> Result<()> {
        nft::create_user_collection_and_book_asset(ctx, chapter_index)
    }

    pub fn add_chapter_attribute(
        ctx: Context<AddChapterAttribute>,
        chapter_index: usize,
    ) -> Result<()> {
        nft::add_chapter_attribute(ctx, chapter_index);
        Ok(())
    }
}
