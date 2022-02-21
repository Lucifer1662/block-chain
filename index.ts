import * as express from "express";
import {
  Block,
  Chain,
  Controller,
  IChain,
  SignedTransaction,
} from "./blockchain";
import { Validator } from "./validator";
import * as crypto from "crypto";
import fetch from "cross-fetch";
//@ts-ignore
import * as cors from "cors";
import { MinerChainDecorator, MiningController } from "./miner";
import { BlockList } from "net";
import { addProtoForBlock } from "./rawToObject";
import {writeFile} from 'fs/promises'
const app = express();
app.use(cors());

const port = Number.parseInt(process.argv[2]) || 3000;

const myIp = `localhost:${port}`;

const signedTransactionValidator = new Validator(
  new SignedTransaction("", "", 0, 0, "")
);

console.log(Object.getPrototypeOf(String));

let chain: IChain = new Chain();



const miningController = new MiningController("");
chain = new MinerChainDecorator(chain).setController(
  miningController
);

const controller = new Controller(chain);

miningController.onNewBlockFound((block) => {
  chain.addBlock(block);
  sendSyncToAll();

  // fetch("http://" + myIp + "/addBlock", {
  //   method: "POST",
  //   headers: {
  //     Accept: "application/json",
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ block, timestamp: Date.now() }),
  // });
});

class Node {
  public neighbours = new Set<string>();

  addNeighbour(ip: string) {
    if (this.neighbours.has(ip)) return false;
    this.neighbours.add(ip);
    return true;
  }

  async traverse(
    req: express.Request<{}, any, any, any, Record<string, any>>
  ): Promise<void> {
    await Promise.all(
      Array.from(this.neighbours.values()).map(async (neighbour) => {
        try {
          await fetch("http://" + neighbour + req.path, {
            body: JSON.stringify(req.body),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            method: req.method,
          });
        } catch (e: any) {
          console.log(e);
          //if any errors occur we remove this neighbour
          this.neighbours.delete(neighbour);
        }
      })
    );
  }
}

const node = new Node();

const previousRequests = new Map<string, number>();

app.use(express.json());

