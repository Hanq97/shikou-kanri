# Fabric Gateway & Transactions Specialist

**Domain**: Hyperledger Fabric - Gateway API & Transaction Management
**Stack**: NestJS + Hyperledger Fabric
**Responsibility**: Gateway connections, contract discovery, transaction lifecycle, event listeners, private data collections, endorsement policies
**Pattern Count**: 12 patterns

---

## Overview

This specialist handles Hyperledger Fabric application integration using the Gateway API, including gateway connections, contract discovery, transaction proposal/endorsement/commit lifecycle, event listeners (block, transaction, chaincode events), private data collections, and state-based/key-level endorsement policies.

**Core Competencies**:
- Gateway Connection & Configuration
- Contract Discovery & Invocation
- Transaction Lifecycle Management
- Event Listener Patterns
- Private Data Collections
- Advanced Endorsement Policies

---

## Pattern Index

### Gateway & Contract (2 patterns)
1. Gateway Connection
2. Contract Discovery

### Transaction Lifecycle (3 patterns)
3. Transaction Proposal
4. Transaction Endorsement
5. Transaction Commit

### Event Listeners (4 patterns)
6. Event Listener
7. Block Event
8. Transaction Event
9. Chaincode Event

### Advanced Features (3 patterns)
10. Private Data Collection
11. State-Based Endorsement
12. Key-Level Endorsement

---

## 1. Gateway Connection

**Purpose**: Establish gateway connection to Fabric network for transaction submission.

### Pattern 1.1: Gateway Service (NestJS)

```typescript
// src/fabric/gateway/gateway.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Gateway, Wallets, X509Identity } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GatewayService implements OnModuleInit, OnModuleDestroy {
  private gateway: Gateway;
  private wallet;

  async onModuleInit() {
    await this.initGateway();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async initGateway() {
    // Load wallet
    const walletPath = path.join(process.cwd(), 'wallet');
    this.wallet = await Wallets.newFileSystemWallet(walletPath);

    // Load connection profile
    const ccpPath = path.resolve(__dirname, '..', '..', 'config', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create gateway instance
    this.gateway = new Gateway();

    // Gateway connection options
    const connectionOptions = {
      wallet: this.wallet,
      identity: 'user1',
      discovery: { enabled: true, asLocalhost: true }, // Service discovery
      eventHandlerOptions: {
        commitTimeout: 100,
        endorseTimeout: 30,
      },
    };

    // Connect to gateway
    await this.gateway.connect(ccp, connectionOptions);
  }

  async getGateway(): Promise<Gateway> {
    if (!this.gateway) {
      await this.initGateway();
    }
    return this.gateway;
  }

  async disconnect() {
    if (this.gateway) {
      this.gateway.disconnect();
    }
  }

  async getNetwork(channelName: string) {
    const gateway = await this.getGateway();
    return gateway.getNetwork(channelName);
  }

  async getContract(channelName: string, contractName: string) {
    const network = await this.getNetwork(channelName);
    return network.getContract(contractName);
  }
}
```

### Pattern 1.2: Gateway with Multiple Identities

```typescript
// src/fabric/gateway/multi-identity-gateway.service.ts
import { Injectable } from '@nestjs/common';
import { Gateway, Wallets } from 'fabric-network';

@Injectable()
export class MultiIdentityGatewayService {
  private gateways: Map<string, Gateway> = new Map();

  async connectAs(userId: string, connectionProfile: any, walletPath: string): Promise<Gateway> {
    // Check if gateway already exists for this user
    if (this.gateways.has(userId)) {
      return this.gateways.get(userId);
    }

    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const gateway = new Gateway();

    await gateway.connect(connectionProfile, {
      wallet: wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true },
    });

    this.gateways.set(userId, gateway);
    return gateway;
  }

  async disconnectUser(userId: string) {
    const gateway = this.gateways.get(userId);
    if (gateway) {
      gateway.disconnect();
      this.gateways.delete(userId);
    }
  }

  async disconnectAll() {
    for (const [userId, gateway] of this.gateways) {
      gateway.disconnect();
    }
    this.gateways.clear();
  }
}
```

### Pattern 1.3: Gateway Connection Options

