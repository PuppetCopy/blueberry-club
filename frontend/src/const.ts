

const contractEnv = process.env.DEPLOYED_CONTRACT
if (!contractEnv) {
  throw new Error('.env file is missing DEPLOYED_CONTRACT var')
}
export const DEPLOYED_CONTRACT = contractEnv

