// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IValidatorRegistry.sol";

abstract contract ValidatorRegistry is IValidatorRegistry, Initializable {
    mapping(uint256 limelightId => mapping(address account => bool isValidator))
        private _validatorsMap;
    mapping(address account => mapping(uint256 limelightId => uint256 score))
        private _baseValidatorScore;
    mapping(uint256 limelightId => address[] validators) private _validators;

    function(uint256, address) view returns (uint256) private _getScoreOf;
    function(uint256) view returns (uint256) private _getMaxScore;
    function(uint256, address, uint256) view returns (uint256)
        private _getPastScore;

    function __ValidatorRegistry_init(
        function(uint256, address) view returns (uint256) getScoreOf_,
        function(uint256) view returns (uint256) getMaxScore_,
        function(uint256, address, uint256) view returns (uint256) getPastScore_
    ) internal onlyInitializing {
        _getScoreOf = getScoreOf_;
        _getMaxScore = getMaxScore_;
        _getPastScore = getPastScore_;
    }

    function isValidator(
        uint256 limelightId,
        address account
    ) public view returns (bool) {
        return _validatorsMap[limelightId][account];
    }

    function _addValidator(uint256 limelightId, address validator) internal {
        _validatorsMap[limelightId][validator] = true;
        _validators[limelightId].push(validator);
        emit NewValidator(limelightId, validator);
    }

    function _initValidatorScore(
        uint256 limelightId,
        address validator
    ) internal {
        _baseValidatorScore[validator][limelightId] = _getMaxScore(limelightId);
    }

    function validatorScore(
        uint256 limelightId,
        address validator
    ) public view virtual returns (uint256) {
        return
            _baseValidatorScore[validator][limelightId] +
            _getScoreOf(limelightId, validator);
    }

    function getPastValidatorScore(
        uint256 limelightId,
        address validator,
        uint256 timepoint
    ) public view virtual returns (uint256) {
        return
            _baseValidatorScore[validator][limelightId] +
            _getPastScore(limelightId, validator, timepoint);
    }

    function validatorCount(uint256 limelightId) public view returns (uint256) {
        return _validators[limelightId].length;
    }

    function validatorAt(
        uint256 limelightId,
        uint256 index
    ) public view returns (address) {
        return _validators[limelightId][index];
    }

    function totalUptimeScore(uint256 limelightId) public view returns (uint256) {
        uint256 totalScore = 0;
        for (uint256 i = 0; i < validatorCount(limelightId); i++) {
            totalScore += validatorScore(limelightId, validatorAt(limelightId, i));
        }
        return totalScore;
    }

    function _migrateScoreFunctions(
        function(uint256, address) view returns (uint256) getScoreOf_,
        function(uint256) view returns (uint256) getMaxScore_,
        function(uint256, address, uint256) view returns (uint256) getPastScore_
    ) internal {
        _getScoreOf = getScoreOf_;
        _getMaxScore = getMaxScore_;
        _getPastScore = getPastScore_;
    }
}