```typescript
// Advanced gateway connection options
const connectionOptions = {
  wallet: wallet,
  identity: 'user1',

  // Service discovery configuration
  discovery: {
    enabled: true,
    asLocalhost: true, // Use localhost for Docker network
  },

  // Event handling strategies
  eventHandlerOptions: {
    commitTimeout: 300, // 5 minutes
    endorseTimeout: 30, // 30 seconds
    strategy: null, // Use default event handling strategy
  },

  // TLS options
  clientTlsIdentity: 'tlsUser',

  // Query handler options
  queryHandlerOptions: {
    timeout: 3, // 3 seconds
    strategy: null,
  },
};

await gateway.connect(connectionProfile, connectionOptions);
```

---

## 2. Contract Discovery

**Purpose**: Discover and access deployed smart contracts (chaincode) on the network.

### Pattern 2.1: Contract Service

```typescript
// src/fabric/contract/contract.service.ts
import { Injectable } from '@nestjs/common';
import { GatewayService } from '../gateway/gateway.service';
import { Contract } from 'fabric-network';

@Injectable()
export class ContractService {
  constructor(private readonly gatewayService: GatewayService) {}

  async getContract(channelName: string, chaincodeName: string): Promise<Contract> {
    return this.gatewayService.getContract(channelName, chaincodeName);
  }

  async getContractWithNamespace(
    channelName: string,
    chaincodeName: string,
    contractName: string,
  ): Promise<Contract> {
    const network = await this.gatewayService.getNetwork(channelName);
    return network.getContract(chaincodeName, contractName);
  }

  async evaluateTransaction(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    ...args: string[]
  ): Promise<any> {
    const contract = await this.getContract(channelName, chaincodeName);
    const result = await contract.evaluateTransaction(transactionName, ...args);
    return JSON.parse(result.toString());
  }

  async submitTransaction(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    ...args: string[]
  ): Promise<any> {
    const contract = await this.getContract(channelName, chaincodeName);
    const result = await contract.submitTransaction(transactionName, ...args);
    return JSON.parse(result.toString());
  }
}
```

### Pattern 2.2: Contract with Multiple Namespaces

```typescript
// When chaincode has multiple contracts
// Chaincode structure:
// - AssetContract (namespace: "asset")
// - TransferContract (namespace: "transfer")

// Access specific contract
const assetContract = network.getContract('assetTransfer', 'asset');
const transferContract = network.getContract('assetTransfer', 'transfer');

// Submit to specific contract
const result = await assetContract.submitTransaction('CreateAsset', 'asset1', 'blue', '5', 'owner1', '300');
```

---

## 3. Transaction Proposal

**Purpose**: Create and prepare transaction proposal before endorsement.

### Pattern 3.1: Transaction Proposal with Transient Data

```typescript
// src/fabric/transaction/transaction-proposal.service.ts
import { Injectable } from '@nestjs/common';
import { Contract, Transaction } from 'fabric-network';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class TransactionProposalService {
  constructor(private readonly contractService: ContractService) {}

  async createProposal(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    args: string[],
    transientData?: Record<string, Buffer>,
  ): Promise<Transaction> {
    const contract: Contract = await this.contractService.getContract(channelName, chaincodeName);
    const transaction: Transaction = contract.createTransaction(transactionName);

    // Set transient data (not written to ledger)
    if (transientData) {
      transaction.setTransient(transientData);
    }

    return transaction;
  }

  async submitProposalWithTransient(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    args: string[],
    privateData: Record<string, any>,
  ): Promise<any> {
    // Convert private data to transient map
    const transientData: Record<string, Buffer> = {};
    for (const [key, value] of Object.entries(privateData)) {
      transientData[key] = Buffer.from(JSON.stringify(value));
    }

    const contract = await this.contractService.getContract(channelName, chaincodeName);
    const transaction = contract.createTransaction(transactionName);
    transaction.setTransient(transientData);

    const result = await transaction.submit(...args);
    return JSON.parse(result.toString());
  }
}
```

### Pattern 3.2: Transaction with Endorsing Peers

