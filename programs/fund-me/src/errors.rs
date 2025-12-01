use anchor_lang::prelude::*;

#[error_code]
pub enum DonationError {
    #[msg("Project fundraising period has ended.")]
    ProjectExpired,
}
