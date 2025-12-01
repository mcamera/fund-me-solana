import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { 
  getProvider, 
  getProgram, 
  getProjectPda, 
  createMetadata,
  getFutureTimestamp 
} from "./helpers";

describe("InitProject", () => {
  const provider = getProvider();
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  it("Should initialize a project with correct data", async () => {
    console.log("Program ID:", program.programId.toBase58());
    
    const projectId = "project-1";
    const [projectPda] = getProjectPda(owner, projectId, program.programId);

    const metadata = createMetadata(
      "My First Project",
      "This is a test project for fundraising",
      "https://example.com/image.png"
    );

    const targetAmount = new anchor.BN(1_000_000_000); // 1 SOL
    const endTime = new anchor.BN(getFutureTimestamp(24)); // 24h from now

    const tx = await program.methods
      .initProject(projectId, metadata, targetAmount, endTime)
      .accounts({ owner })
      .rpc();

    console.log("Transaction signature:", tx);

    const projectAccount = await program.account.project.fetch(projectPda);

    expect(projectAccount.owner.toBase58()).to.equal(owner.toBase58());
    expect(projectAccount.projectId).to.equal(projectId);
    expect(projectAccount.metadata.title).to.equal(metadata.title);
    expect(projectAccount.metadata.description).to.equal(metadata.description);
    expect(projectAccount.metadata.imageUrl).to.equal(metadata.imageUrl);
    expect(projectAccount.targetAmount.toString()).to.equal(targetAmount.toString());
    expect(projectAccount.currentAmount.toString()).to.equal("0");
    expect(projectAccount.endTime.toString()).to.equal(endTime.toString());
    expect(projectAccount.bump).to.be.greaterThan(0);
  });

  it("Should allow multiple projects for same owner", async () => {
    const projectId2 = "project-2";
    const projectId3 = "project-3";
    
    const metadata2 = createMetadata("Second Project", "Another project", "https://example.com/image2.png");
    const metadata3 = createMetadata("Third Project", "Yet another project", "https://example.com/image3.png");

    const targetAmount = new anchor.BN(500_000_000);
    const endTime = new anchor.BN(getFutureTimestamp(24));

    const [projectPda2] = getProjectPda(owner, projectId2, program.programId);
    await program.methods
      .initProject(projectId2, metadata2, targetAmount, endTime)
      .accounts({ owner })
      .rpc();

    const project2 = await program.account.project.fetch(projectPda2);
    expect(project2.projectId).to.equal(projectId2);
    expect(project2.metadata.title).to.equal(metadata2.title);

    const [projectPda3] = getProjectPda(owner, projectId3, program.programId);
    await program.methods
      .initProject(projectId3, metadata3, targetAmount, endTime)
      .accounts({ owner })
      .rpc();

    const project3 = await program.account.project.fetch(projectPda3);
    expect(project3.projectId).to.equal(projectId3);
    expect(project3.metadata.title).to.equal(metadata3.title);

    // Verify all PDAs are unique
    const [projectPda1] = getProjectPda(owner, "project-1", program.programId);
    expect(projectPda1.toBase58()).to.not.equal(projectPda2.toBase58());
    expect(projectPda1.toBase58()).to.not.equal(projectPda3.toBase58());
    expect(projectPda2.toBase58()).to.not.equal(projectPda3.toBase58());
  });

  describe("Validation tests", () => {
    it("Should fail when title exceeds 100 characters", async () => {
      const projectId = "project-fail-title";
      const metadata = createMetadata(
        "A".repeat(101),
        "Valid description",
        "https://example.com/image.png"
      );

      const targetAmount = new anchor.BN(1_000_000_000);
      const endTime = new anchor.BN(getFutureTimestamp(24));

      try {
        await program.methods
          .initProject(projectId, metadata, targetAmount, endTime)
          .accounts({ owner })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail when description exceeds 500 characters", async () => {
      const projectId = "project-fail-desc";
      const metadata = createMetadata(
        "Valid Title",
        "B".repeat(501),
        "https://example.com/image.png"
      );

      const targetAmount = new anchor.BN(1_000_000_000);
      const endTime = new anchor.BN(getFutureTimestamp(24));

      try {
        await program.methods
          .initProject(projectId, metadata, targetAmount, endTime)
          .accounts({ owner })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail when imageUrl exceeds 200 characters", async () => {
      const projectId = "project-fail-url";
      const metadata = createMetadata(
        "Valid Title",
        "Valid description",
        "C".repeat(201)
      );

      const targetAmount = new anchor.BN(1_000_000_000);
      const endTime = new anchor.BN(getFutureTimestamp(24));

      try {
        await program.methods
          .initProject(projectId, metadata, targetAmount, endTime)
          .accounts({ owner })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail when project_id exceeds 32 characters", async () => {
      const tooLongProjectId = "project-".repeat(10);
      const metadata = createMetadata(
        "Valid Title",
        "Valid description",
        "https://example.com/image.png"
      );

      const targetAmount = new anchor.BN(1_000_000_000);
      const endTime = new anchor.BN(getFutureTimestamp(24));

      try {
        await program.methods
          .initProject(tooLongProjectId, metadata, targetAmount, endTime)
          .accounts({ owner })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });
});