```typescript
// Specify endorsing peers for transaction
async submitWithEndorsingPeers(
  channelName: string,
  chaincodeName: string,
  transactionName: string,
  args: string[],
  endorsingPeers: string[],
): Promise<any> {
  const contract = await this.contractService.getContract(channelName, chaincodeName);
  const transaction = contract.createTransaction(transactionName);

  // Set endorsing organizations
  transaction.setEndorsingOrganizations('Org1MSP', 'Org2MSP');

  // Or set specific endorsing peers
  // transaction.setEndorsingPeers([peer1, peer2]);

  const result = await transaction.submit(...args);
  return JSON.parse(result.toString());
}
```

---

## 4. Transaction Endorsement

**Purpose**: Collect endorsements from peers according to endorsement policy.

### Pattern 4.1: Manual Endorsement Collection

```typescript
// src/fabric/transaction/endorsement.service.ts
import { Injectable } from '@nestjs/common';
import { Contract, Transaction } from 'fabric-network';

@Injectable()
export class EndorsementService {
  async getEndorsements(
    contract: Contract,
    transactionName: string,
    args: string[],
  ): Promise<any> {
    const transaction: Transaction = contract.createTransaction(transactionName);

    // Build proposal
    const proposalBytes = transaction.getProposalBytes();

    // Submit to endorsing peers (done automatically by SDK)
    // Returns when sufficient endorsements collected
    const result = await transaction.submit(...args);

    return result;
  }

  async submitWithEndorsementRetry(
    contract: Contract,
    transactionName: string,
    args: string[],
    maxRetries: number = 3,
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transaction = contract.createTransaction(transactionName);
        const result = await transaction.submit(...args);
        return JSON.parse(result.toString());
      } catch (error) {
        lastError = error;
        console.error(`Endorsement attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
  }
}
```

### Pattern 4.2: Custom Endorsement Strategy

```typescript
// Connection options with custom endorsement strategy
import { DefaultEventHandlerStrategies, DefaultQueryHandlerStrategies } from 'fabric-network';

const connectionOptions = {
  wallet: wallet,
  identity: 'user1',
  discovery: { enabled: true, asLocalhost: true },

  // Use MSPID_SCOPE_ALLFORTX strategy
  // Sends to all peers in MSP ID, requires all to endorse
  eventHandlerOptions: {
    strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX,
  },

  // Or use MSPID_SCOPE_ANYFORTX
  // Sends to all peers, requires any one to endorse
  // eventHandlerOptions: {
  //   strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ANYFORTX,
  // },
};
```

---

## 5. Transaction Commit

**Purpose**: Commit endorsed transaction to the ledger via orderer.

### Pattern 5.1: Transaction Commit with Error Handling

```typescript
// src/fabric/transaction/commit.service.ts
import { Injectable } from '@nestjs/common';
import { Contract } from 'fabric-network';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class TransactionCommitService {
  constructor(private readonly contractService: ContractService) {}

  async submitAndCommit(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    args: string[],
  ): Promise<{ txId: string; result: any }> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);
    const transaction = contract.createTransaction(transactionName);

    // Get transaction ID before submission
    const txId = transaction.getTransactionId();

    try {
      // Submit transaction (includes endorsement + commit)
      const result = await transaction.submit(...args);

      return {
        txId: txId,
        result: JSON.parse(result.toString()),
      };
    } catch (error) {
      if (error.message.includes('MVCC_READ_CONFLICT')) {
        throw new Error(`Transaction conflict: ${txId}. Retry the transaction.`);
      } else if (error.message.includes('ENDORSEMENT_POLICY_FAILURE')) {
        throw new Error(`Endorsement policy not satisfied: ${txId}`);
      } else if (error.message.includes('PHANTOM_READ_CONFLICT')) {
        throw new Error(`Phantom read conflict: ${txId}. Retry with different query.`);
      }

      throw error;
    }
  }

  async evaluateQuery(
    channelName: string,
    chaincodeName: string,
    transactionName: string,
    args: string[],
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    // Evaluate (query) - no commit, read-only
    const result = await contract.evaluateTransaction(transactionName, ...args);
    return JSON.parse(result.toString());
  }
}
```

### Pattern 5.2: Commit Listener Pattern

```typescript
// Listen for commit event
async submitWithCommitListener(
  contract: Contract,
  transactionName: string,
  args: string[],
): Promise<any> {
  const transaction = contract.createTransaction(transactionName);
  const txId = transaction.getTransactionId();

  // Set up commit listener
  const commitListener = await transaction.addCommitListener((error, event) => {
    if (error) {
      console.error(`Commit error for ${txId}:`, error);
      return;
    }

    console.log(`Transaction ${txId} committed:`, {
      transactionId: event.transactionId,
      status: event.status,
      blockNumber: event.blockNumber,
    });
  });

  try {
    const result = await transaction.submit(...args);
    return JSON.parse(result.toString());
  } finally {
    commitListener.unregister();
  }
}
```

---

## 6. Event Listener

**Purpose**: Listen for blockchain events (block, transaction, chaincode).

### Pattern 6.1: Event Listener Service

```typescript
// src/fabric/events/event-listener.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Network, ContractListener, BlockListener, TransactionEvent } from 'fabric-network';
import { GatewayService } from '../gateway/gateway.service';

