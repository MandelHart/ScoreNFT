import { execSync } from "child_process";
import * as fs from "fs";

// Check if hardhat node is running
try {
  const result = execSync("curl -X POST -H 'Content-Type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' http://localhost:8545", {
    encoding: "utf-8",
    timeout: 2000,
    stdio: "pipe",
  });
  const json = JSON.parse(result);
  if (json.result) {
    console.log("Hardhat node is running");
    process.exit(0);
  }
} catch (e) {
  console.log("Hardhat node is not running");
  process.exit(1);
}

