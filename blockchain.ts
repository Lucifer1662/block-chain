import * as crypto from 'crypto';

class Transaction {
    public constructor(
        public readonly sender: string,
        public readonly reciever: string,
        public readonly amount: number
    ) {

    }
}

class SignedTransaction extends Transaction {
    public constructor(
        sender: string,
        reciever: string,
        amount: number,
        public readonly signature: string
    ) {
        super(sender, reciever, amount)
    }

    public static sign(transaction: Transaction, signature: string) {
        return new SignedTransaction(transaction.sender, transaction.reciever, transaction.amount, signature);
    }

    public isValid() {
        const verifier = crypto.createVerify('sha256');
        verifier.update(JSON.stringify({sender:this.sender,reciever:this.reciever,amount:this.amount}));
        return verifier.verify(this.sender, this.signature)
    }
}


class Block {

    public constructor(
        public readonly transactions: SignedTransaction[],
        public readonly prevHash: string,
        public nonce = Math.round(Math.random() * 99999999999)
    ) { }


    get digest() {
        const hash = crypto.createHash('sha256');
        const content = JSON.stringify(this)
        hash.update(content);
        return hash.digest('hex')
    }

    isValid() {
        return this.transactionsValid() && this.correctDigest();
    }

    transactionsValid() {
        return this.transactions.every((tran) => tran.isValid());
    }

    correctDigest() {
        return this.digest.substring(0, 4) == '0000';
    }
}


class Wallet {
    public constructor(
        public readonly publicKey: string,
        public readonly privateKey: string) {
    }

    public static createWallet() {
        const keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            }, privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return new Wallet(keyPair.publicKey, keyPair.privateKey);
    }

    public transfer(reciever: string, amount: number) {
        const transaction = new Transaction(this.publicKey, reciever, amount);
        const content = JSON.stringify(transaction);
        const signer = crypto.createSign('sha256');
        signer.update(content).end();
        const signature = signer.sign(this.privateKey).toString();
        return SignedTransaction.sign(transaction, signature);
    }
}

class Chain {
    public constructor(
        public blocks: Block[] = []
    ) { }

    public addBlock(block: Block) {
        if (block.isValid()) {
            this.blocks.push(block);
            return true;
        }
        return true;
    }
}

class Miner {
    constructor() { }

    public mine(block: Block) {
        while (!block.correctDigest()) {
            block.nonce = Math.round(Math.random() * 99999999999);
        }
        return block;
    }
}



const luke = Wallet.createWallet();
const daniel = Wallet.createWallet();
const chain = new Chain();


const trans = [];
trans.push(luke.transfer(daniel.publicKey, 10));

const block = new Block(trans, "");

const miner = new Miner();
miner.mine(block);


chain.addBlock(block);
console.log(chain)




