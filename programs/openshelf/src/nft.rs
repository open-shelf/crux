use crate::state::Book;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use mpl_core::instructions::UpdatePluginV1Builder;
use mpl_core::types::{Attribute, Attributes};
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
        .name("OpenShelf Collection".to_string())
        .uri("http://localhost:8000/user-collection/".to_string())
        .plugins(collection_plugins)
        .invoke()?;

    Ok(())
}

pub fn create_book_asset(ctx: Context<CreateBookAsset>) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let book = &ctx.accounts.book;
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book.title.clone())
        .uri(book.metadata.image_url.to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

pub fn create_book_asset_with_chapter(ctx: Context<CreateBookAssetWithChapter>) -> Result<()> {
    let mut plugins = vec![];

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    let book = &ctx.accounts.book;
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book.title.clone())
        .uri(book.metadata.image_url.to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

pub fn create_chapter_asset(ctx: Context<CreateChapterAsset>, chapter_index: usize) -> Result<()> {
    let chapter = ctx.accounts.book.chapters.get(chapter_index).unwrap();

    let mut plugins = vec![];
    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    // Add Attrib plugin
    let attrib_plugin = Plugin::Attributes(Attributes {
        attribute_list: vec![Attribute {
            key: chapter_index.to_string(),
            value: chapter.url.clone(),
        }],
    });

    plugins.push(PluginAuthorityPair {
        plugin: attrib_plugin,
        authority: None,
    });

    let book = &ctx.accounts.book;
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book.title.clone())
        .uri(book.metadata.image_url.to_string())
        .plugins(plugins)
        .invoke()?;

    Ok(())
}

pub fn add_chapter_attribute(
    ctx: Context<AddChapterAttribute>,
    chapter_index: usize,
) -> Result<()> {
    let chapter = ctx.accounts.book.chapters.get(chapter_index).unwrap();
    let attrib = (ctx.accounts.asset);

    let update_attributes_plugin_ix = UpdatePluginV1Builder::new()
        .asset(*ctx.accounts.asset.key)
        .payer(*ctx.accounts.payer.key)
        .plugin(Plugin::Attributes(Attributes {
            attribute_list: vec![Attribute {
                key: chapter_index.to_string(),
                value: chapter.url.clone(),
            }],
        }))
        .instruction();

    Ok(())
}
pub fn create_user_collection_and_book_asset(
    ctx: Context<CreateUserCollectionAndBookAsset>,
    chapter_index: usize,
) -> Result<()> {
    // First, create the user collection
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

    let chapter = ctx.accounts.book.chapters.get(chapter_index).unwrap();

    let mut plugins = vec![];
    plugins.push(PluginAuthorityPair {
        plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
        authority: None,
    });

    // Add Attrib plugin
    let attrib_plugin = Plugin::Attributes(Attributes {
        attribute_list: vec![Attribute {
            key: chapter_index.to_string(),
            value: chapter.url.clone(),
        }],
    });

    plugins.push(PluginAuthorityPair {
        plugin: attrib_plugin,
        authority: None,
    });

    let book = &ctx.accounts.book;
    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .owner(Some(&ctx.accounts.payer.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .name(book.title.clone())
        .uri(book.metadata.image_url.to_string())
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

#[derive(Accounts)]
pub struct CreateUserCollectionAndBookAsset<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub collection: Signer<'info>,
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub asset: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBookAssetWithChapter<'info> {
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
pub struct AddChapterAttribute<'info> {
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub collection: Signer<'info>,
    pub book: Account<'info, Book>,
    #[account(mut)]
    pub asset: Signer<'info>,
    /// CHECK: This is the MPL Core program ID
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
