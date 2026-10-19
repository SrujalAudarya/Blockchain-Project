// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LandRegistry
 * @dev Decentralized Land Registry Smart Contract for the LandChain DApp.
 *      Stores immutable land parcel records with GPS coordinates, ownership,
 *      and a full transfer history log.
 */
contract LandRegistry {
    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    struct Land {
        uint256 id;
        string location;
        uint256 areaSquareMeters;
        string surveyNumber;
        int256 latitude;       // stored as fixed-point (multiply by 10^6)
        int256 longitude;      // stored as fixed-point (multiply by 10^6)
        string documentIpfsHash;
        uint256 marketValue;
        address currentOwner;
        bool isForSale;
        uint256 registeredAt;
    }

    struct TransferRecord {
        uint256 landId;
        address from;
        address to;
        uint256 timestamp;
        string note;
    }

    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    address public registrar;
    uint256 public landCount;

    mapping(uint256 => Land) private lands;
    mapping(uint256 => TransferRecord[]) private transferHistory;
    mapping(address => uint256[]) private landsByOwner;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event LandRegistered(uint256 indexed id, address indexed owner, string location, uint256 timestamp);
    event LandStatusUpdated(uint256 indexed id, bool isForSale, uint256 timestamp);
    event OwnershipTransferred(uint256 indexed id, address indexed from, address indexed to, uint256 timestamp);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "Only the registrar can perform this action");
        _;
    }

    modifier onlyLandOwner(uint256 _id) {
        require(lands[_id].currentOwner == msg.sender, "Only the current owner can perform this action");
        _;
    }

    modifier landExists(uint256 _id) {
        require(_id > 0 && _id <= landCount, "Land record does not exist");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() {
        registrar = msg.sender;
    }

    // ──────────────────────────────────────────────
    //  Core Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Register a new land parcel on the ledger (registrar only).
     * @param _location           Human-readable location string.
     * @param _areaSquareMeters   Area in square meters.
     * @param _surveyNumber       Government survey number.
     * @param _latitude           GPS latitude  (multiply real value by 10^6).
     * @param _longitude          GPS longitude (multiply real value by 10^6).
     * @param _documentIpfsHash   IPFS hash of the supporting document.
     * @param _marketValue        Market value in wei/INR.
     * @param _owner              Wallet address of the initial owner.
     */
    function registerLand(
        string memory _location,
        uint256 _areaSquareMeters,
        string memory _surveyNumber,
        int256 _latitude,
        int256 _longitude,
        string memory _documentIpfsHash,
        uint256 _marketValue,
        address _owner
    ) external onlyRegistrar returns (uint256) {
        landCount++;
        uint256 newId = landCount;

        lands[newId] = Land({
            id: newId,
            location: _location,
            areaSquareMeters: _areaSquareMeters,
            surveyNumber: _surveyNumber,
            latitude: _latitude,
            longitude: _longitude,
            documentIpfsHash: _documentIpfsHash,
            marketValue: _marketValue,
            currentOwner: _owner,
            isForSale: false,
            registeredAt: block.timestamp
        });

        landsByOwner[_owner].push(newId);

        transferHistory[newId].push(TransferRecord({
            landId: newId,
            from: address(0),
            to: _owner,
            timestamp: block.timestamp,
            note: "Initial registration by Govt. Registrar"
        }));

        emit LandRegistered(newId, _owner, _location, block.timestamp);
        return newId;
    }

    /**
     * @notice Toggle the for-sale status of a land parcel (owner only).
     */
    function updateLandStatus(uint256 _id, bool _isForSale)
        external
        landExists(_id)
        onlyLandOwner(_id)
    {
        lands[_id].isForSale = _isForSale;
        emit LandStatusUpdated(_id, _isForSale, block.timestamp);
    }

    /**
     * @notice Transfer ownership of a land parcel to a new wallet (owner only).
     */
    function transferLandOwnership(
        uint256 _id,
        address _newOwner,
        string memory _note
    ) external landExists(_id) onlyLandOwner(_id) {
        require(_newOwner != address(0), "Cannot transfer to zero address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");

        address previousOwner = lands[_id].currentOwner;

        // Remove from previous owner's list
        _removeFromOwnerList(previousOwner, _id);
        lands[_id].currentOwner = _newOwner;
        lands[_id].isForSale = false;
        landsByOwner[_newOwner].push(_id);

        transferHistory[_id].push(TransferRecord({
            landId: _id,
            from: previousOwner,
            to: _newOwner,
            timestamp: block.timestamp,
            note: _note
        }));

        emit OwnershipTransferred(_id, previousOwner, _newOwner, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function getLand(uint256 _id) external view landExists(_id) returns (Land memory) {
        return lands[_id];
    }

    function getHistory(uint256 _id) external view landExists(_id) returns (TransferRecord[] memory) {
        return transferHistory[_id];
    }

    function getLandsByOwner(address _owner) external view returns (uint256[] memory) {
        return landsByOwner[_owner];
    }

    function getActiveTransfers() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= landCount; i++) {
            if (lands[i].isForSale) count++;
        }
        return count;
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    function _removeFromOwnerList(address _owner, uint256 _id) internal {
        uint256[] storage list = landsByOwner[_owner];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == _id) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }
}
