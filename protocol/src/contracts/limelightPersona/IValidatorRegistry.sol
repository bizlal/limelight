// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IValidatorRegistry {
    event NewValidator(uint256 limelightId, address account);

    function isValidator(
        uint256 limelightId,
        address account
    ) external view returns (bool);

    function validatorScore(
        uint256 limelightId,
        address validator
    ) external view returns (uint256);

    function getPastValidatorScore(
        uint256 limelightId,
        address validator,
        uint256 timepoint
    ) external view returns (uint256);

    function validatorCount(uint256 limelightId) external view returns (uint256);

    function validatorAt(
        uint256 limelightId,
        uint256 index
    ) external view returns (address);

    function totalUptimeScore(
        uint256 limelightId
    ) external view returns (uint256);

    function addValidator(uint256 limelightId, address validator) external;
}