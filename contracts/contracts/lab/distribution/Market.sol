//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

import {Airdrop} from "./Airdrop.sol";
import {Public} from "../sales/mint/Public.sol";

/**
 * @title Shop
 * @author IrvingDevPro
 * @notice Let user buy items from a specifique sale with airdrop
 * money
 */
contract Market {
    using SafeTransferLib for ERC20;

    Airdrop public immutable airdrop;

    constructor(Airdrop _airdrop) {
        airdrop = _airdrop;
    }

    function mintNative(
        uint256[] memory tokensId,
        uint120 amount,
        Public sale
    ) external payable {
        uint256 claimed = airdrop.claim(
            msg.sender,
            address(this),
            address(0),
            tokensId
        );
        sale.publicMintFor{value: msg.value + claimed}(msg.sender, amount);
    }

    function mintToken(
        uint256[] memory tokensId,
        address token,
        uint256 bill,
        uint120 amount,
        Public sale
    ) external payable {
        uint256 claimed = airdrop.claim(
            msg.sender,
            address(this),
            token,
            tokensId
        );

        ERC20 token_ = ERC20(token);

        token_.safeApprove(address(sale), bill + claimed);
        token_.safeTransferFrom(msg.sender, address(this), bill);

        sale.publicMintFor(msg.sender, amount);
    }
}
