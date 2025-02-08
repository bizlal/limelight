// contracts/Token.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {FERC20} from "solmate/tokens/FERC20.sol";

contract Token is FERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) FERC20(name, symbol, 18) {
        _mint(msg.sender, initialSupply);
    }
}
