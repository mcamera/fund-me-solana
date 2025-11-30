use anchor_lang::prelude::*;

declare_id!("5AacFLpus95hMDvRxUnYuoMrh7dryys2qysiRpiALbxD");

#[program]
pub mod fund_me {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
