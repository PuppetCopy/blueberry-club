// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGBCLabsItems {
    function mint(address to, uint id, uint amount) external;
}

contract GBCLabsSaleExemple is Ownable, ERC721Enumerable {
    uint private _minted = 0;

    uint TOKEN_ID = 746;

    uint256 public max = 10000;
    uint256 public maxMintPerTx = 20;

    bool public publicSaleStarted = false;
    bool public wlMintStarted = false;

    uint256 public cost = 0.03 ether;

    address public wlSigner;

    mapping(address => bool) blacklist;

    IGBCLabsItems private ITEMS;

    constructor(string memory name, string memory symbol, address _items) ERC721(name, symbol) {
        wlSigner = address(this);
        ITEMS = IGBCLabsItems(_items);
    }
    
    function adminMint(uint256 _mintAmount, address _to) external onlyOwner {
        require(_minted + _mintAmount <= max, "Transaction exceeds max mint amount");
        ITEMS.mint(_to, TOKEN_ID, _mintAmount);
        _minted += _mintAmount;
    }

    function claim(bytes memory sig) external {
        require(wlMintStarted == true, "WL Mint not started yet");
        require(checkSignature(sig, _msgSender()) == true, "Signature not valid");
        require(blacklist[_msgSender()] == false, "This address was already used");
        require(_minted + 1 <= max, "Transaction exceeds max mint amount");
        ITEMS.mint(msg.sender, TOKEN_ID, 1);
        _minted += 1;
        blacklist[_msgSender()] = true;
    }

    function whitelistMint(uint256 _mintAmount, bytes memory sig) external payable {
        require(publicSaleStarted == true, "Public Sale not started yet");
        require(wlMintStarted == true, "WL Mint not started yet");
        require(_mintAmount <= maxMintPerTx, "Exceeds max amount per transaction allowed");
        require(checkSignature(sig, _msgSender()) == true, "Signature is not valid");
        require(blacklist[_msgSender()] == false, "This whitelisted address was already used");
        require(msg.value >= cost * (_mintAmount - 1), "Not enough ether provided");
        require(_minted + _mintAmount <= max, "Transaction exceeds max mint amount");
        ITEMS.mint(msg.sender, TOKEN_ID, _mintAmount);
        _minted += _mintAmount;
        blacklist[_msgSender()] = true;
    }

    function mint(uint256 _mintAmount) external payable {
        require(publicSaleStarted == true, "Public Sale not started yet");
        require(_mintAmount <= maxMintPerTx, "Exceeds max amount per transaction allowed");
        require(msg.value >= cost * _mintAmount, "Not enough ether provided");
        require(_minted + _mintAmount <= max, "Transaction exceeds max mint amount");
        ITEMS.mint(msg.sender, TOKEN_ID, _mintAmount);
        _minted += _mintAmount;
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        if(token == address(0)) { 
            payable(_msgSender()).transfer(amount);
        } else {
            IERC20(token).transfer(_msgSender(), amount);
        }
    }

    function setWLSigner(address signer) external onlyOwner {
        require(signer != 0x0000000000000000000000000000000000000000, "Can't set WL signer as 0x00 address");
        wlSigner = signer;
    }

    function setCost(uint256 price) external onlyOwner {
        cost = price;
    }
    
    function startPublicSale() external onlyOwner {
        publicSaleStarted = true;
    }
    function startWLMint() external onlyOwner {
        wlMintStarted = true;
    }

    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }
    function isBlacklisted(address _address) external view returns (bool) {
        return blacklist[_address];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function checkSignature(bytes memory sig, address sender) private view returns (bool){
        bytes32 hash = keccak256(abi.encodePacked(address(this), sender));
        address signer = recover(hash, sig);
        return(wlSigner == signer);
    }
    
    function recover(bytes32 hash, bytes memory sig) private pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        //Check the signature length
        if (sig.length != 65) {
            return (address(0));
         }

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }
    
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, hash));
    
        // If the version is correct return the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            return ecrecover(prefixedHash, v, r, s);
        }
    }
}