import { network } from "hardhat";
import { expect } from "chai";

describe("Reentrancy Attack and Defense Lab", function () {
  let ethers;
  let owner, alice, attackerUser;
  let vulnerable, secure, attacker;
  let VulnerableVault, SecureVault, Attacker;

  const eth = (n) => ethers.parseEther(String(n));

  beforeEach(async function () {
    // Create the Hardhat 3 network connection and extract ethers
    const connection = await network.create();
    ethers = connection.ethers;

    [owner, alice, attackerUser] = await ethers.getSigners();

    VulnerableVault = await ethers.getContractFactory("VulnerableVault");
    vulnerable = await VulnerableVault.deploy();
    await vulnerable.waitForDeployment();

    SecureVault = await ethers.getContractFactory("SecureVault");
    secure = await SecureVault.deploy();
    await secure.waitForDeployment();

    Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    attacker = await Attacker.deploy();
    await attacker.waitForDeployment();

    // Victim deposits 5 ETH into each vault.
    await (await vulnerable.connect(alice).deposit({ value: eth(5) })).wait();
    await (await secure.connect(alice).deposit({ value: eth(5) })).wait();
  });

  it("allows a normal user to deposit and withdraw from the vulnerable vault", async function () {
    const userVault = await VulnerableVault.deploy();
    await userVault.waitForDeployment();
    await (await userVault.connect(alice).deposit({ value: eth(1) })).wait();
    expect(await userVault.balances(alice.address)).to.equal(eth(1));
    await (await userVault.connect(alice).withdraw()).wait();
    expect(await userVault.balances(alice.address)).to.equal(0n);
  });

  it("demonstrates that reentrancy can withdraw more than the attacker's deposit", async function () {
    const beforeVault = await ethers.provider.getBalance(await vulnerable.getAddress());
    await (await attacker.connect(attackerUser).attack(
      await vulnerable.getAddress(), 3, { value: eth(1) }
    )).wait();

    const afterVault = await ethers.provider.getBalance(await vulnerable.getAddress());
    const attackerBalance = await ethers.provider.getBalance(await attacker.getAddress());

    expect(beforeVault).to.equal(eth(5));
    expect(afterVault).to.equal(eth(2)); // 5 + 1 deposit - 4 withdrawals
    expect(attackerBalance).to.equal(eth(4));
  });

  it("blocks the same attack against the secure vault", async function () {
    const beforeVault = await ethers.provider.getBalance(await secure.getAddress());
    await expect(attacker.connect(attackerUser).attack(
      await secure.getAddress(), 3, { value: eth(1) }
    )).to.be.revert(ethers); // Updated for Hardhat 3

    const afterVault = await ethers.provider.getBalance(await secure.getAddress());
    expect(afterVault).to.equal(beforeVault);
    expect(await secure.balances(await attacker.getAddress())).to.equal(0n);
  });

  it("rejects a withdrawal when the caller has no recorded balance", async function () {
    await expect(vulnerable.connect(attackerUser).withdraw()).to.be.revertedWith("No balance");
  });
});