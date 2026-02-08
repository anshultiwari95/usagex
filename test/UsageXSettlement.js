const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("UsageXSettlement", function () {
  const INITIAL_BALANCE = 1_000_000n * 10n ** 6n; // 1M USDC (6 decimals)
  const DEPOSIT_AMOUNT = 100n * 10n ** 6n; // 100 USDC

  async function deployFixture() {
    const [owner, treasury, operator, user, other] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    await token.waitForDeployment();
    await token.mint(user.address, INITIAL_BALANCE);

    const UsageXSettlement = await ethers.getContractFactory("UsageXSettlement");
    const settlement = await UsageXSettlement.deploy(
      await token.getAddress(),
      treasury.address,
      operator.address
    );
    await settlement.waitForDeployment();

    return {
      settlement,
      token,
      owner,
      treasury,
      operator,
      user,
      other,
    };
  }

  async function signSettlement(userAddress, usedAmount, nonce, contractAddress, chainId, signer) {
    const u = ethers.getAddress(userAddress);
    const c = ethers.getAddress(contractAddress);
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256"],
      [u, usedAmount, nonce, c, chainId]
    );
    return signer.signMessage(ethers.getBytes(messageHash));
  }

  describe("Deployment", function () {
    it("Should set token, treasury, operator, owner", async function () {
      const { settlement, token, treasury, operator, owner } = await loadFixture(deployFixture);
      expect(await settlement.token()).to.equal(await token.getAddress());
      expect(await settlement.treasury()).to.equal(treasury.address);
      expect(await settlement.operator()).to.equal(operator.address);
      expect(await settlement.owner()).to.equal(owner.address);
    });

    it("Should revert if any constructor arg is zero", async function () {
      const [, treasury, operator] = await ethers.getSigners();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token = await MockERC20.deploy();
      await token.waitForDeployment();
      const UsageXSettlement = await ethers.getContractFactory("UsageXSettlement");
      await expect(
        UsageXSettlement.deploy(ethers.ZeroAddress, treasury.address, operator.address)
      ).to.be.revertedWithCustomError(UsageXSettlement, "ZeroAddress");
      await expect(
        UsageXSettlement.deploy(await token.getAddress(), ethers.ZeroAddress, operator.address)
      ).to.be.revertedWithCustomError(UsageXSettlement, "ZeroAddress");
      await expect(
        UsageXSettlement.deploy(await token.getAddress(), treasury.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(UsageXSettlement, "ZeroAddress");
    });
  });

  describe("Deposit", function () {
    it("Should increase user balance and emit Deposit", async function () {
      const { settlement, token, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await expect(settlement.connect(user).deposit(DEPOSIT_AMOUNT))
        .to.emit(settlement, "Deposit")
        .withArgs(user.address, DEPOSIT_AMOUNT);
      expect(await settlement.getBalance(user.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should revert on zero amount", async function () {
      const { settlement, user } = await loadFixture(deployFixture);
      await expect(settlement.connect(user).deposit(0)).to.be.revertedWithCustomError(
        settlement,
        "ZeroAmount"
      );
    });

    it("Should allow multiple deposits (add to balance)", async function () {
      const { settlement, token, user } = await loadFixture(deployFixture);
      const half = DEPOSIT_AMOUNT / 2n;
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(half);
      await settlement.connect(user).deposit(half);
      expect(await settlement.getBalance(user.address)).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("Settle", function () {
    it("Should match JS and contract message hashes (signing sanity)", async function () {
      const { settlement, operator, user } = await loadFixture(deployFixture);
      const usedAmount = 30n * 10n ** 6n;
      const nonce = 0n;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const contractAddr = await settlement.getAddress();
      const u = ethers.getAddress(user.address);
      const c = ethers.getAddress(contractAddr);
      const jsMessageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "address", "uint256"],
        [u, usedAmount, nonce, c, chainId]
      );
      const [contractMessageHash, contractEthSignedHash] =
        await settlement.getSettlementHashes(user.address, usedAmount, nonce);
      expect(jsMessageHash).to.equal(contractMessageHash);
      const jsEthSignedHash = ethers.hashMessage(ethers.getBytes(jsMessageHash));
      expect(jsEthSignedHash).to.equal(contractEthSignedHash);
      const sig = await signSettlement(u, usedAmount, nonce, c, chainId, operator);
      const recovered = ethers.recoverAddress(jsEthSignedHash, sig);
      expect(recovered).to.equal(ethers.getAddress(operator.address));
      const contractRecovered = await settlement.recoverSettlementSigner(contractEthSignedHash, sig);
      expect(contractRecovered).to.equal(ethers.getAddress(operator.address));
    });

    it("Should pay treasury used amount and refund remainder", async function () {
      const { settlement, token, treasury, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const usedAmount = 30n * 10n ** 6n;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const nonce = 0n;
      const sig = await signSettlement(
        user.address,
        usedAmount,
        nonce,
        await settlement.getAddress(),
        chainId,
        operator
      );

      const treasuryBefore = await token.balanceOf(treasury.address);
      const userBefore = await token.balanceOf(user.address);

      await expect(settlement.connect(user).settle(usedAmount, nonce, sig))
        .to.emit(settlement, "Settled")
        .withArgs(user.address, usedAmount, DEPOSIT_AMOUNT - usedAmount);

      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + usedAmount);
      expect(await token.balanceOf(user.address)).to.equal(userBefore + (DEPOSIT_AMOUNT - usedAmount));
      expect(await settlement.getBalance(user.address)).to.equal(0n);
      expect(await settlement.getNonce(user.address)).to.equal(1n);
    });

    it("Should allow full refund when usedAmount is 0", async function () {
      const { settlement, token, treasury, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        0n,
        0n,
        await settlement.getAddress(),
        chainId,
        operator
      );

      await settlement.connect(user).settle(0n, 0n, sig);
      expect(await token.balanceOf(user.address)).to.equal(INITIAL_BALANCE);
      expect(await token.balanceOf(treasury.address)).to.equal(0n);
    });

    it("Should allow full payment when usedAmount equals balance", async function () {
      const { settlement, token, treasury, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        DEPOSIT_AMOUNT,
        0n,
        await settlement.getAddress(),
        chainId,
        operator
      );

      await settlement.connect(user).settle(DEPOSIT_AMOUNT, 0n, sig);
      expect(await token.balanceOf(treasury.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await settlement.getBalance(user.address)).to.equal(0n);
    });

    it("Should revert on insufficient balance", async function () {
      const { settlement, operator, user } = await loadFixture(deployFixture);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        1n,
        0n,
        await settlement.getAddress(),
        chainId,
        operator
      );
      await expect(
        settlement.connect(user).settle(1n, 0n, sig)
      ).to.be.revertedWithCustomError(settlement, "InsufficientBalance");
    });

    it("Should revert when usedAmount exceeds balance", async function () {
      const { settlement, token, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        DEPOSIT_AMOUNT + 1n,
        0n,
        await settlement.getAddress(),
        chainId,
        operator
      );
      await expect(
        settlement.connect(user).settle(DEPOSIT_AMOUNT + 1n, 0n, sig)
      ).to.be.revertedWithCustomError(settlement, "UsedExceedsBalance");
    });

    it("Should revert on wrong nonce", async function () {
      const { settlement, token, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        0n,
        1n, // wrong nonce
        await settlement.getAddress(),
        chainId,
        operator
      );
      await expect(
        settlement.connect(user).settle(0n, 1n, sig)
      ).to.be.revertedWithCustomError(settlement, "InvalidSignature");
    });

    it("Should revert on signature from non-operator", async function () {
      const { settlement, token, user, other } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig = await signSettlement(
        user.address,
        0n,
        0n,
        await settlement.getAddress(),
        chainId,
        other // not operator
      );
      await expect(
        settlement.connect(user).settle(0n, 0n, sig)
      ).to.be.revertedWithCustomError(settlement, "InvalidSignature");
    });

    it("Should reject replay (nonce increments)", async function () {
      const { settlement, token, operator, user } = await loadFixture(deployFixture);
      await token.connect(user).approve(await settlement.getAddress(), DEPOSIT_AMOUNT * 3n);
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const sig0 = await signSettlement(
        user.address,
        0n,
        0n,
        await settlement.getAddress(),
        chainId,
        operator
      );
      await settlement.connect(user).settle(0n, 0n, sig0);

      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);
      const sig1 = await signSettlement(
        user.address,
        0n,
        1n,
        await settlement.getAddress(),
        chainId,
        operator
      );
      await settlement.connect(user).settle(0n, 1n, sig1);

      // Reusing sig0 should fail (nonce 0 already used)
      await settlement.connect(user).deposit(DEPOSIT_AMOUNT);
      await expect(
        settlement.connect(user).settle(0n, 0n, sig0)
      ).to.be.revertedWithCustomError(settlement, "InvalidSignature");
    });
  });

  describe("Admin", function () {
    it("Should allow owner to set treasury", async function () {
      const { settlement, owner, other } = await loadFixture(deployFixture);
      await expect(settlement.connect(owner).setTreasury(other.address))
        .to.emit(settlement, "TreasuryUpdated");
      expect(await settlement.treasury()).to.equal(other.address);
    });

    it("Should allow owner to set operator", async function () {
      const { settlement, owner, other } = await loadFixture(deployFixture);
      await expect(settlement.connect(owner).setOperator(other.address))
        .to.emit(settlement, "OperatorUpdated");
      expect(await settlement.operator()).to.equal(other.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      const { settlement, owner, other } = await loadFixture(deployFixture);
      await settlement.connect(owner).transferOwnership(other.address);
      expect(await settlement.owner()).to.equal(other.address);
    });

    it("Should revert admin calls from non-owner", async function () {
      const { settlement, treasury, operator, other } = await loadFixture(deployFixture);
      await expect(settlement.connect(other).setTreasury(other.address))
        .to.be.revertedWithCustomError(settlement, "NotOwner");
      await expect(settlement.connect(other).setOperator(other.address))
        .to.be.revertedWithCustomError(settlement, "NotOwner");
      await expect(settlement.connect(other).transferOwnership(other.address))
        .to.be.revertedWithCustomError(settlement, "NotOwner");
    });

    it("Should revert admin calls with zero address", async function () {
      const { settlement, owner } = await loadFixture(deployFixture);
      await expect(settlement.connect(owner).setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(settlement, "ZeroAddress");
      await expect(settlement.connect(owner).setOperator(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(settlement, "ZeroAddress");
      await expect(settlement.connect(owner).transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(settlement, "ZeroAddress");
    });
  });
});
