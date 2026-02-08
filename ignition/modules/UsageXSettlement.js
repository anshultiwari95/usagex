// Deploy UsageXSettlement. For local: deploys MockERC20 + Settlement.
// For testnet: pass tokenAddress (USDC), treasury, operator via params or use ignition config.

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("UsageXSettlementModule", (m) => {
  const deployer = m.getAccount(0);
  const treasury = m.getParameter("treasury", deployer);
  const operator = m.getParameter("operator", deployer);

  const mock = m.contract("MockERC20", []);
  m.call(mock, "mint", [deployer, 1_000_000n * 10n ** 6n]);

  const settlement = m.contract("UsageXSettlement", [mock, treasury, operator]);

  return { settlement, token: mock };
});
