import { Block, SignedTransaction, Wallet, ChainDecorator } from "./blockchain";
import { Worker } from "worker_threads";
import { addProtoForBlock } from "./rawToObject";



export class MinerChainDecorator extends ChainDecorator{
  private controller: MiningController;
  public setController(controller: MiningController){
    this.controller = controller;
    return this;
  }
  public addBlock(block:Block){
    const res = super.addBlock(block);
    if(this.controller){
      this.controller.removeTransactions(block.transactions);
      this.controller.changeHead(block.digest);
    }
    return res;
  }
}

export class Miner {
  private keepRunning = false;
  public block?: Block;
  constructor() {}

  public async mine() {
    this.keepRunning = true;
    while (this.block && !this.block.correctDigest() && this.keepRunning) {
      this.block.nonce = Math.round(Math.random() * 99999999999);
    }
    return this.block;
  }

  public stop() {
    this.keepRunning = false;
  }

  get running() {
    return this.keepRunning;
  }
}


export class MiningController {
  private queuedTransactions: SignedTransaction[] = [];
  private miner: Miner = new Miner();
  private worker: Worker;
  private currentBlock?: Block;
  private callback: (block: Block) => void = () => {};
  private wallet: Wallet = Wallet.createWallet();

  constructor(private _prevHash: string) {
    this.runService();
  }

  set prevHash(prevHash: string) {
    this._prevHash = prevHash;
  }

  runService() {
    this.worker = new Worker("./miner_worker.ts", {});
    this.worker.on("message", (message) => {
      this.currentBlock = undefined;
      addProtoForBlock(message.minedBlock);
      this.callback(message.minedBlock as Block);
    });
    this.worker.on("exit", (code: number) => {
      console.log("exited");
    });
  }

  addTransaction(transaction: SignedTransaction) {
    if (transaction.isValid()) {
      this.queuedTransactions.push(transaction);

      this.updateMinerBlock();

      return true;
    } else {
      return false;
    }
  }


  private updateMinerBlock(force: boolean  = false) {
    if (this.queuedTransactions.length > 1) {
      if (!this.currentBlock || force) {
        const block = new Block(
          this.queuedTransactions.filter((t, i) => i < 1),
          this._prevHash
        );
        block.transactions.push(this.wallet.transfer('miner', 1))
        this.currentBlock = block;
        this.worker.postMessage({ type: "newBlock", block });
      }
    }else if(this.currentBlock){
      this.worker.postMessage({ type: "newBlock", undefined });
    }
  }

  public removeTransactions(transactions: SignedTransaction[]) {
    this.queuedTransactions = this.queuedTransactions.filter(
      (t1) =>
        transactions.findIndex(
          (t2) => t1.signature === t2.signature
        ) === -1
    );

    if (this.currentBlock) {
      const blockContainsTransactions = this.currentBlock.transactions.some(
        (t1) =>
          transactions.findIndex(
            (t2) => t1.signature === t2.signature
          ) === -1
      );

      if (blockContainsTransactions) {
        this.updateMinerBlock(true);
      }
    }
  }

  public changeHead(digest:string){
    this.prevHash = digest;
    this.updateMinerBlock(true);
  }

  public onNewBlockFound(callback: (block: Block) => void) {
    this.callback = callback;
  }
}