async function sendSync(ip: string, length: number) {
  try {
    const response = await fetch("http://" + ip + "/sync", {
      body: JSON.stringify({ length, ip: myIp }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    return response.status;
  } catch (e) {
    return undefined;
  }
}

async function sendSyncToAll() {
  return Promise.all(
    Array.from(node.neighbours.values()).map((ip) =>
      sendSync(ip, chain.blocks.length)
    )
  );
}

async function isValidBlock(
  ip: string,
  index: number,
  digest: string
) {
  try {
    const params = new URLSearchParams({
      index: index.toString(),
      hash: digest,
    });
    const response = await fetch(
      "http://" + ip + "/isValid?" + params
    );

    const json = await response.json();
    return json.result;
  } catch (e) {
    return undefined;
  }
}

async function getChainSize(ip: string) {
  try {
    const response = await fetch("http://" + ip + "/chainSize?");

    const json = await response.json();

    return json.size;
  } catch (e) {
    return undefined;
  }
}

async function getBlocksFrom(ip: string, index: number) {
  try {
    const params = new URLSearchParams({
      index: index.toString(),
    });
    console.log("http://" + ip + "/getBlocks?" + params.toString());
    const response = await fetch(
      "http://" + ip + "/getBlocks?" + params.toString()
    );

    const json = await response.json();
    const blocks = json.blocks as Block[];
    blocks.forEach(addProtoForBlock);

    return blocks;
  } catch (e) {
    return undefined;
  }
}

async function getCommonBlock(ip: string) {
  console.log(chain.blocks.length-1)
  for (let i = chain.blocks.length - 1; i >= 0; i--) {
    console.log(i)
    const result = await isValidBlock(
      ip,
      i,
      chain.getBlock(i).digest
    );
    console.log('me')
    console.log({result})
    if (result === 0) {
      return i;
    }
  }
  console.log("negative one")
  return -1;
}

async function syncToRemoteChain(ip: string, index: number) {
  const newBlocks = await getBlocksFrom(ip, index);
  index--;
  console.log({newBlocksSize: newBlocks? newBlocks.length: -1});
  if (newBlocks) {
    console.log({index, newBlocks, blocks:chain.blocks})
    if (
      index >= 0 && chain.blocks.length > index &&
      chain.blocks[index].digest !== newBlocks[0].prevHash
    ) {
      return false;
    }
    chain.blocks.splice(index+1, chain.blocks.length - index);

    for (const block of newBlocks) {
      if (!chain.addBlock(block)) {
        return false;
      }
    }
  }
  return true;
}

async function resolveChain() {
  if (node.neighbours.size > 0) {
    const commonBlocks = await Promise.all(
      Array.from(node.neighbours.values()).map(async (neigbhour) => ({
        size: await getChainSize(neigbhour),
        neigbhour,
      }))
    );

    console.log(commonBlocks);

    let maxNeighbour = commonBlocks[0].neigbhour;
    let maxSize = commonBlocks[0].size;
    commonBlocks.forEach(({ size, neigbhour }) => {
      if (size > maxSize) {
        maxNeighbour = neigbhour;
        maxSize = size;
      }
    });

    if (maxSize > 0) {
      const index = -1;//await getCommonBlock(maxNeighbour);
      console.log({index})
      await syncToRemoteChain(maxNeighbour, index+1);
    }

    await Promise.all(
      commonBlocks
        .filter(
          ({ size, neigbhour }) => size < chain.blocks.length - 1
        )
        .map(({ size, neigbhour }) =>
          sendSync(neigbhour, chain.blocks.length)
        )
    );
  }
}

const cache = ["addNode", "ping"];

app.use((req, res, next) => {
  console.log(req.path);
  if(!cache.includes(req.path)){
    next();
    return;
  }
  const content = JSON.stringify({
    path: req.path,
    mehtod: req.method,
    body: req.body,
  });
  const hasher = crypto.createHash("sha256");

  hasher.update(content).end();
  const digest = hasher.digest("hex");
  if (!previousRequests.has(digest)) {
    previousRequests.set(digest, Date.now());
    next();
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/addNode", (req, res) => {
  let { ip } = req.body;
  try {
    if (typeof ip !== "string" || myIp === ip) {
      throw "Invalid";
    }

    node.traverse(req);
    if (node.addNeighbour(ip)) {
      console.log("added + " + ip);

      sendSync(ip, chain.blocks.length);

      fetch("http://" + ip + "/addNode", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip: myIp, timestamp: Date.now() }),
      });
    }
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.post("/addBlock", (req, res) => {
  let {
    block: { prevHash, transactions, nonce },
  } = req.body;
  try {
    if (typeof prevHash !== "string" || typeof nonce !== "number") {
      throw "Invalid";
    }

    signedTransactionValidator.validList(transactions);
    const block = new Block(transactions, prevHash, nonce);
    if (block.isValid()) {
      node.traverse(req);
      const added = controller.addBlock(block);
      if (added) {
        miningController.removeTransactions(block.transactions);
        miningController.changeHead(block.digest);
      }

      if (added) {
        miningController.prevHash = block.digest;
        res.status(200);
      } else {
        res.status(300);
      }
    } else {
      res.status(300);
    }
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

// app.post("/addBlocks", (req, res) => {
//   let { blocks } = req.body as {blocks:Block[]};
//   try {
//     if (!blocks.forEach) {
//       throw "Invalid";
//     }

//     for (let i = 0; i < blocks.length; i++) {
//       const { transactions, prevHash, nonce } = blocks[i];
//       if (typeof prevHash !== "string" || typeof nonce !== "number") {
//         throw "Invalid";
//       }

//       signedTransactionValidator.validList(transactions);
//       const block = new Block(transactions, prevHash, nonce);
//       if (block.isValid()) {
//         throw "Invalid";
//       }
//     }

//     for (let i = 0; i < blocks.length; i++) {
//       const { transactions, prevHash, nonce } = blocks[i];
//       const block = new Block(transactions, prevHash, nonce);

//       const added = controller.addBlock(block);
//       miningController.removeTransactions(block.transactions);

//       if (added) {
//         miningController.prevHash = block.digest;
//         res.status(200);
//       } else {
//         res.status(300);
//         break
//       }
//     }

//   } catch (e) {
//     res.status(400);
//   } finally {
//     res.end();
//   }
// });

app.post("/addTransaction", (req, res) => {
  let { transaction } = req.body as {
    transaction: SignedTransaction;
  };
  try {
    transaction = signedTransactionValidator.valid(transaction);

    transaction = new SignedTransaction(
      transaction.sender,
      transaction.reciever,
      transaction.amount,
      transaction.timestamp,
      transaction.signature
    );

    const added = miningController.addTransaction(transaction);

    if (added) {
      res.status(200);
      // node.traverse(req);
    } else {
      res.status(300);
    }
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.post("/sync", async (req, res) => {
  let { length, ip } = req.body as {
    length: number;
    ip: string;
  };
  try {
    if (typeof length !== "number" || typeof ip !== "string") {
      throw "Invalid Params";
    }

    if (chain.blocks.length < length) {
      console.log("syncing to remote");
      if (!(await syncToRemoteChain(ip, chain.blocks.length))) {
        await resolveChain();
      } 
    }
    res.status(200);
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.get("/getBlock", (req, res) => {
  let { index } = req.query;
  try {
    if (typeof index !== "number") {
      throw "Invalid Params";
    }
    const block = chain.getBlock(index);
    res.json(block);
    res.status(200);
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.get("/getBlocks", (req, res) => {
  try {
    if (typeof req.query.index !== "string") {
      throw "Invalid Params";
    }
    const index = Number.parseInt(req.query.index);
    if (typeof index !== "number") {
      throw "Invalid Params";
    }
    const blocks = chain.getBlocksFrom(index);
    res.json({ blocks });
    res.status(200);
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.get("/chainsize", (req, res) => {
  try {
    const size = chain.blocks.length;
    res.json({ size });
    res.status(200);
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.get("/isValid", (req, res) => {
  let { hash } = req.query;
  try {
    if (
      typeof req.query.index !== "string" ||
      typeof hash !== "string"
    ) {
      throw "Invalid Params";
    }

    const index = Number.parseInt(req.query.index);

    const result = chain.valid(index, hash);
    res.json({ result });
    res.status(200);
  } catch (e) {
    res.status(400);
  } finally {
    res.end();
  }
});

app.post("/ping", (req, res) => {
  node.traverse(req);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ping(ip: string) {
  return fetch("http://" + ip + "/ping", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ timestamp: Date.now() }),
  });
}

const responses: any = {
  addNode: async (args: string[]) => {
    const ip = args;
    try {
      await fetch("http://" + ip + "/addNode", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip: myIp, timestame: Date.now() }),
      });
      console.log("success");
    } catch (e) {
      console.log(e);
    }
  },

  getNodes: async (args: string[]) => {
    console.log(Array.from(node.neighbours.values()));
  },
  blocks: async (args: string[]) => {
    chain.blocks.forEach((block) => {
      console.log(block.nonce);
    });
  },
  transactions: async (args: string[]) => {
    chain.blocks.forEach((block: Block) => {
      console.log(block.transactions);
    });
  },

  ping: (args: string[]) => {
    node.neighbours.forEach((neighbour) => ping(neighbour));
  },
};

const respond = async (command: string) => {
  const args = command.split(" ");
  if (args.length >= 1) {
    const response = responses[args[0]];
    if (response) {
      args.shift();
      response(args);
    }
  }

  rl.question(">", respond);
};

rl.question(">", respond);

rl.on("close", function () {
  console.log("\nBYE BYE !!!");
  process.exit(0);
});
