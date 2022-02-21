import { Block, SignedTransaction } from "./blockchain";



const egblock = new Block([], "", 0);
const egTransaction = new SignedTransaction("", "", 0, 0, "");

export function addProtoForBlock(block:Block) {
    //@ts-ignore
    block.__proto__ = egblock.__proto__;
    block.transactions.forEach(addProtoForTransaction);
    return block
}

export function addProtoForTransaction(transaction: SignedTransaction) {

    //@ts-ignore
    transaction.__proto__ = egTransaction.__proto__;
}