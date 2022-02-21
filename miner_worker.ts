import { workerData, parentPort } from "worker_threads";
import { Block } from "./blockchain";
import { Miner } from "./miner";

const miner = new Miner();

function getMessage() {
  return new Promise((resolve, reject) => {
    parentPort.on("message", (message: any) => {
      if (message.block) {
        //@ts-ignore
        message.block.__proto__ = new Block([], "", 0).__proto__;
      }
      miner.block = message.block;
      resolve(message);
    });
  });
}

async function run() {
  while (true) {
    await getMessage();
    console.log("started mining");
    const block = await miner.mine();
    console.log("stopped mining");

    if (block) {
        console.log(block.nonce)
      parentPort.postMessage({ minedBlock: block });
    }
  }
}

run();
