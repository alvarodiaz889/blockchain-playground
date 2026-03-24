import { ethers } from "ethers";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
// ABIs
import Escrow from "./abis/Escrow.json";
import RealState from "./abis/RealState.json";
// Config
import config from "./config.json";

function App() {
  const [account, setAccount] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [escrowContract, setEscrowContract] = useState<any>(null);

  // Use useCallback so the function doesn't change on every render
  const loadAccount = useCallback(async () => {
    try {
      if (window.ethereum && provider) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setAccount(address);
        console.log("Connected:", address);
      }
    } catch (error) {
      console.error("User denied account access or error occurred:", error);
    }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      const fetchData = async () => {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);

        const network = await browserProvider.getNetwork();
        const chainIdStr = network.chainId.toString();
        const networkConfig = (config as Record<string, any>)[chainIdStr];

        console.log(config, chainIdStr, networkConfig);
        if (networkConfig) {
          const realStateAddr = networkConfig.realEstate.address;
          const scrowAddr = networkConfig.escrow.address;

          const realStateCtr = new ethers.Contract(
            realStateAddr, //contract deployed address
            RealState, //abi
            browserProvider,
          );

          const totalSupply = await realStateCtr.totalSupply();
          console.log("totalSupply ==>", totalSupply);

          const escrowCtr = new ethers.Contract(
            scrowAddr,
            RealState,
            browserProvider,
          );
          setEscrowContract(escrowCtr);
        }
      };

      fetchData();

      // Adding account change handler
      const handleAccountsChanged = (accounts: any) => {
        if (accounts.length > 0) {
          console.log("Account changed, reloading data...", accounts);
          loadAccount();
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      // CLEANUP: This prevents memory leaks and multiple listeners
      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
      };
    }
  }, []);

  return (
    <div className="flex flex-col w-full">
      <Header account={account} connectHandler={loadAccount} />
    </div>
  );
}

export default App;
