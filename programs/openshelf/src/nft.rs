use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::{CreateCollectionV2CpiBuilder, CreateV2CpiBuilder},
    types::{PermanentFreezeDelegate, Plugin, PluginAuthorityPair},
};

pub fn create_user_collection(ctx: Context<CreateUserCollection>) -> Result<()> {
    let mut collection_plugins = vec![];

    collection_plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    CreateCollectionV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .collection(&ctx.accounts.collection.to_account_info())
        .payer(&ctx.accounts.payer.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name("User Collection".to_string())
        .uri("http://localhost:8000/user-collection/".to_string())
        .plugins(collection_plugins)
        .invoke()?;

    Ok(())
}

pub fn create_book_asset(ctx: Context<CreateBookAsset>, book_pub_key: String) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book_pub_key.to_string())
        .uri("http://localhost:8000/bookNFT/".to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

pub fn create_chapter_asset(
    ctx: Context<CreateChapterAsset>,
    book_pub_key: String,
    chapter_index: u64,
) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let asset_name = format!("{}:{}", book_pub_key, chapter_index);

    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(asset_name)
        .uri("http://localhost:8000/chapterNFT/".to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateUserCollection<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub collection: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBookAsset<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = collection.update_authority == signer.key(),
    )]
    pub collection: Account<'info, BaseCollectionV1>,
    #[account(mut)]
    pub asset: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateChapterAsset<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = collection.update_authority == signer.key(),
    )]
    pub collection: Account<'info, BaseCollectionV1>,
    #[account(mut)]
    pub asset: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
