use crate::errors::DonationError;
use crate::instructions::init_project::Project;
use crate::ANCHOR_DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;

pub fn donate(ctx: Context<MakeDonation>, amount: u64, _project: String) -> Result<()> {
    // Check if project deadline has passed
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    require!(
        current_time < ctx.accounts.project.end_time,
        DonationError::ProjectExpired
    );

    // Transfer SOL from user to project
    let txn = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.user.key(),
        &ctx.accounts.project.key(),
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &txn,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.project.to_account_info(),
        ],
    )?;

    // Update donation amount
    (&mut ctx.accounts.project).current_amount += amount;

    // Update receipt
    let receipt = &mut ctx.accounts.receipt;
    receipt.user = ctx.accounts.user.key();
    receipt.project = ctx.accounts.project.key();
    receipt.amount = amount;
    receipt.timestamp = current_time;
    receipt.bump = ctx.bumps.receipt;

    msg!("Donation received: {} lamports", amount);
    msg!(
        "Total raised: {}/{}",
        ctx.accounts.project.current_amount,
        ctx.accounts.project.target_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct MakeDonation<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Donation::INIT_SPACE,
        seeds = [b"receipt", user.key().as_ref(), project.key().as_ref()],
        bump,
    )]
    pub receipt: Account<'info, Donation>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Donation {
    pub user: Pubkey,
    pub project: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}
