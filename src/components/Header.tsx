import logo from "../assets/logo.svg";

interface HeaderProps {
  account: string | null;
  onConnect: () => void;
}

const Header = ({ account, onConnect }: HeaderProps) => {
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
