use crate::errors::DonationError;
use crate::instructions::init_project::Project;
use crate::ANCHOR_DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;

pub fn donate(ctx: Context<MakeDonation>, amount: u64, timestamp_pda: i64) -> Result<()> {
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

    // Create receipt for refund tracking
    let receipt = &mut ctx.accounts.receipt;
    receipt.user = ctx.accounts.user.key();
    receipt.project = ctx.accounts.project.key();
    receipt.amount = amount;
    receipt.timestamp = current_time;
    receipt.refunded = false;
    receipt.bump = ctx.bumps.receipt;

    msg!("Donation received: {} lamports", amount);
    msg!("Receipt timestamp account: {}", timestamp_pda);
    msg!("Transaction timestamp: {}", current_time);
    msg!(
        "Total raised: {}/{}",
        ctx.accounts.project.current_amount,
        ctx.accounts.project.target_amount
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, timestamp_pda: i64)]
pub struct MakeDonation<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + DonationReceipt::INIT_SPACE,
        seeds = [
            b"receipt",
            user.key().as_ref(),
            project.key().as_ref(),
            &timestamp_pda.to_le_bytes()
        ],
        bump,
    )]
    pub receipt: Account<'info, DonationReceipt>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct DonationReceipt {
    pub user: Pubkey,
    pub project: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub refunded: bool,
    pub bump: u8,
}
