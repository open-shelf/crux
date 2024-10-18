use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::{CreateCollectionV2CpiBuilder, CreateV2CpiBuilder, UpdatePluginV1CpiBuilder},
    types::{
        Attribute, Attributes, PermanentFreezeDelegate, Plugin, PluginAuthority,
        PluginAuthorityPair,
    },
};

use crate::{errors::ProgramErrorCode, state::Book, PurchaseContext, PurchaseUpdateContext};

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
    ctx: &Context<PurchaseContext>,
    purchase_type: PurchaseType,
    transaction_id: String,
) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let mut attribute_list: Vec<Attribute> = vec![];

    attribute_list.push(Attribute {
        key: "book_address".to_string(),
        value: ctx.accounts.book.key().to_string(),
    });

    match purchase_type {
        PurchaseType::FullBookPurchase => attribute_list.push(Attribute {
            key: "fully_purchased".to_string(),
            value: transaction_id,
        }),
        PurchaseType::ChapterPurchase { chapter_index } => attribute_list.push(Attribute {
            key: chapter_index.to_string(),
            value: transaction_id,
        }),
    };

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::Attributes(Attributes { attribute_list }),
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

pub fn fetch_attrib_list(book_nft: &AccountInfo<'_>) -> Result<Vec<Attribute>> {
    let (_, plugin, _) =
        mpl_core::fetch_asset_plugin::<Plugin>(book_nft, mpl_core::types::PluginType::Attributes)?;

    if let Plugin::Attributes(attributes) = plugin {
        Ok(attributes.attribute_list)
    } else {
        Err(ProgramErrorCode::NoChapterAttribute.into())
    }
}

pub fn update_attributes_plugin(
    ctx: &Context<PurchaseUpdateContext>,
    purchase_type: PurchaseType,
    transaction_id: String,
) -> Result<()> {
    let mut attribute_list: Vec<Attribute> = Vec::new();

    match purchase_type {
        PurchaseType::FullBookPurchase => attribute_list.push(Attribute {
            key: "fully_purchased".to_string(),
            value: transaction_id,
        }),
        PurchaseType::ChapterPurchase { chapter_index } => attribute_list.push(Attribute {
            key: chapter_index.to_string(),
            value: transaction_id,
        }),
    }
    // Fetch existing attribute_list
    attribute_list.extend(fetch_attrib_list(&ctx.accounts.book_nft)?);

    let plugin = Plugin::Attributes(Attributes {
        attribute_list: attribute_list,
    });

    let collection_info = &ctx.accounts.collection.to_account_infos()[0];
    UpdatePluginV1CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.book_nft)
        .plugin(plugin)
        .collection(Some(collection_info))
        .payer(&ctx.accounts.buyer)
        //.authority(Some(&ctx.accounts.system_program))
        .system_program(&ctx.accounts.system_program)
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
