use anchor_lang::prelude::*;

#[account]
pub struct Book {
    pub author: Pubkey,
    pub title: String,
    pub meta_url: String,
    pub full_book_price: u64,
    pub total_stake: u64,
    pub chapters: Vec<Chapter>,
    pub stakes: Vec<Stake>,
    pub readers: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Chapter {
    pub price: u64,
    pub url: String,
    pub index: u8,
    pub readers: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Stake {
    pub staker: Pubkey,
    pub amount: u64,
    pub earnings: u64,
}
