// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import {FERC20} from "../../../tokens/FERC20.sol";

contract MockERC20 is FERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) FERC20(_name, _symbol, _decimals) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}
