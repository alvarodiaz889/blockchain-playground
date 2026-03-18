import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Change 'paris' to 'cancun' to allow the mcopy opcode
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      // Explicitly tell the local Hardhat node to support Cancun features
      hardfork: "cancun",
    },
  },
};

export default config;
