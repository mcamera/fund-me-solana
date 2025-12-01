use anchor_lang::prelude::*;

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

pub fn init_project(
    ctx: Context<InitProject>,
    project_id: String,
    metadata: ProjectMetadata,
    target_amount: u64,
    end_time: i64,
) -> Result<()> {
    let project = &mut ctx.accounts.project;
    project.owner = *ctx.accounts.owner.key;
    project.project_id = project_id;
    project.metadata = metadata;
    project.target_amount = target_amount;
    project.current_amount = 0;
    project.end_time = end_time;
    project.bump = ctx.bumps.project;

    msg!("Program Id: {:?}", ctx.program_id);
    msg!("Project Owner pubkey: {}", project.key().to_string());
    msg!("Project Title: {}", project.metadata.title);
    msg!("Project Description: {}", project.metadata.description);
    msg!("Project Image URL: {}", project.metadata.image_url);
    msg!("Project Data pubkey: {}", project.owner.key().to_string());
    msg!("Financial Target: {}", project.target_amount.to_string());
    msg!("Deadline: {}", project.end_time.to_string());
    Ok(())
}

#[derive(Accounts)]
#[instruction(project_id: String)]
pub struct InitProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR_SIZE + Project::INIT_SPACE,
        seeds = [b"project", owner.key().as_ref(), project_id.as_bytes()],
        bump,
    )]
    pub project: Account<'info, Project>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Project {
    owner: Pubkey,
    #[max_len(32)]
    project_id: String,
    metadata: ProjectMetadata,
    target_amount: u64,
    current_amount: u64,
    end_time: i64,
    bump: u8,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProjectMetadata {
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(200)]
    pub image_url: String,
}
