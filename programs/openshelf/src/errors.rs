use anchor_lang::prelude::*;

#[error_code]
pub enum ProgramErrorCode {
    #[msg("You have already purchased this chapter or book")]
    AlreadyPurchased,
    #[msg("You must purchase all chapters or the full book before staking")]
    NotQualifiedForStaking,
    #[msg("Invalid chapter index")]
    InvalidChapterIndex,
    #[msg("Duplicate chapter index")]
    DuplicateChapterIndex,
    #[msg("InsufficientFunds")]
    InsufficientFunds,
    #[msg("Stake not found for this staker")]
    StakerNotFound,
    #[msg("No rewards to claim")]
    NoEarningsToClaim,
    #[msg("No chapter attribute was found")]
    NoChapterAttribute,
    #[msg("NO context was found in ContextWrapper")]
    InvalidContextError,
    #[msg("Book not purchased")]
    BookNotPurchased,
    #[msg("Book is already published")]
    BookAlreadyPublished,
    #[msg("Maximum number of chapters reached")]
    MaxChaptersReached,
    #[msg("Chapter URL cannot be empty")]
    EmptyChapterUrl,
    #[msg("Chapter name cannot be empty")]
    EmptyChapterName,
    #[msg("Chapter name is too long")]
    ChapterNameTooLong,
    #[msg("Invalid chapter price")]
    InvalidChapterPrice,
    #[msg("Chapter price is too high")]
    ChapterPriceTooHigh,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Book title cannot be empty")]
    EmptyBookTitle,
    #[msg("Book title is too long")]
    BookTitleTooLong,
    #[msg("Book description cannot be empty")]
    EmptyBookDescription,
    #[msg("Book description is too long")]
    BookDescriptionTooLong,
    #[msg("Book genre cannot be empty")]
    EmptyBookGenre,
    #[msg("Book genre is too long")]
    BookGenreTooLong,
    #[msg("Image URL cannot be empty")]
    EmptyImageUrl,
    #[msg("Image URL is too long")]
    ImageUrlTooLong,
    #[msg("Too many chapters")]
    TooManyChapters,
    #[msg("Chapter URL is too long")]
    ChapterUrlTooLong,
    #[msg("Chapter indices must be continuous")]
    NonContinuousChapterIndices,
    #[msg("Book is not published")]
    BookNotPublished,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("No stakers available")]
    NoStakers,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Stake amount is too high")]
    StakeAmountTooHigh,
    #[msg("Maximum number of stakers reached")]
    MaxStakersReached,
    #[msg("Invalid transaction ID")]
    InvalidTransactionId,
}
