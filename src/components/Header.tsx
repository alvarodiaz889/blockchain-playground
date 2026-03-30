import { ethers } from "ethers";
import logo from "../assets/logo.svg";

interface HeaderProps {
  account: string | null;
  balance: number | null;
  onConnect: () => void;
}

const Header = ({ account, balance, onConnect }: HeaderProps) => {
  const getBalance = () => {
    const ethValue = balance ? ethers.formatUnits(balance, "ether") : "0";
    return parseFloat(ethValue).toFixed(3) + " ETH";
  };

  return (
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
      <label className="text-violet-600 font-[400]">
        Balance: {getBalance()}
      </label>
      {account ? (
        <button
          className="bg-violet-600 text-white rounded-lg p-2"
          type="button"
        >{`${account.slice(0, 6)}...${account.slice(38, 42)}`}</button>
      ) : (
        <button
          className="bg-violet-600 text-white rounded-lg p-2"
          type="button"
          onClick={onConnect}
        >
          Connect
        </button>
      )}
    </div>
  );
};

export default Header;