@Injectable()
export class EventListenerService implements OnModuleDestroy {
  private listeners: Map<string, any> = new Map();

  constructor(private readonly gatewayService: GatewayService) {}

  async onModuleDestroy() {
    this.unregisterAll();
  }

  async addBlockListener(
    channelName: string,
    listenerName: string,
    callback: (event: any) => void,
  ): Promise<void> {
    const network = await this.gatewayService.getNetwork(channelName);

    const listener: BlockListener = async event => {
      callback({
        blockNumber: event.blockNumber.toString(),
        blockHash: event.blockData.header.data_hash,
        previousHash: event.blockData.header.previous_hash,
        transactionCount: event.blockData.data.data.length,
      });
    };

    await network.addBlockListener(listener);
    this.listeners.set(listenerName, listener);
  }

  async addTransactionListener(
    channelName: string,
    listenerName: string,
    callback: (event: TransactionEvent) => void,
  ): Promise<void> {
    const network = await this.gatewayService.getNetwork(channelName);

    const listener = async (event: TransactionEvent) => {
      callback({
        transactionId: event.transactionId,
        status: event.status,
        blockNumber: event.blockNumber.toString(),
        transactionData: event.transactionData,
      });
    };

    network.addTransactionListener(listener);
    this.listeners.set(listenerName, listener);
  }

  async addContractListener(
    channelName: string,
    chaincodeName: string,
    eventName: string,
    listenerName: string,
    callback: (event: any) => void,
  ): Promise<void> {
    const contract = await this.gatewayService.getContract(channelName, chaincodeName);

    const listener: ContractListener = async event => {
      callback({
        eventName: event.eventName,
        payload: event.payload.toString('utf8'),
        chaincodeId: event.chaincodeId,
        transactionId: event.transactionId,
      });
    };

    await contract.addContractListener(listener, { eventName: eventName });
    this.listeners.set(listenerName, listener);
  }

  unregister(listenerName: string) {
    const listener = this.listeners.get(listenerName);
    if (listener) {
      listener.unregister();
      this.listeners.delete(listenerName);
    }
  }

  unregisterAll() {
    for (const [name, listener] of this.listeners) {
      if (listener.unregister) {
        listener.unregister();
      }
    }
    this.listeners.clear();
  }
}
```

---

## 7. Block Event

**Purpose**: Listen for new blocks added to the blockchain.

### Pattern 7.1: Block Event Listener

```typescript
// src/fabric/events/block-event.service.ts
import { Injectable } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';

@Injectable()
export class BlockEventService {
  constructor(private readonly eventListenerService: EventListenerService) {}

  async startBlockListener(channelName: string) {
    await this.eventListenerService.addBlockListener(
      channelName,
      `block-listener-${channelName}`,
      event => {
        console.log('New block added:', {
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          previousHash: event.previousHash,
          transactionCount: event.transactionCount,
          timestamp: new Date().toISOString(),
        });

        // Process block (e.g., store in database, trigger webhooks)
        this.processBlock(event);
      },
    );
  }

  private async processBlock(event: any) {
    // Store block metadata in database
    // Trigger external webhooks
    // Update analytics
  }
}
```

---

## 8. Transaction Event

**Purpose**: Listen for transaction commit events.

### Pattern 8.1: Transaction Event Listener

```typescript
// src/fabric/events/transaction-event.service.ts
import { Injectable } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';

