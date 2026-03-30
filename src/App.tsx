import { ethers } from "ethers";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
// ABIs
import Escrow from "./abis/Escrow.json";
import RealEstate from "./abis/RealEstate.json";
// Config
import config from "./config.json";
import type {
  Property,
  PropertyMetadata,
  RoleType,
} from "./customTypes/Property";
import PropertyList from "./components/PropertyList";
import PurchaseModal from "./components/PurchaseModal";
import toast, { Toaster } from "react-hot-toast";

function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [escrowContract, setEscrowContract] = useState<ethers.Contract | null>(
    null,
  );
  // const [realEstateContract, setRealEstateContract] =
  //   useState<ethers.Contract | null>(null);

  const [account, setAccount] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyMetadata[]>([]);
  const [property, setProperty] = useState<PropertyMetadata | null>(null);
  const [role, setRole] = useState<RoleType | null>(null);
  const [hasApproved, setHasApproved] = useState(false);
  const [balance, setBalance] = useState(0);

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

      // setRealEstateContract(realStateCtr);
      setEscrowContract(escrowCtr);

      const totalSupply = await realStateCtr.totalSupply();
      console.log("totalSupply ==>", totalSupply);

      const balanceETH = await escrowCtr.getBalance();
      const balance = balanceETH;
      console.log("balance ==>", balance);
      setBalance(balance);

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

  const handleSelected = useCallback(
    async (prop: PropertyMetadata) => {
      console.log("Selected Property =>", prop);
      setProperty(prop);

      const propertyInfo = await escrowContract?.propertyInfo(prop.id);
      console.log("Selected Property Info =>", propertyInfo);

      const role =
        account === propertyInfo.buyer
          ? "buyer"
          : account === propertyInfo.seller
            ? "seller"
            : account === propertyInfo.lender
              ? "lender"
              : account === propertyInfo.inspector
                ? "inspector"
                : null;

      setRole(role);

      let hasApproved = false;
      if (role === "inspector") {
        const { inspectionPassed } = await escrowContract?.propertyInfo(
          prop.id,
        );
        hasApproved = inspectionPassed;
      } else {
        hasApproved = await escrowContract?.approvals(prop.id, account);
      }
      setHasApproved(hasApproved);
    },
    [escrowContract, account],
  );

  const handleBuying = async (toastId: string) => {
    if (!escrowContract || !provider || !account || !property) {
      console.error("Missing dependencies for transaction");
      return;
    }

    const signer = await provider.getSigner();
    const propertyInfo: Property = await escrowContract.propertyInfo(
      property.id,
    );
    const contractWithSigner = escrowContract.connect(signer);

    let transaction = await contractWithSigner.depositDownPayment(property.id, {
      value: propertyInfo.downPayment,
    });

    await transaction.wait();

    transaction = await contractWithSigner.approveSale(property.id);
    await transaction.wait();

    toast.success("Property bought successfully!", { id: toastId });
  };

  const handleInspecting = async (toastId: string) => {
    if (!escrowContract || !provider || !account || !property) {
      console.error("Missing dependencies for transaction");
      return;
    }

    const signer = await provider.getSigner();
    const contractWithSigner = escrowContract.connect(signer);

    const transaction = await contractWithSigner.updateInspectionStatus(
      property.id,
      true,
    );
    await transaction.wait();

    toast.success("Property inpection approved successfully!", { id: toastId });
  };

  const handleLending = async (toastId: string) => {
    if (!escrowContract || !provider || !account || !property) {
      toast.error("Operation can't be performed", { id: toastId });
      return;
    }

    const signer = await provider.getSigner();
    const contractWithSigner = escrowContract.connect(signer);

    const propertyInfo: Property = await escrowContract.propertyInfo(
      property.id,
    );
    const balance = propertyInfo.accountBalance;
    const downPayment = propertyInfo.downPayment;
    const price = propertyInfo.propertyPrice;

    if (balance >= downPayment) {
      let transaction = await contractWithSigner.approveSale(property.id);
      await transaction.wait();

      const lendingAmount = price - downPayment;
      console.log("amount to lend ==>", lendingAmount);
      transaction = await contractWithSigner.depositLendingAmount(
        propertyInfo.id,
        { value: lendingAmount.toString() },
      );

      toast.success("Property lent successfully!", { id: toastId });
    } else {
      toast.error("No enough funds in contract", { id: toastId });
    }
  };

  const handleSelling = async (toastId: string) => {
    if (!escrowContract || !provider || !account || !property) {
      console.error("Missing dependencies for transaction");
      return;
    }

    const signer = await provider.getSigner();
    const contractWithSigner = escrowContract.connect(signer);

    let transaction = await contractWithSigner.approveSale(property.id);
    await transaction.wait();

    transaction = await contractWithSigner.finalizeSale(property.id);
    await transaction.wait();

    toast.success("Property sold successfully!", { id: toastId });
  };

  const handleSubmit = async () => {
    console.log("On Action");
    if (hasApproved) toast.error("Action invalid!");

    const loadingToast = toast.loading(
      "Waiting for blockchain confirmation...",
    );

    try {
      if (role === "buyer") {
        await handleBuying(loadingToast);
      }

      if (role === "inspector") {
        await handleInspecting(loadingToast);
      }

      if (role === "lender") {
        await handleLending(loadingToast);
      }

      if (role === "seller") {
        await handleSelling(loadingToast);
      }

      setProperty(null);
    } catch (error) {
      toast.error("Transaction failed. Check your wallet.", {
        id: loadingToast,
      });
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Optional: You can set global styles here
          className: "font-sans text-sm",
        }}
      />
      <Header account={account} balance={balance} onConnect={handleConnect} />
      <PropertyList properties={properties} onSelected={handleSelected} />
      <PurchaseModal
        property={property}
        onClose={() => setProperty(null)}
        onSubmit={handleSubmit}
        role={role}
        hasApproved={hasApproved}
      />
    </div>
  );
}

export default App;
