import * as crypto from "crypto";

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
    timestamp: number,
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
    const verifier = crypto.createVerify("sha256");
    const content = JSON.stringify({
      sender: this.sender,
      reciever: this.reciever,
      amount: this.amount,
      timestamp: this.timestamp,
    });
    verifier.update(content);
    return verifier.verify(
      this.sender,
      Buffer.from(this.signature, "hex")
    );
  }
}

export class Block {
  public constructor(
    public readonly transactions: SignedTransaction[],
    public readonly prevHash: string,
    public nonce = Math.round(Math.random() * 99999999999)
  ) {}

  get digest() {
    const hash = crypto.createHash("sha256");
    const content = JSON.stringify(this);
    hash.update(content);
    return hash.digest("hex");
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

  public static createWallet() {
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return new Wallet(keyPair.publicKey, keyPair.privateKey);
  }

  public transfer(reciever: string, amount: number) {
    const transaction = new Transaction(
      this.publicKey,
      reciever,
      amount,
      Date.now()
    );
    const content = JSON.stringify(transaction);
    const signer = crypto.createSign("sha256");
    signer.update(content).end();
    const signature = signer.sign(this.privateKey).toString("hex");
    const signedTransaction = SignedTransaction.sign(
      transaction,
      signature
    );
    return signedTransaction;
  }
}

export interface IChain{
  addBlock(block: Block):boolean;
  getBlock(index: number):Block;
  getBlocksFrom(index: number): Block[] | undefined;
  valid(index: number, digest: string): number;
  get blocks(): Block[];
}

export class Chain implements IChain {
  public constructor(public blocks: Block[] = []) {}

  
  public addBlock(block: Block) {
    if (block.isValid() && this.correctPrev(block)) {
      this.blocks.push(block);
      return true;
    }
    return false;
  }

  private correctPrev(block:Block){
    return (block.prevHash === '' && this.blocks.length === 0)
    || (block.prevHash === this.head().digest);
  }

  public head(){
    return this.blocks[this.blocks.length-1];
  }

  public getBlock(index: number) {
    return this.blocks[index];
  }

  public getBlocksFrom(index: number) {
    if(this.blocks.length <= index){
      return undefined;
    }
    return this.blocks.slice(index);
  }

  public valid(index: number, digest: string) {
    if (this.blocks.length <= index) {
      return index - this.blocks.length + 1;
    }

    const digesti = this.getBlock(index).digest;
    if (digesti === digest) {
      return 0;
    } else {
      return -1;
    }
  }
}

export class ChainDecorator implements IChain{
  public constructor(private chain:IChain){}

  addBlock(block: Block): boolean {
    return this.chain.addBlock(block);
  }
  getBlock(index: number): Block {
    return this.chain.getBlock(index);
  }
  getBlocksFrom(index: number): Block[] {
    return this.chain.getBlocksFrom(index);

  }
  valid(index: number, digest: string): number {
    return this.chain.valid(index, digest);
  }

  get blocks(){
    return this.chain.blocks;
  }
} 

export class Controller {
  public constructor(private chain: IChain) {}

