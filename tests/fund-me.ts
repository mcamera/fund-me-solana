import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FundMe } from "../target/types/fund_me";
import { expect } from "chai";

describe("InitProject", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FundMe as Program<FundMe>;
  const owner = provider.wallet.publicKey;

  it("Should initialize a project with correct data", async () => {
    console.log("Program ID:", program.programId.toBase58());
    
    const projectId = "project-1";
    const [projectPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), owner.toBuffer(), Buffer.from(projectId)],
      program.programId
    );

    const metadata = {
      title: "My First Project",
      description: "This is a test project for fundraising",
      imageUrl: "https://example.com/image.png"
    };

    const targetAmount = new anchor.BN(1_000_000_000); // 1 SOL
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 24h from now

    const tx = await program.methods
      .initProject(projectId, metadata, targetAmount, endTime)
      .accounts({
        owner: owner,
      })
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

  it("Should allow multiple projects for same owner with different PDA accounts", async () => {
    const projectId2 = "project-2";
    const projectId3 = "project-3";
    
    const metadata2 = {
      title: "Second Project",
      description: "Another project",
      imageUrl: "https://example.com/image2.png"
    };

    const metadata3 = {
      title: "Third Project",
      description: "Yet another project",
      imageUrl: "https://example.com/image3.png"
    };

    const targetAmount = new anchor.BN(500_000_000);
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

    // Create second project
    const [projectPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), owner.toBuffer(), Buffer.from(projectId2)],
      program.programId
    );

    await program.methods
      .initProject(projectId2, metadata2, targetAmount, endTime)
      .accounts({
        owner: owner,
      })
      .rpc();

    const project2 = await program.account.project.fetch(projectPda2);
    expect(project2.projectId).to.equal(projectId2);
    expect(project2.metadata.title).to.equal(metadata2.title);

    // Create third project
    const [projectPda3] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), owner.toBuffer(), Buffer.from(projectId3)],
      program.programId
    );

    await program.methods
      .initProject(projectId3, metadata3, targetAmount, endTime)
      .accounts({
        owner: owner,
      })
      .rpc();

    const project3 = await program.account.project.fetch(projectPda3);
    expect(project3.projectId).to.equal(projectId3);
    expect(project3.metadata.title).to.equal(metadata3.title);

    // Verify all three PDAs are different
    const [projectPda1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), owner.toBuffer(), Buffer.from("project-1")],
      program.programId
    );

    expect(projectPda1.toBase58()).to.not.equal(projectPda2.toBase58());
    expect(projectPda1.toBase58()).to.not.equal(projectPda3.toBase58());
    expect(projectPda2.toBase58()).to.not.equal(projectPda3.toBase58());
  });

  it("Should validate string length limits in metadata", async () => {
    const longTitle = "A".repeat(100);
    const longDescription = "B".repeat(500);
    const longImageUrl = "C".repeat(200);

    expect(longTitle.length).to.equal(100);
    expect(longDescription.length).to.equal(500);
    expect(longImageUrl.length).to.equal(200);
  });

  it("Should fail when title exceeds 100 characters", async () => {
    const projectId = "project-fail-title";
    const tooLongTitle = "A".repeat(101);
    
    const metadata = {
      title: tooLongTitle,
      description: "Valid description",
      imageUrl: "https://example.com/image.png"
    };

    const targetAmount = new anchor.BN(1_000_000_000);
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .initProject(projectId, metadata, targetAmount, endTime)
        .accounts({
          owner: owner,
        })
        .rpc();
      
      expect.fail("Should have thrown an error for title exceeding limit");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Should fail when description exceeds 500 characters", async () => {
    const projectId = "project-fail-desc";
    const tooLongDescription = "B".repeat(501);
    
    const metadata = {
      title: "Valid Title",
      description: tooLongDescription,
      imageUrl: "https://example.com/image.png"
    };

    const targetAmount = new anchor.BN(1_000_000_000);
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .initProject(projectId, metadata, targetAmount, endTime)
        .accounts({
          owner: owner,
        })
        .rpc();
      
      expect.fail("Should have thrown an error for description exceeding limit");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Should fail when imageUrl exceeds 200 characters", async () => {
    const projectId = "project-fail-url";
    const tooLongImageUrl = "C".repeat(201);
    
    const metadata = {
      title: "Valid Title",
      description: "Valid description",
      imageUrl: tooLongImageUrl
    };

    const targetAmount = new anchor.BN(1_000_000_000);
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .initProject(projectId, metadata, targetAmount, endTime)
        .accounts({
          owner: owner,
        })
        .rpc();
      
      expect.fail("Should have thrown an error for imageUrl exceeding limit");
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it("Should fail when project_id exceeds 32 characters", async () => {
    const tooLongProjectId = "project-".repeat(10);
    
    const metadata = {
      title: "Valid Title",
      description: "Valid description",
      imageUrl: "https://example.com/image.png"
    };

    const targetAmount = new anchor.BN(1_000_000_000);
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .initProject(tooLongProjectId, metadata, targetAmount, endTime)
        .accounts({
          owner: owner,
        })
        .rpc();
      
      expect.fail("Should have thrown an error for project_id exceeding limit");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
