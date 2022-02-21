export class Transaction {
  public constructor(
    public readonly sender: string,
    public readonly reciever: string,
    public readonly amount: number,
    public readonly timestamp: number
  ) {}
}

export class SignedTransaction extends Transaction {
  public constructor(
    sender: string,
    reciever: string,
    amount: number,
    timestamp:number,
    public readonly signature: string
  ) {
    super(sender, reciever, amount, timestamp);
  }

  public static sign(transaction: Transaction, signature: string) {
    return new SignedTransaction(
      transaction.sender,
      transaction.reciever,
      transaction.amount,
      transaction.timestamp,
      signature
    );
  }

  public isValid() {
    return true;
  }
}

/*
Convert a string into an ArrayBuffer
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/*
  Import a PEM encoded RSA private key, to use for RSA-PSS signing.
  Takes a string containing the PEM encoded key, and returns a Promise
  that will resolve to a CryptoKey representing the private key.
  */
async function importPrivateKey(pem: string) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length
  );
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["sign"]
  );
}

export class Block {
  public constructor(
    public readonly transactions: SignedTransaction[],
    public readonly prevHash: string,
    public nonce = Math.round(Math.random() * 99999999999)
  ) {}

  get digest() {
    return "";
  }

  isValid() {
    return this.transactionsValid() && this.correctDigest();
  }

  transactionsValid() {
    return this.transactions.every((tran) => tran.isValid());
  }

  correctDigest() {
    return this.digest.substring(0, 4) == "0000";
  }
}

export class Wallet {
  public constructor(
    public readonly publicKey: string,
    public readonly privateKey: string
  ) {}

  public async transfer(reciever: string, amount: number) {
    const transaction = new Transaction(
      this.publicKey,
      reciever,
      amount,
      Date.now()
    );
    const content = JSON.stringify(transaction);

    const buffer = Buffer.from(this.privateKey);
    const key = await importPrivateKey(this.privateKey);

    const signatureB = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      Buffer.from(content)
    );
    const signature = Buffer.from(signatureB).toString("hex");

    console.log(signature);
    const signedTransaction = SignedTransaction.sign(
      transaction,
      signature
    );
    return signedTransaction;
  }
}

export class Chain {
  public constructor(public blocks: Block[] = []) {}

  public addBlock(block: Block) {
    if (block.isValid()) {
      this.blocks.push(block);
      return true;
    }
    return false;
  }
}

class Miner {
  private keepRunning = false;
  constructor() {}

  public mine(block: Block) {
    this.keepRunning = true;
    while (!block.correctDigest() && this.keepRunning) {
      block.nonce = Math.round(Math.random() * 99999999999);
    }
    return block;
  }

  public stop() {
    this.keepRunning = false;
  }
}

export class Controller {
  public constructor(private chain: Chain) {}

  addBlock(block: Block) {
    return this.chain.addBlock(block);
  }
}

export class MiningController {
  private queuedTransactions: SignedTransaction[] = [];
  private miner: Miner = new Miner();

  constructor(private _prevHash: string) {}

  set prevHash(prevHash: string) {
    this._prevHash = prevHash;
  }

  addTransaction(transaction: SignedTransaction) {
    if (transaction.isValid()) {
      this.queuedTransactions.push(transaction);

      if (this.queuedTransactions.length > 1) {
        const block = new Block(
          this.queuedTransactions.splice(0, 1),
          this._prevHash
        );
        this.miner.mine(block);
      }

      return true;
    } else {
      return false;
    }
  }


}

// const luke = Wallet.createWallet();
// const daniel = Wallet.createWallet();
// const chain = new Chain();

// const trans = [];
// trans.push(luke.transfer(daniel.publicKey, 10));

// const block = new Block(trans, "");

// const miner = new Miner();
// miner.mine(block);

// chain.addBlock(block);
// console.log(JSON.stringify(chain, null, 4))
