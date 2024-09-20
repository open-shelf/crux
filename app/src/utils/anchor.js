import { web3 } from "@project-serum/anchor";

export const getProvider = (connection, wallet) => {
  const provider = new anchor.Provider(
    connection,
    wallet,
    anchor.Provider.defaultOptions()
  );
  return provider;
};

export const getProgram = (provider, idl, programId) => {
  const program = new anchor.Program(idl, programId, provider);
  return program;
};