@Injectable()
export class TransactionEventService {
  constructor(private readonly eventListenerService: EventListenerService) {}

  async startTransactionListener(channelName: string) {
    await this.eventListenerService.addTransactionListener(
      channelName,
      `tx-listener-${channelName}`,
      event => {
        console.log('Transaction committed:', {
          transactionId: event.transactionId,
          status: event.status,
          blockNumber: event.blockNumber,
          isValid: event.status === 'VALID',
        });

        if (event.status === 'VALID') {
          this.handleValidTransaction(event);
        } else {
          this.handleInvalidTransaction(event);
        }
      },
    );
  }

  private async handleValidTransaction(event: any) {
    // Update application state
    // Send notifications
  }

  private async handleInvalidTransaction(event: any) {
    // Log error
    // Alert administrators
  }
}
```

---

## 9. Chaincode Event

**Purpose**: Listen for custom events emitted by chaincode.

### Pattern 9.1: Chaincode Event Listener

```typescript
// src/fabric/events/chaincode-event.service.ts
import { Injectable } from '@nestjs/common';
import { EventListenerService } from './event-listener.service';

@Injectable()
export class ChaincodeEventService {
  constructor(private readonly eventListenerService: EventListenerService) {}

  async listenForAssetTransfer(channelName: string, chaincodeName: string) {
    await this.eventListenerService.addContractListener(
      channelName,
      chaincodeName,
      'AssetTransferred', // Event name from chaincode
      'asset-transfer-listener',
      event => {
        const payload = JSON.parse(event.payload);
        console.log('Asset transferred:', {
          assetId: payload.assetId,
          from: payload.from,
          to: payload.to,
          timestamp: payload.timestamp,
        });

        // Trigger business logic
        this.notifyAssetTransfer(payload);
      },
    );
  }

  async listenForAllEvents(channelName: string, chaincodeName: string) {
    await this.eventListenerService.addContractListener(
      channelName,
      chaincodeName,
      '.*', // Regex to match all events
      'all-events-listener',
      event => {
        console.log('Chaincode event:', {
          eventName: event.eventName,
          payload: event.payload,
          txId: event.transactionId,
        });
      },
    );
  }

  private async notifyAssetTransfer(payload: any) {
    // Send email notification
    // Update frontend via WebSocket
    // Store in event log database
  }
}
```

### Pattern 9.2: Chaincode Event Emission (Chaincode Side)

```typescript
// In chaincode (for reference)
import { Context } from 'fabric-contract-api';

