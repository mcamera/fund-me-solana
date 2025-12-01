import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FundMe } from "../target/types/fund_me";

export function getProvider() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return provider;
}

export function getProgram(): Program<FundMe> {
  return anchor.workspace.FundMe as Program<FundMe>;
}

export function getProjectPda(
  owner: anchor.web3.PublicKey,
  projectId: string,
  programId: anchor.web3.PublicKey
): [anchor.web3.PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("project"), owner.toBuffer(), Buffer.from(projectId)],
    programId
  );
}

export function getDonationReceiptPda(
  user: anchor.web3.PublicKey,
  project: anchor.web3.PublicKey,
  timestampPda: anchor.BN,
  programId: anchor.web3.PublicKey
): [anchor.web3.PublicKey, number] {
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(BigInt(timestampPda.toString()));
  
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), user.toBuffer(), project.toBuffer(), timestampBuffer],
    programId
  );
}

export function createMetadata(
  title: string,
  description: string,
  imageUrl: string
) {
  return { title, description, imageUrl };
}

export function getFutureTimestamp(hoursFromNow: number): number {
  return Math.floor(Date.now() / 1000) + (hoursFromNow * 3600);
}
