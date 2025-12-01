import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { 
  getProvider, 
  getProgram, 
  getProjectPda,
  getDonationReceiptPda,
  createMetadata,
  getFutureTimestamp 
} from "./helpers";

describe("Donate", () => {
  const provider = getProvider();
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let projectPda: anchor.web3.PublicKey;
  const projectId = "donate-test-project";

  before(async () => {
    // Create a project for donation tests
    const [pda] = getProjectPda(owner, projectId, program.programId);
    projectPda = pda;

    const metadata = createMetadata(
      "Donation Test Project",
      "A project for testing donations",
      "https://example.com/image.png"
    );

    const targetAmount = new anchor.BN(5_000_000_000); // 5 SOL
    const endTime = new anchor.BN(getFutureTimestamp(48)); // 48h from now

    await program.methods
      .initProject(projectId, metadata, targetAmount, endTime)
      .accounts({ owner })
      .rpc();

    console.log("Test project created at:", projectPda.toBase58());
  });

  it("Should accept a donation and create receipt", async () => {
    const donationAmount = new anchor.BN(1_000_000_000); // 1 SOL
    const timestampPda = new anchor.BN(Date.now());
    const [receiptPda] = getDonationReceiptPda(owner, projectPda, timestampPda, program.programId);

    const projectBefore = await program.account.project.fetch(projectPda);
    const currentAmountBefore = projectBefore.currentAmount;

    const tx = await program.methods
      .donate(donationAmount, timestampPda)
      .accounts({
        user: owner,
        project: projectPda,
        receipt: receiptPda,
      })
      .rpc();

    console.log("Donation transaction:", tx);

    // Check project was updated
    const projectAfter = await program.account.project.fetch(projectPda);
    expect(projectAfter.currentAmount.toString()).to.equal(
      currentAmountBefore.add(donationAmount).toString()
    );

    // Check receipt was created
    const receipt = await program.account.donationReceipt.fetch(receiptPda);
    expect(receipt.user.toBase58()).to.equal(owner.toBase58());
    expect(receipt.project.toBase58()).to.equal(projectPda.toBase58());
    expect(receipt.amount.toString()).to.equal(donationAmount.toString());
    expect(receipt.timestamp.toNumber()).to.be.greaterThan(0);
    expect(receipt.refunded).to.equal(false);
  });

  it("Should fail donation to expired project", async () => {
    // Create expired project
    const expiredProjectId = "expired-project";
    const [expiredProjectPda] = getProjectPda(owner, expiredProjectId, program.programId);

    const metadata = createMetadata(
      "Expired Project",
      "This project has expired",
      "https://example.com/image.png"
    );

    const targetAmount = new anchor.BN(1_000_000_000);
    const pastEndTime = new anchor.BN(Math.floor(Date.now() / 1000) - 3600); // 1h ago

    await program.methods
      .initProject(expiredProjectId, metadata, targetAmount, pastEndTime)
      .accounts({ owner })
      .rpc();

    // Try to donate to expired project
    const donationAmount = new anchor.BN(100_000_000);
    const timestampPda = new anchor.BN(Date.now());
    const [expiredReceiptPda] = getDonationReceiptPda(owner, expiredProjectPda, timestampPda, program.programId);

    try {
      await program.methods
        .donate(donationAmount, timestampPda)
        .accounts({
          user: owner,
          project: expiredProjectPda,
          receipt: expiredReceiptPda,
        })
        .rpc();
      
      expect.fail("Should have thrown ProjectExpired error");
    } catch (error: any) {
      expect(error.toString()).to.include("ProjectExpired");
    }
  });

  it("Should track multiple donations from same user", async () => {
    const projectId2 = "multi-donation-project";
    const [projectPda2] = getProjectPda(owner, projectId2, program.programId);

    const metadata = createMetadata(
      "Multi Donation Project",
      "Testing multiple donations",
      "https://example.com/image.png"
    );

    const targetAmount = new anchor.BN(3_000_000_000);
    const endTime = new anchor.BN(getFutureTimestamp(24));

    await program.methods
      .initProject(projectId2, metadata, targetAmount, endTime)
      .accounts({ owner })
      .rpc();

    // First donation
    const donation1 = new anchor.BN(500_000_000);
    const timestampPda1 = new anchor.BN(Date.now());
    const [receiptPda1] = getDonationReceiptPda(owner, projectPda2, timestampPda1, program.programId);

    await program.methods
      .donate(donation1, timestampPda1)
      .accounts({
        user: owner,
        project: projectPda2,
        receipt: receiptPda1,
      })
      .rpc();

    const projectAfterFirst = await program.account.project.fetch(projectPda2);
    expect(projectAfterFirst.currentAmount.toString()).to.equal(donation1.toString());

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second donation with different timestamp
    const donation2 = new anchor.BN(300_000_000);
    const timestampPda2 = new anchor.BN(Date.now());
    const [receiptPda2] = getDonationReceiptPda(owner, projectPda2, timestampPda2, program.programId);

    await program.methods
      .donate(donation2, timestampPda2)
      .accounts({
        user: owner,
        project: projectPda2,
        receipt: receiptPda2,
      })
      .rpc();

    const projectAfterSecond = await program.account.project.fetch(projectPda2);
    expect(projectAfterSecond.currentAmount.toString()).to.equal(
      donation1.add(donation2).toString()
    );

    // Verify both receipts exist
    const receipt1 = await program.account.donationReceipt.fetch(receiptPda1);
    expect(receipt1.amount.toString()).to.equal(donation1.toString());

    const receipt2 = await program.account.donationReceipt.fetch(receiptPda2);
    expect(receipt2.amount.toString()).to.equal(donation2.toString());
  });
});
