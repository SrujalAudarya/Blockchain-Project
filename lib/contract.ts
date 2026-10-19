// Contract address — replace with deployed address when on-chain.
export const CONTRACT_ADDRESS = "0xLandChain0000000000000000000000000000000Registry";

// Registrar (government authority) address — in demo mode this is the first demo wallet.
export const REGISTRAR_ADDRESS = "0x7c2Aa8B49f3d6e1F0a5b4c3D2e1F0a5B4c3D2e1F";

// Minimal ABI for the LandRegistry contract.
export const LAND_REGISTRY_ABI = [
  "function registerLand(string _location, uint256 _areaSquareMeters, string _surveyNumber, string _documentIpfsHash, uint256 _marketValue, address _owner) external returns (uint256)",
  "function updateLandStatus(uint256 _id, bool _isForSale) external",
  "function transferLandOwnership(uint256 _id, address _newOwner, string _note) external",
  "function getLand(uint256 _id) external view returns (tuple(uint256 id, string location, uint256 areaSquareMeters, string surveyNumber, string documentIpfsHash, uint256 marketValue, address currentOwner, bool isForSale, uint256 registeredAt))",
  "function getHistory(uint256 _id) external view returns (tuple(uint256 landId, address from, address to, uint256 timestamp, string note)[])",
  "function getLandsByOwner(address _owner) external view returns (uint256[])",
  "function getActiveTransfers() external view returns (uint256)",
  "function landCount() external view returns (uint256)",
  "function registrar() external view returns (address)",
  "event LandRegistered(uint256 indexed id, address indexed owner, string location, uint256 timestamp)",
  "event LandStatusUpdated(uint256 indexed id, bool isForSale, uint256 timestamp)",
  "event OwnershipTransferred(uint256 indexed id, address indexed from, address indexed to, uint256 timestamp)",
] as const;