async transferAsset(ctx: Context, assetId: string, newOwner: string) {
  // ... transfer logic ...

  // Emit custom event
  ctx.stub.setEvent('AssetTransferred', Buffer.from(JSON.stringify({
    assetId: assetId,
    from: oldOwner,
    to: newOwner,
    timestamp: new Date().toISOString(),
  })));

  return { success: true };
}
```

---

## 10. Private Data Collection

**Purpose**: Store and retrieve private data that's not visible to all channel members.

### Pattern 10.1: Private Data Service

```typescript
// src/fabric/private-data/private-data.service.ts
import { Injectable } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class PrivateDataService {
  constructor(private readonly contractService: ContractService) {}

  async createAssetWithPrivateData(
    channelName: string,
    chaincodeName: string,
    assetId: string,
    publicData: any,
    privateData: any,
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);
    const transaction = contract.createTransaction('CreateAsset');

    // Set private data in transient map
    const transientData = {
      asset_properties: Buffer.from(JSON.stringify(privateData)),
    };
    transaction.setTransient(transientData);

    // Submit with public data as args
    const result = await transaction.submit(
      assetId,
      publicData.color,
      publicData.size,
      publicData.owner,
    );

    return JSON.parse(result.toString());
  }

  async getPrivateData(
    channelName: string,
    chaincodeName: string,
    collectionName: string,
    assetId: string,
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    // Query private data
    const result = await contract.evaluateTransaction(
      'ReadAssetPrivateDetails',
      collectionName,
      assetId,
    );

    return JSON.parse(result.toString());
  }

  async getPrivateDataHash(
    channelName: string,
    chaincodeName: string,
    collectionName: string,
    assetId: string,
  ): Promise<string> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    const result = await contract.evaluateTransaction(
      'GetAssetPrivateDataHash',
      collectionName,
      assetId,
    );

    return result.toString('hex');
  }
}
```

### Pattern 10.2: Private Data Collection Configuration

```json
// collections_config.json
[
  {
    "name": "assetCollection",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 100,
    "memberOnlyRead": true,
    "memberOnlyWrite": true,
    "endorsementPolicy": {
      "signaturePolicy": "OR('Org1MSP.member', 'Org2MSP.member')"
    }
  },
  {
    "name": "org1PrivateCollection",
    "policy": "OR('Org1MSP.member')",
    "requiredPeerCount": 0,
    "maxPeerCount": 1,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": true
  }
]
```

---

## 11. State-Based Endorsement

**Purpose**: Set endorsement policies at the key (asset) level rather than chaincode level.

### Pattern 11.1: State-Based Endorsement Service

```typescript
// src/fabric/endorsement/state-based-endorsement.service.ts
import { Injectable } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class StateBasedEndorsementService {
  constructor(private readonly contractService: ContractService) {}

  async setAssetEndorsementPolicy(
    channelName: string,
    chaincodeName: string,
    assetId: string,
    orgs: string[],
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    // Set state-based endorsement policy for this asset
    // Requires chaincode to support state-based endorsement
    const endorsementPolicy = {
      identities: orgs.map(org => ({ role: { name: 'member', mspId: org } })),
      policy: {
        'n-of': {
          n: orgs.length,
          policies: orgs.map((_, i) => ({ 'signed-by': i })),
        },
      },
    };

    const result = await contract.submitTransaction(
      'SetAssetEndorsementPolicy',
      assetId,
      JSON.stringify(endorsementPolicy),
    );

    return JSON.parse(result.toString());
  }

  async getAssetEndorsementPolicy(
    channelName: string,
    chaincodeName: string,
    assetId: string,
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);
    const result = await contract.evaluateTransaction('GetAssetEndorsementPolicy', assetId);
    return JSON.parse(result.toString());
  }
}
```

### Pattern 11.2: State-Based Endorsement in Chaincode

```typescript
// Chaincode implementation (for reference)
import { Context } from 'fabric-contract-api';
import { KeyEndorsementPolicy } from 'fabric-shim';

async setAssetStateBasedEndorsement(ctx: Context, assetId: string, orgs: string[]) {
  // Create endorsement policy: ALL of the specified orgs must endorse
  const endorsementPolicy = {
    identities: orgs.map(org => ({
      role: { name: 'member', mspId: org },
    })),
    policy: {
      'n-of': {
        n: orgs.length, // Require all orgs
        policies: orgs.map((_, i) => ({ 'signed-by': i })),
      },
    },
  };

  const epBuf = Buffer.from(JSON.stringify(endorsementPolicy));
  await ctx.stub.setStateValidationParameter(assetId, epBuf);

  return { success: true, policy: endorsementPolicy };
}
```

---

## 12. Key-Level Endorsement

**Purpose**: Require specific organizations to endorse updates to specific keys.

### Pattern 12.1: Key-Level Endorsement Service

```typescript
// src/fabric/endorsement/key-level-endorsement.service.ts
import { Injectable } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';

@Injectable()
export class KeyLevelEndorsementService {
  constructor(private readonly contractService: ContractService) {}

  async setKeyEndorsementPolicy(
    channelName: string,
    chaincodeName: string,
    key: string,
    requiredOrgs: string[],
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    // Build endorsement policy
    const policy = this.buildEndorsementPolicy(requiredOrgs);

    const result = await contract.submitTransaction(
      'SetKeyEndorsement',
      key,
      JSON.stringify(policy),
    );

    return JSON.parse(result.toString());
  }

  private buildEndorsementPolicy(orgs: string[]): any {
    // OR policy: any one of the orgs
    const orPolicy = {
      identities: orgs.map(org => ({ role: { name: 'member', mspId: org } })),
      policy: {
        '1-of': orgs.map((_, i) => ({ 'signed-by': i })),
      },
    };

    return orPolicy;
  }

