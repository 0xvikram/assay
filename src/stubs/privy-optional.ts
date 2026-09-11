/**
 * Privy's React SDK imports helpers for features Assay's dashboard never
 * turns on — Solana transfers, smart-account wallets, the Abstract wallet and
 * its own x402 client — from packages it only lists as optional. The bundler
 * still has to resolve every import, and installing the real packages drags in
 * conflicting Solana versions. So those import paths resolve here (see
 * next.config.ts): the names exist, and calling one says plainly why it can't.
 */
const off = (name: string) => () => {
  throw new Error(`${name} is part of a Privy feature this app does not enable (see src/stubs/privy-optional.ts).`);
};

export const createAbstractClient = off("createAbstractClient");
export const getBatchTransactionObject = off("getBatchTransactionObject");
export const createSmartAccountClient = off("createSmartAccountClient");
export const createPimlicoClient = off("createPimlicoClient");
export const toNexusSmartAccount = off("toNexusSmartAccount");
export const toThirdwebSmartAccount = off("toThirdwebSmartAccount");
export const toLightSmartAccount = off("toLightSmartAccount");
export const toBiconomySmartAccount = off("toBiconomySmartAccount");
export const toKernelSmartAccount = off("toKernelSmartAccount");
export const toSafeSmartAccount = off("toSafeSmartAccount");
export const getAddMemoInstruction = off("getAddMemoInstruction");
export const getTransferSolInstruction = off("getTransferSolInstruction");
export const selectPaymentRequirements = off("selectPaymentRequirements");
export const createPaymentHeader = off("createPaymentHeader");
