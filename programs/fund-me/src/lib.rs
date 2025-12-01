use anchor_lang::prelude::*;

pub mod instructions;

use instructions::*;

declare_id!("5AacFLpus95hMDvRxUnYuoMrh7dryys2qysiRpiALbxD");

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
}
