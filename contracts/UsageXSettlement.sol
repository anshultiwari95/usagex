// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @notice Minimal ERC20 interface for USDC (transfer / transferFrom may not return bool on some chains).
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title UsageXSettlement
/// @notice Holds user USDC deposits, enforces credit limits, and handles trustless settlement & refunds.
/// @dev Users deposit USDC to open a session; off-chain usage is tracked; settlement pays app and refunds remainder.
contract UsageXSettlement {
    IERC20 public immutable token;
    address public treasury;
    address public operator;
    address public owner;

    /// @notice Per-user deposit balance (credit limit = this amount).
    mapping(address => uint256) public balanceOf;
    /// @notice Per-user nonce for settlement signatures (replay protection).
    mapping(address => uint256) public nonceOf;

    event Deposit(address indexed user, uint256 amount);
    event Settled(address indexed user, uint256 usedAmount, uint256 refundAmount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error InvalidSignature();
    error UsedExceedsBalance();
    error NotOwner();

    constructor(address _token, address _treasury, address _operator) {
        if (_token == address(0) || _treasury == address(0) || _operator == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        treasury = _treasury;
        operator = _operator;
        owner = msg.sender;
    }

    /// @notice Deposit USDC to open a usage session. Caller must have approved this contract.
    /// @param amount Amount of USDC to deposit (must be > 0).
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /// @notice Settle usage: pay `usedAmount` to treasury, refund the rest to the user.
    /// @param usedAmount Amount consumed (must be <= caller's balance).
    /// @param nonce Must equal current nonce for caller (incremented after settle).
    /// @param signature Operator's signature of keccak256(abi.encodePacked(user, usedAmount, nonce, address(this), block.chainid)).
    function settle(uint256 usedAmount, uint256 nonce, bytes calldata signature) external {
        uint256 bal = balanceOf[msg.sender];
        if (bal == 0) revert InsufficientBalance();
        if (usedAmount > bal) revert UsedExceedsBalance();
        if (nonce != nonceOf[msg.sender]) revert InvalidSignature();

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, usedAmount, nonce, address(this), block.chainid)
        );
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = _recoverSigner(ethSignedHash, signature);
        if (signer != operator) revert InvalidSignature();

        nonceOf[msg.sender] += 1;
        balanceOf[msg.sender] = 0;

        uint256 refundAmount = bal - usedAmount;
        if (usedAmount > 0) _safeTransfer(treasury, usedAmount);
        if (refundAmount > 0) _safeTransfer(msg.sender, refundAmount);

        emit Settled(msg.sender, usedAmount, refundAmount);
    }

    /// @notice Get current deposit balance for a user.
    function getBalance(address user) external view returns (uint256) {
        return balanceOf[user];
    }

    /// @notice Get current nonce for a user (for building settlement signatures).
    function getNonce(address user) external view returns (uint256) {
        return nonceOf[user];
    }

    /// @notice Returns the message hash and ethSignedHash used for settlement (for tests / off-chain signing).
    function getSettlementHashes(address user, uint256 usedAmount, uint256 nonce)
        external
        view
        returns (bytes32 messageHash, bytes32 ethSignedHash)
    {
        messageHash = keccak256(
            abi.encodePacked(user, usedAmount, nonce, address(this), block.chainid)
        );
        ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    /// @notice Returns the address recovered from ethSignedHash and signature (for tests).
    function recoverSettlementSigner(bytes32 ethSignedHash, bytes calldata signature)
        external
        pure
        returns (address)
    {
        return _recoverSigner(ethSignedHash, signature);
    }

    // ---------- Admin ----------

    function setTreasury(address newTreasury) external {
        if (msg.sender != owner) revert NotOwner();
        if (newTreasury == address(0)) revert ZeroAddress();
        address prev = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(prev, newTreasury);
    }

    function setOperator(address newOperator) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOperator == address(0)) revert ZeroAddress();
        address prev = operator;
        operator = newOperator;
        emit OperatorUpdated(prev, newOperator);
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        address prev = owner;
        owner = newOwner;
        emit OwnershipTransferred(prev, newOwner);
    }

    // ---------- Internal ----------

    function _recoverSigner(bytes32 ethSignedHash, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "bad sig length");
        bytes memory sig = signature;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad v");
        return ecrecover(ethSignedHash, v, r, s);
    }

    function _safeTransfer(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transfer failed");
    }

    function _safeTransferFrom(address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transferFrom failed");
    }
}
