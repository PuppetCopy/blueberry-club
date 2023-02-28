// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC1155} from "@rari-capital/solmate/src/tokens/ERC1155.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {Auth, Authority} from "@rari-capital/solmate/src/auth/Auth.sol";
import {ReentrancyGuard} from "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import {RrpRequesterV0} from "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

abstract contract RandomUintReceiver {
    function onERC721Received(
        bytes32,
        uint256,
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return RandomUintReceiver.onRandomUintReceived.selector;
    }
}

struct ContractCall {
    address contractAddress;
    function(bytes memory) external callbackDataParm;
}

contract RandomUintProvider is Auth, RrpRequesterV0 {
    event RequestedUint256(bytes32 indexed requestId);
    event ReceivedUint256(bytes32 indexed requestId, uint256 response);
    event CallErrorUint256(bytes32 indexed requestId, uint256 response);

    address public airnode;
    bytes32 public endpointIdUint256;
    bytes32 public endpointIdUint256Array;
    address public sponsorWallet;

    // mapping(bytes32 => ContractCall) public contractCallbackList;
    mapping(bytes32 => function(bytes memory) external) public contractCallbackList;

    constructor(Authority _authority, address _airnodeRrp) Auth(address(0), _authority) RrpRequesterV0(_airnodeRrp) {}

    /// Sets parameters used in requesting QRNG services
    function configAirnodeQrng( address _airnode, bytes32 _endpointIdUint256, address _sponsorWallet) external requiresAuth {
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        sponsorWallet = _sponsorWallet;
    }


    /// Requests a `uint256`
    // function requestRandomUint(address _callbackContractAddress, bytes calldata data) public returns (bytes32) {
    function requestRandomUint(function(bytes memory) external _callbackContractAddress) public returns (bytes32) {
        require(!isValidCallbackContract(_callbackContractAddress), "Request invokee is not a contract");

        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256,
            address(this), 
            sponsorWallet,
            address(this),
            this.fulfillRandomUint.selector,
            ""
        );
        contractCallbackList[requestId] = _callbackContractAddress;
        emit RequestedUint256(requestId);

        return requestId;
    }

    /// Called by the Airnode through the AirnodeRrp contract to
    function fulfillRandomUint(bytes32 requestId, bytes calldata data) external requiresAuth {
        // require(
        //     expectingRequestWithIdToBeFulfilled[requestId],
        //     "Request ID not known"
        // );
        // expectingRequestWithIdToBeFulfilled[requestId] = false;
        // uint256 qrngUint256 = abi.decode(data, (uint256));
        // // Do what you want with `qrngUint256` here...
        // emit ReceivedUint256(requestId, qrngUint256);


        require(contractCallbackList[requestId] != address(0), "Callback contract not set for request ID");
        address callbackContract = contractCallbackList[requestId];
        delete contractCallbackList[requestId];

        uint256 qrngUint256 = abi.decode(data, (uint256));

        // try IOrderCallbackReceiver(callbackContract).afterOrderFrozen{ gas: order.callbackGasLimit() }(key, order) {
        // } catch (bytes memory reasonBytes) {
        //     (string memory reason, /* bool hasRevertMessage */) = ErrorUtils.getRevertMessage(reasonBytes);
        //     emit CallErrorUint256(requestId, qrngUint256);
        // }


        // Do what you want with `qrngUint256` here...

        // Call back to the callback contract
        // (bool success,) = callbackContract.call(abi.encodeWithSignature("fulfillRandomUintCallback(bytes32,uint256)", requestId, qrngUint256));
        // require(success, "Callback failed");


        emit ReceivedUint256(requestId, qrngUint256);
    }

    function isValidCallbackContract(address callbackContract) internal view returns (bool) {
        return callbackContract.isContract() || callbackContract != address(0);
    }


}