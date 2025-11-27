// backend/scripts/deploy.js

const hre = require("hardhat");

async function main() {
  // Lấy tài khoản đầu tiên làm Admin
  const [deployer] = await hre.ethers.getSigners();
  const adminAddress = deployer.address;

  console.log("Deploying contracts with the account:", adminAddress);

  // Deploy Contract
  const ComicManagement = await hre.ethers.getContractFactory("ComicManagement");
  const comicManagement = await ComicManagement.deploy(adminAddress);
  
  await comicManagement.deployed();

  console.log("ComicManagement deployed to:", comicManagement.address);

  // Ghi lại địa chỉ contract để sử dụng ở frontend
  // Ví dụ: fs.writeFileSync('artifacts/contractAddress.js', `export const comicContractAddress = '${comicManagement.address}';`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
