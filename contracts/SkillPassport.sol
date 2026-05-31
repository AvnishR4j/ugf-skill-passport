// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SkillPassport {
    string public constant name = "UGF Skill Passport";
    string public constant symbol = "UGFSP";

    address public immutable owner;
    uint256 public totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => uint8) public tokenBadgeId;
    mapping(address => mapping(uint8 => bool)) public hasClaimed;

    string[3] private _badgeNames = [
        "Wallet Basics",
        "Gasless First Step",
        "Onchain Explorer"
    ];

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event BadgeClaimed(address indexed user, uint8 indexed badgeId, uint256 indexed tokenId);

    error InvalidBadge();
    error AlreadyClaimed();
    error TokenDoesNotExist();
    error NotAuthorized();
    error ZeroAddress();

    constructor() {
        owner = msg.sender;
    }

    function claimBadge(uint8 badgeId) external returns (uint256 tokenId) {
        if (badgeId >= _badgeNames.length) revert InvalidBadge();
        if (hasClaimed[msg.sender][badgeId]) revert AlreadyClaimed();

        hasClaimed[msg.sender][badgeId] = true;
        tokenId = ++totalSupply;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        tokenBadgeId[tokenId] = badgeId;

        emit Transfer(address(0), msg.sender, tokenId);
        emit BadgeClaimed(msg.sender, badgeId, tokenId);
    }

    function badgeName(uint8 badgeId) external view returns (string memory) {
        if (badgeId >= _badgeNames.length) revert InvalidBadge();
        return _badgeNames[badgeId];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        string memory badge = _badgeNames[tokenBadgeId[tokenId]];

        return string.concat(
            "data:application/json,{\"name\":\"",
            badge,
            "\",\"description\":\"A UGF Skill Passport credential claimed on Base Sepolia with gas paid in TYI_MOCK_USD instead of ETH.\",\"attributes\":[{\"trait_type\":\"Gas Payment\",\"value\":\"TYI_MOCK_USD\"},{\"trait_type\":\"Network\",\"value\":\"Base Sepolia\"},{\"trait_type\":\"Framework\",\"value\":\"UGF\"}]}"
        );
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f; // ERC-721 metadata
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenDoesNotExist();
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !isApprovedForAll(tokenOwner, msg.sender)) {
            revert NotAuthorized();
        }

        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) public view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert ZeroAddress();

        address tokenOwner = ownerOf(tokenId);
        if (tokenOwner != from) revert NotAuthorized();
        if (
            msg.sender != tokenOwner &&
            msg.sender != _tokenApprovals[tokenId] &&
            !isApprovedForAll(tokenOwner, msg.sender)
        ) {
            revert NotAuthorized();
        }

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }
}
