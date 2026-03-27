import { ethers } from "ethers";
import "./App.css";
import { useEffect, useState } from "react";
import Header from "./components/Header";
// ABIs
import Escrow from "./abis/Escrow.json";
import RealEstate from "./abis/RealEstate.json";
// Config
import config from "./config.json";
import type { PropertyMetadata, RoleType } from "./customTypes/Property";
import PropertyList from "./components/PropertyList";
import PurchaseModal from "./components/PurchaseModal";

function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [escrowContract, setEscrowContract] = useState<ethers.Contract | null>(
    null,
  );
  const [realEstateContract, setRealEstateContract] =
    useState<ethers.Contract | null>(null);

  const [account, setAccount] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyMetadata[]>([]);
  const [property, setProperty] = useState<PropertyMetadata | null>(null);
  const [role, setRole] = useState<RoleType | null>(null);

  // Initialize the provider once on mount
  useEffect(() => {
    if (window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
    } else {
      console.log("Metamask is not installed!");
    }
  }, []);

  const loadData = async () => {
    if (!provider) return;

    const network = await provider.getNetwork();
    const chainIdStr = network.chainId.toString();
    const networkConfig = (config as Record<string, any>)[chainIdStr];

    if (networkConfig) {
      // Re-use the same provider instance here
      const realStateCtr = new ethers.Contract(
        networkConfig.realEstate.address,
        RealEstate,
        provider,
      );

      const escrowCtr = new ethers.Contract(
        networkConfig.escrow.address,
        Escrow,
        provider,
      );

      setRealEstateContract(realStateCtr);
      setEscrowContract(escrowCtr);

      const totalSupply = await realStateCtr.totalSupply();
      console.log("totalSupply ==>", totalSupply);

      const properties: PropertyMetadata[] = [];
      for (let nftId = 0; nftId < totalSupply; nftId++) {
        const uri = await realStateCtr.tokenURI(nftId);
        const response = await fetch(uri);
        const metadata = await response.json();
        properties.push(metadata);
      }

      setProperties(properties);
    }
  };

  useEffect(() => {
    if (!provider) return;

    // Load the initial contract data
    loadData();

    // Define the account change handler
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        // Re-run the account loader to update the UI
        const signer = await provider.getSigner();
        setAccount(await signer.getAddress());
      } else {
        setAccount(null);
      }
    };

    // Define the chain change handler (Crucial for Hardhat testing)
    const handleChainChanged = () => {
      window.location.reload();
    };

    // Attach listeners
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // CLEANUP: Remove them if the component unmounts or provider changes
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider]);

  useEffect(() => {
    const updateRole = async () => {
      setRole(null);

      if (escrowContract && account && property) {
        const {
          buyer: _buyer,
          seller: _seller,
          lender: _lender,
          inspector: _inspector,
        } = await escrowContract.propertyInfo(property.id);

        const roleType =
          account === _buyer
            ? "buyer"
            : account === _seller
              ? "seller"
              : account === _lender
                ? "lender"
                : account === _inspector
                  ? "inspector"
                  : null;

        setRole(roleType);
      }
    };
    updateRole();
  }, [escrowContract, account, property]);

  // Use the stored provider to get the account when the button is clicked
  const handleConnect = async () => {
    if (!provider) return;

    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleSelected = (prop: PropertyMetadata) => {
    console.log("Selected Property =>", prop);
    setProperty(prop);
  };

  const handleSubmit = () => {};

  return (
    <div className="flex flex-col w-full">
      <Header account={account} onConnect={handleConnect} />
      <PropertyList properties={properties} onSelected={handleSelected} />
      <PurchaseModal
        property={property}
        onClose={() => setProperty(null)}
        onSubmit={handleSubmit}
        role={role}
      />
    </div>
  );
}

export default App;
