import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config({ path: '../concordia-frontend/.env' });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      type: "http"
    },
    // Optional: add basesepolia for the Protocol Labs track
    basesepolia: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      type: "http"
    }
  }
};

export default config;