  addBlock(block: Block) {
    return this.chain.addBlock(block);
  }
}

// const luke = Wallet.createWallet();
// console.log(JSON.stringify(luke));

const publicKey =
  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxwSh12hX297NXRpYatIV\nt54gzRPDdHWAOV5x9rrN5JqsSb7JFetU2GGhOyeNraafA/x0R1aVS4omiMZRMGmx\noG/R9XYd5iytHPDs5sb4gwLmAGnsYZH27dsBEn1PfD9TWdaEZwcgYhWBr+hPiykZ\n2zsjic7QsmLXcPH3S0L2ctxCxLXY0dkTFL3Se0qZp5hk1ExKyksPPuqE2givghRe\nJzb+AS2MXNjj5PTZhfoREolesBWFfy2P4++okS2OINPYFfWDjYU0Bx25PuSQc5bC\nbne/ONeb1ZGrnPAYQlBcjYa6ApUbCB2X59ol+4uNWHtannntQOP8VaF+WwSFtLDb\nAQIDAQAB\n-----END PUBLIC KEY-----\n";
const privateKey =
  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHBKHXaFfb3s1d\nGlhq0hW3niDNE8N0dYA5XnH2us3kmqxJvskV61TYYaE7J42tpp8D/HRHVpVLiiaI\nxlEwabGgb9H1dh3mLK0c8OzmxviDAuYAaexhkfbt2wESfU98P1NZ1oRnByBiFYGv\n6E+LKRnbOyOJztCyYtdw8fdLQvZy3ELEtdjR2RMUvdJ7SpmnmGTUTErKSw8+6oTa\nCK+CFF4nNv4BLYxc2OPk9NmF+hESiV6wFYV/LY/j76iRLY4g09gV9YONhTQHHbk+\n5JBzlsJud78415vVkauc8BhCUFyNhroClRsIHZfn2iX7i41Ye1qeee1A4/xVoX5b\nBIW0sNsBAgMBAAECggEBAIxg/RNm+0oQn0TDt4gphb4N4M8m2KBF3VsZ/kLtwxsz\n6sDdvRMj+qXiP4rtPGc3d0SlhxNmxEoTOVkSoeQHOY6UMUH1veNEshsO6dtij5pB\nqiCyllTAU6+04c277BwUwuNEiAHwKexlhSOiNrFPHXjg/xFOezDIvXRiiG9i3Vlo\nOrKAzvAqtHw39PI5huvSt4a3iYFBSX06L1DZe8vRY7hjt3j8by6vLSvf6/xxvTAf\ne76UVhCLoLumXBf56+LAJH0DwBCla9Zu9UIbVpvypg2zKb2+R5QplAsCW44AcqUs\nuvUylP6iWZWeU+pZNKX4Hxfv45SXzPWaH4MjRxnMUBECgYEA80BORSHkmBnu8U5a\np8KoQblzK8VHvyui+Vzz8tcJWLOwpNV/eJvJ7k+U28rFJzvvLSBB6iyBsZXIU4WO\nvjWBiMBbUMKD9WWp+YYpYrySws9A19DPjavC2MCQXYPGuQ+rompb/uhsnJ9er4Qg\nBggDGzTQSmshupM2AzErhHbYdx0CgYEA0XLaK4UPfC0juYSIckykfkAmp+rXjzF9\njvXuD/TRWi6kYY0Utb4FjR3RJF36VIPyEzmUPRdDOQ8FbNWU4MMC1Zar1KK2ymQk\nr6lPdQZT7UdMnZTPi3/6AcqLliAyxInN9J+NYPx6wka6LShfHNYcgEtZLFf5gV2L\n9zozxQAAWjUCgYAsVupte5IZj5CYd7nanobhBBbUQa+kTyXz4letSjkv7AEk6q3D\npFIYmHT/42QwlKIyTZD2SIqTfkP3xX6ReVtVPArpG6vGDXQAQc5Fay4tSG3/aNaM\ncmSf8eneweh1Tz/v6Qc/3cn+eqZdw+26a7d1PBlDl2echLzxtALEsI0gmQKBgA1m\nfMDmDXyTYsK+0QAHGUsejZqWst3te6wG3glVT4OmkkvPe/C4zKAftT7PaHG502YZ\ne/uAnoNrC5zP+Wt77pV9w1aiZnGCgLpgab4B/qKiuism1zSEppkwvUeIndbnPi8V\nejUnUi9V2RmEiLlOlZo7t+PXaRY2xvq1VZSYEG21AoGAXE5vsdh+zyxs56V4mBi3\nx4p4hIVq72if6pHoA8/9bJXiAm8ZUGFoksdjDZ8o1w/dgb/i59PdwCukwQ7gypjI\nqZde0xnfPtvdNjGcZQrSOtE3f2rVZSrEpmS1JJP38ZMLRlZgyn0SjMpAARzjlUfH\nQRcwlXn3B5/fdQ0zSmSqZdg=\n-----END PRIVATE KEY-----\n";

// const wallet = new Wallet(publicKey, privateKey);

// console.log(wallet.transfer("adsf", 100)
// const daniel = Wallet.createWallet();
// const chain = new Chain();

// const trans = [];
// trans.push(luke.transfer(daniel.publicKey, 10));

// const block = new Block(trans, "");

// const miner = new Miner();
// miner.mine(block);

// chain.addBlock(block);
// console.log(JSON.stringify(chain, null, 4))
