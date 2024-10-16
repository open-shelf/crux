use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::{AddPluginV1CpiBuilder, CreateCollectionV2CpiBuilder, CreateV2CpiBuilder},
    types::{
        Attribute, Attributes, PermanentFreezeDelegate, Plugin, PluginAuthority,
        PluginAuthorityPair,
    },
};

use crate::{state::Book, PurchaseContext};

pub enum PurchaseType {
    FullBookPurchase,
    ChapterPurchase { chapter_index: u8 },
}

pub fn create_user_nft(ctx: Context<CreateUserCollection>) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::Attributes(Attributes {
            attribute_list: vec![Attribute {
                key: "collection_id".to_string(),
                value: ctx.accounts.collection.key.to_string(),
            }],
        }),
        authority: None,
    });

    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.user_nft_asset.to_account_info())
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name("OpenShelf User".to_string())
        .uri("openshelf.xyz".to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

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
        .name("OpenShelf Collection".to_string())
        .uri("http://localhost:8000/user-collection/".to_string())
        .plugins(collection_plugins)
        .invoke()?;

    create_user_nft(ctx)?;

    Ok(())
}

pub fn create_book_asset(
    ctx: Context<PurchaseContext>,
    purchase_type: PurchaseType,
    transaction_id: String,
) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let plugin = match purchase_type {
        PurchaseType::FullBookPurchase => Plugin::Attributes(Attributes {
            attribute_list: vec![Attribute {
                key: "fully_purchased".to_string(),
                value: transaction_id,
            }],
        }),
        PurchaseType::ChapterPurchase { chapter_index } => Plugin::Attributes(Attributes {
            attribute_list: vec![Attribute {
                key: chapter_index.to_string(),
                value: transaction_id,
            }],
        }),
    };

    plugins.push(PluginAuthorityPair {
        plugin: plugin,
        authority: Some(PluginAuthority::UpdateAuthority),
    });

    let book = &ctx.accounts.book;
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.book_nft.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&&ctx.accounts.buyer.to_account_info())
        .owner(Some(&ctx.accounts.buyer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book.title.clone())
        .uri(book.metadata.image_url.to_string())
        .plugins(plugins)
        //.authority(Some(&ctx.accounts.system_program))
        .invoke()?;

    Ok(())
}

pub fn update_attributes_plugin(
    ctx: Context<PurchaseContext>,
    chapter_index: u8,
    transaction_id: String,
) -> Result<()> {
    let plugin = Plugin::Attributes(Attributes {
        attribute_list: vec![Attribute {
            key: chapter_index.to_string(),
            value: transaction_id,
        }],
    });

    let collection_info = &ctx.accounts.collection.to_account_infos()[0];

    AddPluginV1CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.book_nft)
        .plugin(plugin)
        .collection(Some(collection_info))
        .payer(&ctx.accounts.buyer)
        //.authority(Some(&ctx.accounts.system_program))
        .system_program(&ctx.accounts.system_program)
        .invoke()?;
    Ok(())
}

// To be deprecated: chapters will be added as attributes than as assets
pub fn _create_chapter_asset(ctx: Context<CreateChapterAsset>, chapter_index: u8) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let book = &ctx.accounts.book;

    let asset_name = format!("{}:{}", book.title, chapter_index);

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
    #[account(mut)]
    pub user_nft_asset: Signer<'info>,
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
    pub book: Account<'info, Book>,
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
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub asset: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