  private buildAndPolicy(orgs: string[]): any {
    // AND policy: all orgs required
    return {
      identities: orgs.map(org => ({ role: { name: 'member', mspId: org } })),
      policy: {
        'n-of': {
          n: orgs.length,
          policies: orgs.map((_, i) => ({ 'signed-by': i })),
        },
      },
    };
  }

  async updateWithKeyEndorsement(
    channelName: string,
    chaincodeName: string,
    key: string,
    value: any,
  ): Promise<any> {
    const contract = await this.contractService.getContract(channelName, chaincodeName);

    // This transaction will require endorsement per key-level policy
    const result = await contract.submitTransaction('UpdateKey', key, JSON.stringify(value));

    return JSON.parse(result.toString());
  }
}
```

---

## Best Practices

### Gateway Connection
1. **Connection Pooling**: Reuse gateway connections across requests
2. **Identity Management**: Use separate identities for different users/roles
3. **Service Discovery**: Enable discovery for dynamic peer/orderer updates
4. **Timeouts**: Configure appropriate timeouts for endorsement and commit
5. **Error Handling**: Handle connection errors gracefully with retries

### Transaction Management
1. **Idempotency**: Design transactions to be idempotent (safe to retry)
2. **MVCC Conflicts**: Handle read-write conflicts with retry logic
3. **Transient Data**: Use transient map for sensitive data (not written to ledger)
4. **Transaction IDs**: Log transaction IDs for auditing and debugging
5. **Endorsement Retry**: Implement exponential backoff for endorsement failures

### Event Listeners
1. **Cleanup**: Always unregister listeners when no longer needed
2. **Error Handling**: Handle event processing errors without crashing
3. **Idempotent Processing**: Ensure event handlers are idempotent
4. **Checkpointing**: Track processed events to avoid duplicates after restart
5. **Performance**: Avoid blocking operations in event callbacks

### Private Data
1. **Collection Design**: Design collections based on data sensitivity and access requirements
2. **Block-to-Live**: Set appropriate TTL for private data (0 = never purge)
3. **Endorsement Policy**: Align collection policy with endorsement requirements
4. **Hash Verification**: Use private data hash for cross-org verification
5. **Purge Management**: Monitor and manage private data purge lifecycle

---

## Common Issues

### Issue 1: Gateway Connection Timeout
**Symptom**: "Failed to connect to gateway: timeout"
**Solution**: Check peer/orderer connectivity, verify TLS certificates, increase timeout

### Issue 2: Endorsement Policy Failure
**Symptom**: "Transaction proposal was bad: endorsement failure"
**Solution**: Verify chaincode is installed on required peers, check endorsement policy

### Issue 3: MVCC Read Conflict
**Symptom**: "MVCC_READ_CONFLICT: read-write conflict"
**Solution**: Retry transaction, reduce concurrent updates to same key

### Issue 4: Private Data Not Found
**Symptom**: "Private data not found in collection"
**Solution**: Verify peer is authorized member of collection, check collection configuration

### Issue 5: Event Listener Not Triggering
**Symptom**: "Events not received"
**Solution**: Verify peer event service is enabled, check event hub connectivity, ensure listener registered before transaction

---

## Testing Patterns

### Pattern: Gateway Integration Test

```typescript
// src/fabric/gateway/gateway.service.spec.ts
import { Test } from '@nestjs/testing';
import { GatewayService } from './gateway.service';

describe('GatewayService', () => {
  let service: GatewayService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GatewayService],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
  });

  it('should connect to gateway', async () => {
    await service.initGateway();
    const gateway = await service.getGateway();
    expect(gateway).toBeDefined();
  });

  it('should get network', async () => {
    const network = await service.getNetwork('mychannel');
    expect(network).toBeDefined();
    expect(network.getChannel().getName()).toBe('mychannel');
  });

  it('should get contract', async () => {
    const contract = await service.getContract('mychannel', 'assetTransfer');
    expect(contract).toBeDefined();
  });

  afterAll(async () => {
    await service.disconnect();
  });
});
```

---

**Related Specialists**:
- Fabric Network Setup Specialist (network infrastructure)
- Fabric Chaincode Lifecycle Specialist (chaincode deployment)
- Chaincode Development Specialist (smart contract implementation)
