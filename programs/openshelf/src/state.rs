use anchor_lang::prelude::*;

#[account]
pub struct Book {
    pub author: Pubkey,
    pub title: String,
    pub chapter_prices: Vec<u64>,
    pub full_book_price: u64,
    pub total_stake: u64,
    pub readers: Vec<Pubkey>,
    pub chapter_readers: Vec<Vec<Pubkey>>,
    pub chapters: Vec<String>,
    pub stakes: Vec<Stake>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Stake {
    pub staker: Pubkey,
    pub amount: u64,
    pub earnings: u64,
}
