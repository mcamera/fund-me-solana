use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("5AacFLpus95hMDvRxUnYuoMrh7dryys2qysiRpiALbxD");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod fund_me {
    use super::*;

    pub fn init_project(
        ctx: Context<InitProject>,
        project_id: String,
        metadata: ProjectMetadata,
        target_amount: u64,
        end_time: i64,
    ) -> Result<()> {
        instructions::init_project::init_project(ctx, project_id, metadata, target_amount, end_time)
    }

    pub fn donate(ctx: Context<MakeDonation>, amount: u64, timestamp_pda: i64) -> Result<()> {
        instructions::donate::donate(ctx, amount, timestamp_pda)
    }
}
