import { ethers } from "ethers";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import logo from "./assets/logo.svg";

function App() {
  const [account, setAccount] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);

  // Use useCallback so the function doesn't change on every render
  const loadData = useCallback(async () => {
    try {
      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();

        setProvider(browserProvider);
        setAccount(address);
        console.log("Connected:", address);
      } else {
        const defaultProvider = ethers.getDefaultProvider();
        setProvider(defaultProvider);
        console.log("MetaMask not found, using read-only.");
      }
    } catch (error) {
      console.error("User denied account access or error occurred:", error);
    }
  }, []);

  useEffect(() => {
    // 1. Load initial data
    loadData();

    // 2. Setup the listener
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: any) => {
        if (accounts.length > 0) {
          console.log("Account changed, reloading data...", accounts);
          loadData(); // Re-run the main loader to get the new signer
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      // 3. CLEANUP: This prevents memory leaks and multiple listeners
      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
      };
    }
  }, [loadData]);

  const connectHandler = async () => {
    try {
      if (provider) {
        // In v6, ethers.providers.Web3Provider becomes ethers.BrowserProvider
        // const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        const [currentAccount] = accounts;
        console.log(accounts);

        currentAccount && setAccount(currentAccount);
      } else {
        console.log("Please install any provider!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex inline-flex justify-between p-6">
        <nav>
          <ul className="flex inline-flex gap-3">
            <li>
              <a href="#">Buy</a>
            </li>
            <li>
              <a href="#">Rent</a>
            </li>
            <li>
              <a href="#">Sell</a>
            </li>
          </ul>
        </nav>
        <div className="flex">
          <img src={logo} width="80" height="60" alt="logo"></img>
          <label className="text-violet-600 text-3xl font-[700]">Millow</label>
        </div>
        {account ? (
          <button
            className="bg-violet-600 text-white rounded-lg p-2"
            type="button"
          >{`${account.slice(0, 6)}...${account.slice(38, 42)}`}</button>
        ) : (
          <button
            className="bg-violet-600 text-white rounded-lg p-2"
            type="button"
            onClick={connectHandler}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
