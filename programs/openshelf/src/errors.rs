use anchor_lang::prelude::*;

#[error_code]
pub enum ProgramErrorCode {
    #[msg("You have already purchased this chapter or book")]
    AlreadyPurchased,
    #[msg("You must purchase all chapters or the full book before staking")]
    NotQualifiedForStaking,
    #[msg("Invalid chapter index")]
    InvalidChapterIndex,
    #[msg("InsufficientFunds")]
    InsufficientFunds,
    #[msg("Stake not found for this staker")]
    StakerNotFound,
    #[msg("No rewards to claim")]
    NoEarningsToClaim,
}
