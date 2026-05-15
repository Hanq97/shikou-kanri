# Fabric SDK Transactions & Events Specialist

**Purpose**: Comprehensive guide for Hyperledger Fabric transaction execution, contract operations, event handling, and logging in NestJS applications.

**Scope**: 9 patterns covering network contract access, transaction submission, transaction evaluation, transaction builder, endorsing peer selection, transient data, event checkpointing, event replay, and client logging.

**Target Audience**: NestJS developers implementing Fabric SDK transaction and event management for blockchain applications.

---

## Table of Contents

1. [Contract Access](#1-contract-access)
2. [Transaction Execution](#2-transaction-execution)
3. [Advanced Transaction Features](#3-advanced-transaction-features)
4. [Event Management](#4-event-management)
5. [Logging](#5-logging)
6. [NestJS Integration](#6-nestjs-integration)
7. [Testing](#7-testing)

---

## 1. Contract Access

### 1.1 Network Get Contract

**Pattern**: network-get-contract

Access smart contract instances from the Fabric network.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gateway, Network, Contract } from 'fabric-network';

@Injectable()
export class FabricContractService {
  private readonly logger = new Logger(FabricContractService.name);
  private gateway: Gateway;
  private network: Network;
  private contracts: Map<string, Contract> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get network instance
   */
  async getNetwork(channelName: string): Promise<Network> {
    try {
      if (!this.gateway) {
        throw new Error('Gateway not initialized');
      }

      if (!this.network) {
        this.network = await this.gateway.getNetwork(channelName);
        this.logger.log(`Connected to channel: ${channelName}`);
      }

      return this.network;
    } catch (error) {
      this.logger.error(`Failed to get network ${channelName}`, error.stack);
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  async getContract(
    channelName: string,
    chaincodeName: string,
    contractName?: string,
  ): Promise<Contract> {
    try {
      const cacheKey = `${channelName}:${chaincodeName}:${contractName || 'default'}`;

      if (this.contracts.has(cacheKey)) {
        return this.contracts.get(cacheKey);
      }

      const network = await this.getNetwork(channelName);
      const contract = contractName
        ? network.getContract(chaincodeName, contractName)
        : network.getContract(chaincodeName);

      this.contracts.set(cacheKey, contract);
      this.logger.log(`Contract accessed: ${chaincodeName}`);

      return contract;
    } catch (error) {
      this.logger.error(`Failed to get contract ${chaincodeName}`, error.stack);
      throw error;
    }
  }

  setGateway(gateway: Gateway): void {
    this.gateway = gateway;
  }

  clearCache(): void {
    this.contracts.clear();
    this.network = null;
  }
}
```

---

## 2. Transaction Execution

### 2.1 Submit Transaction

**Pattern**: contract-submit-transaction

Submit transactions that modify the ledger state.

#### Implementation

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';

export interface SubmitTransactionRequest {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
  transientData?: Record<string, Buffer>;
}

@Injectable()
export class TransactionSubmitService {
  private readonly logger = new Logger(TransactionSubmitService.name);

  constructor(private readonly contractService: FabricContractService) {}

  async submitTransaction(request: SubmitTransactionRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args, transientData } = request;

    try {
      this.logger.log(`Submitting transaction: ${transactionName} on ${chaincodeName}`);

      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);

      let result: Buffer;
      if (transientData) {
        const transaction = contract.createTransaction(transactionName);
        transaction.setTransient(transientData);
        result = await transaction.submit(...args);
      } else {
        result = await contract.submitTransaction(transactionName, ...args);
      }

      this.logger.log(`Transaction ${transactionName} submitted successfully`);
      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to submit transaction ${transactionName}`, error.stack);
      throw new HttpException(`Transaction submission failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async submitTransactionWithRetry(request: SubmitTransactionRequest, maxRetries: number = 3): Promise<string> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.submitTransaction(request);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Transaction attempt ${attempt}/${maxRetries} failed: ${error.message}`);

        if (attempt < maxRetries) {
          // exponential backoff delay
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
```

#### Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { TransactionSubmitService } from '../services/transaction-submit.service';

export class SubmitTransactionDto {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
}

@Controller('fabric/transaction')
export class TransactionController {
  constructor(private readonly submitService: TransactionSubmitService) {}

  @Post('submit')
  async submitTransaction(@Body() dto: SubmitTransactionDto) {
    const result = await this.submitService.submitTransaction(dto);
    return { success: true, result };
  }
}
```

---

### 2.2 Evaluate Transaction

**Pattern**: contract-evaluate-transaction

Evaluate transactions (queries) without modifying the ledger state.

#### Implementation

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';

export interface EvaluateTransactionRequest {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
}

@Injectable()
export class TransactionEvaluateService {
  private readonly logger = new Logger(TransactionEvaluateService.name);

  constructor(private readonly contractService: FabricContractService) {}

  async evaluateTransaction(request: EvaluateTransactionRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args } = request;

    try {
      this.logger.log(`Evaluating transaction: ${transactionName} on ${chaincodeName}`);

      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);
      const result = await contract.evaluateTransaction(transactionName, ...args);

      this.logger.log(`Transaction ${transactionName} evaluated successfully`);
      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to evaluate transaction ${transactionName}`, error.stack);
      throw new HttpException(`Transaction evaluation failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

---

### 2.3 Transaction Builder Pattern

**Pattern**: transaction-builder-pattern

Use transaction builder for advanced transaction customization.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';
import { Transaction } from 'fabric-network';

export interface TransactionBuilderRequest {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
  endorsingOrgs?: string[];
  transientData?: Record<string, Buffer>;
}

@Injectable()
export class TransactionBuilderService {
  private readonly logger = new Logger(TransactionBuilderService.name);

  constructor(private readonly contractService: FabricContractService) {}

  async buildAndSubmitTransaction(request: TransactionBuilderRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args, endorsingOrgs, transientData } = request;

    try {
      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);
      const transaction: Transaction = contract.createTransaction(transactionName);

      if (endorsingOrgs && endorsingOrgs.length > 0) {
        transaction.setEndorsingOrganizations(...endorsingOrgs);
        this.logger.log(`Endorsing orgs set: ${endorsingOrgs.join(', ')}`);
      }

      if (transientData) {
        transaction.setTransient(transientData);
        this.logger.log('Transient data set');
      }

      const result = await transaction.submit(...args);
      this.logger.log(`Transaction ${transactionName} submitted via builder`);

      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to build and submit transaction ${transactionName}`, error.stack);
      throw error;
    }
  }

  async buildAndEvaluateTransaction(request: TransactionBuilderRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args, endorsingOrgs } = request;

    try {
      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);
      const transaction: Transaction = contract.createTransaction(transactionName);

      if (endorsingOrgs && endorsingOrgs.length > 0) {
        transaction.setEndorsingOrganizations(...endorsingOrgs);
      }

      const result = await transaction.evaluate(...args);
      this.logger.log(`Transaction ${transactionName} evaluated via builder`);

      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to build and evaluate transaction ${transactionName}`, error.stack);
      throw error;
    }
  }
}
```

---

## 3. Advanced Transaction Features

### 3.1 Endorsing Peer Selection

**Pattern**: endorsing-peers-selection

Control which organizations endorse transactions.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';
import { ConfigService } from '@nestjs/config';

export interface EndorsingPeerRequest {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
  requiredOrgs: string[];
}

@Injectable()
export class EndorsingPeerService {
  private readonly logger = new Logger(EndorsingPeerService.name);

  constructor(
    private readonly contractService: FabricContractService,
    private readonly configService: ConfigService,
  ) {}

  async submitWithEndorsers(request: EndorsingPeerRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args, requiredOrgs } = request;

    try {
      this.logger.log(`Submitting ${transactionName} with endorsers: ${requiredOrgs.join(', ')}`);

      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);
      const transaction = contract.createTransaction(transactionName);
      transaction.setEndorsingOrganizations(...requiredOrgs);

      const result = await transaction.submit(...args);
      this.logger.log(`Transaction endorsed by: ${requiredOrgs.join(', ')}`);

      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to submit with endorsers: ${error.message}`, error.stack);
      throw error;
    }
  }

  getDefaultEndorsers(): string[] {
    const endorsers = this.configService.get<string>('FABRIC_DEFAULT_ENDORSERS', 'Org1MSP,Org2MSP');
    return endorsers.split(',').map((org) => org.trim());
  }
}
```

---

### 3.2 Transient Data Submission

**Pattern**: transient-data-submission

Submit sensitive data that should not be stored on the ledger.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';

export interface TransientDataRequest {
  channelName: string;
  chaincodeName: string;
  contractName?: string;
  transactionName: string;
  args: string[];
  transientData: Record<string, string>;
}

@Injectable()
export class TransientDataService {
  private readonly logger = new Logger(TransientDataService.name);

  constructor(private readonly contractService: FabricContractService) {}

  async submitWithTransientData(request: TransientDataRequest): Promise<string> {
    const { channelName, chaincodeName, contractName, transactionName, args, transientData } = request;

    try {
      this.logger.log(`Submitting ${transactionName} with transient data keys: ${Object.keys(transientData).join(', ')}`);

      const contract = await this.contractService.getContract(channelName, chaincodeName, contractName);

      const transientMap: Record<string, Buffer> = {};
      for (const [key, value] of Object.entries(transientData)) {
        transientMap[key] = Buffer.from(value);
      }

      const transaction = contract.createTransaction(transactionName);
      transaction.setTransient(transientMap);

      const result = await transaction.submit(...args);
      this.logger.log(`Transaction ${transactionName} submitted with transient data`);

      return result.toString();
    } catch (error) {
      this.logger.error(`Failed to submit with transient data: ${error.message}`, error.stack);
      throw error;
    }
  }

  async submitPrivateAsset(
    channelName: string,
    chaincodeName: string,
    assetId: string,
    color: string,
    size: number,
    price: number,
    ownerSSN: string,
  ): Promise<string> {
    return this.submitWithTransientData({
      channelName,
      chaincodeName,
      transactionName: 'CreateAssetWithSensitiveData',
      args: [assetId, color, size.toString()],
      transientData: {
        price: price.toString(),
        ownerSSN: ownerSSN,
      },
    });
  }
}
```

---

## 4. Event Management

### 4.1 Event Checkpoint

**Pattern**: event-checkpoint

Create checkpoints for event listeners to resume from failures.

#### Implementation

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';
import { ContractListener, ContractEvent } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EventCheckpointService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventCheckpointService.name);
  private listeners: Map<string, ContractListener> = new Map();
  private checkpointPath: string;

  constructor(private readonly contractService: FabricContractService) {
    this.checkpointPath = path.join(process.cwd(), 'event-checkpoints');
    if (!fs.existsSync(this.checkpointPath)) {
      fs.mkdirSync(this.checkpointPath, { recursive: true });
    }
  }

  async onModuleInit() {}

  async onModuleDestroy() {
    for (const [name, listener] of this.listeners) {
      try {
        listener();
        this.logger.log(`Removed event listener: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to remove listener ${name}`, error.stack);
      }
    }
  }

  async addEventListener(
    channelName: string,
    chaincodeName: string,
    eventName: string,
    callback: (event: ContractEvent) => void,
  ): Promise<void> {
    try {
      const contract = await this.contractService.getContract(channelName, chaincodeName);
      const listenerName = `${channelName}:${chaincodeName}:${eventName}`;
      const startBlock = this.getCheckpoint(listenerName);

      this.logger.log(`Adding event listener for ${eventName} from block ${startBlock}`);

      const listener = await contract.addContractListener(
        eventName,
        async (event) => {
          callback(event);
          this.saveCheckpoint(listenerName, event.blockNumber.toString());
        },
        { startBlock: startBlock ? BigInt(startBlock) : undefined },
      );

      this.listeners.set(listenerName, listener);
      this.logger.log(`Event listener added: ${listenerName}`);
    } catch (error) {
      this.logger.error(`Failed to add event listener for ${eventName}`, error.stack);
      throw error;
    }
  }

  private getCheckpoint(listenerName: string): string | null {
    try {
      const checkpointFile = path.join(this.checkpointPath, `${listenerName.replace(/:/g, '_')}.checkpoint`);

      if (fs.existsSync(checkpointFile)) {
        const blockNumber = fs.readFileSync(checkpointFile, 'utf8').trim();
        this.logger.log(`Checkpoint found for ${listenerName}: block ${blockNumber}`);
        return blockNumber;
      }
    } catch (error) {
      this.logger.error(`Failed to read checkpoint for ${listenerName}`, error.stack);
    }

    return null;
  }

  private saveCheckpoint(listenerName: string, blockNumber: string): void {
    try {
      const checkpointFile = path.join(this.checkpointPath, `${listenerName.replace(/:/g, '_')}.checkpoint`);
      fs.writeFileSync(checkpointFile, blockNumber, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to save checkpoint for ${listenerName}`, error.stack);
    }
  }

  removeEventListener(channelName: string, chaincodeName: string, eventName: string): void {
    const listenerName = `${channelName}:${chaincodeName}:${eventName}`;
    const listener = this.listeners.get(listenerName);

    if (listener) {
      listener();
      this.listeners.delete(listenerName);
      this.logger.log(`Event listener removed: ${listenerName}`);
    }
  }
}
```

---

### 4.2 Event Replay

**Pattern**: event-replay

Replay events from a specific block for recovery or audit.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricContractService } from './fabric-contract.service';
import { ContractEvent } from 'fabric-network';

export interface EventReplayRequest {
  channelName: string;
  chaincodeName: string;
  eventName: string;
  startBlock: number;
  endBlock?: number;
  callback: (event: ContractEvent) => void;
}

@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(private readonly contractService: FabricContractService) {}

  async replayEvents(request: EventReplayRequest): Promise<void> {
    const { channelName, chaincodeName, eventName, startBlock, endBlock, callback } = request;

    try {
      this.logger.log(`Replaying events ${eventName} from block ${startBlock}${endBlock ? ` to ${endBlock}` : ''}`);

      const contract = await this.contractService.getContract(channelName, chaincodeName);
      let eventsProcessed = 0;

      const listener = await contract.addContractListener(
        eventName,
        async (event) => {
          if (endBlock && Number(event.blockNumber) > endBlock) {
            listener();
            this.logger.log(`Event replay complete. Processed ${eventsProcessed} events`);
            return;
          }

          callback(event);
          eventsProcessed++;
        },
        { startBlock: BigInt(startBlock) },
      );

      this.logger.log(`Event replay started for ${eventName}`);
    } catch (error) {
      this.logger.error(`Failed to replay events for ${eventName}`, error.stack);
      throw error;
    }
  }

  async replayAndCollect(
    channelName: string,
    chaincodeName: string,
    eventName: string,
    startBlock: number,
    endBlock: number,
  ): Promise<ContractEvent[]> {
    const events: ContractEvent[] = [];

    await this.replayEvents({
      channelName,
      chaincodeName,
      eventName,
      startBlock,
      endBlock,
      callback: (event) => events.push(event),
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    this.logger.log(`Collected ${events.length} events from replay`);

    return events;
  }
}
```

---

## 5. Logging

### 5.1 Fabric Client Logging

**Pattern**: fabric-client-logging

Integrate Fabric SDK operations with NestJS logging.

#### Implementation

```typescript
import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FabricLogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

@Injectable()
export class FabricLoggingService {
  private readonly logger = new Logger(FabricLoggingService.name);
  private logEntries: FabricLogEntry[] = [];
  private maxEntries: number;

  constructor(private readonly configService: ConfigService) {
    this.maxEntries = this.configService.get<number>('FABRIC_MAX_LOG_ENTRIES', 1000);
  }

  logTransactionSubmit(transactionName: string, chaincodeName: string, args: string[]): void {
    const entry: FabricLogEntry = {
      timestamp: new Date(),
      level: 'log',
      context: 'TransactionSubmit',
      message: `Submitting ${transactionName} on ${chaincodeName}`,
      data: { args },
    };

    this.addLogEntry(entry);
    this.logger.log(entry.message, entry.context);
  }

  logTransactionSuccess(transactionName: string, chaincodeName: string, duration: number): void {
    const entry: FabricLogEntry = {
      timestamp: new Date(),
      level: 'log',
      context: 'TransactionSuccess',
      message: `Transaction ${transactionName} succeeded in ${duration}ms`,
      data: { chaincodeName, duration },
    };

    this.addLogEntry(entry);
    this.logger.log(entry.message, entry.context);
  }

  logTransactionFailure(transactionName: string, chaincodeName: string, error: Error): void {
    const entry: FabricLogEntry = {
      timestamp: new Date(),
      level: 'error',
      context: 'TransactionFailure',
      message: `Transaction ${transactionName} failed: ${error.message}`,
      data: { chaincodeName, error: error.stack },
    };

    this.addLogEntry(entry);
    this.logger.error(entry.message, error.stack, entry.context);
  }

  logEventReceived(eventName: string, blockNumber: string, transactionId: string): void {
    const entry: FabricLogEntry = {
      timestamp: new Date(),
      level: 'log',
      context: 'EventReceived',
      message: `Event ${eventName} received`,
      data: { blockNumber, transactionId },
    };

    this.addLogEntry(entry);
    this.logger.log(`${entry.message} (block: ${blockNumber}, tx: ${transactionId})`, entry.context);
  }

  private addLogEntry(entry: FabricLogEntry): void {
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries.shift();
    }
  }

  getRecentLogs(count: number = 100): FabricLogEntry[] {
    return this.logEntries.slice(-count);
  }

  getLogsByContext(context: string): FabricLogEntry[] {
    return this.logEntries.filter((entry) => entry.context === context);
  }

  clearLogs(): void {
    this.logEntries = [];
    this.logger.log('Log buffer cleared');
  }
}
```

---

## 6. NestJS Integration

### 6.1 Module Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FabricContractService } from './services/fabric-contract.service';
import { TransactionSubmitService } from './services/transaction-submit.service';
import { TransactionEvaluateService } from './services/transaction-evaluate.service';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { EndorsingPeerService } from './services/endorsing-peer.service';
import { TransientDataService } from './services/transient-data.service';
import { EventCheckpointService } from './services/event-checkpoint.service';
import { EventReplayService } from './services/event-replay.service';
import { FabricLoggingService } from './services/fabric-logging.service';
import { TransactionController } from './controllers/transaction.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    FabricContractService,
    TransactionSubmitService,
    TransactionEvaluateService,
    TransactionBuilderService,
    EndorsingPeerService,
    TransientDataService,
    EventCheckpointService,
    EventReplayService,
    FabricLoggingService,
  ],
  controllers: [TransactionController],
  exports: [FabricContractService, TransactionSubmitService, TransactionEvaluateService, FabricLoggingService],
})
export class FabricTransactionsModule {}
```

---

## 7. Testing

### 7.1 Unit Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionSubmitService } from '../services/transaction-submit.service';
import { FabricContractService } from '../services/fabric-contract.service';

describe('TransactionSubmitService', () => {
  let service: TransactionSubmitService;
  let contractService: FabricContractService;

  beforeEach(async () => {
    const mockContractService = {
      getContract: jest.fn().mockResolvedValue({
        submitTransaction: jest.fn().mockResolvedValue(Buffer.from('success')),
        createTransaction: jest.fn().mockReturnValue({
          setTransient: jest.fn(),
          submit: jest.fn().mockResolvedValue(Buffer.from('success')),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSubmitService,
        { provide: FabricContractService, useValue: mockContractService },
      ],
    }).compile();

    service = module.get<TransactionSubmitService>(TransactionSubmitService);
    contractService = module.get<FabricContractService>(FabricContractService);
  });

  it('should submit transaction successfully', async () => {
    const result = await service.submitTransaction({
      channelName: 'mychannel',
      chaincodeName: 'asset-transfer',
      transactionName: 'CreateAsset',
      args: ['asset1', 'blue', '10'],
    });

    expect(result).toBe('success');
    expect(contractService.getContract).toHaveBeenCalledWith('mychannel', 'asset-transfer', undefined);
  });
});
```

---

## Summary

This specialist covers 9 comprehensive patterns for Fabric SDK transaction and event management:

1. **Network Get Contract**: Access contract instances from network
2. **Submit Transaction**: Modify ledger state
3. **Evaluate Transaction**: Query without state modification
4. **Transaction Builder**: Advanced transaction customization
5. **Endorsing Peer Selection**: Control transaction endorsement
6. **Transient Data Submission**: Submit sensitive data off-ledger
7. **Event Checkpoint**: Resume event listening after failures
8. **Event Replay**: Replay historical events
9. **Fabric Client Logging**: Integrated NestJS logging

All patterns include NestJS integration, error handling, logging, and production-ready implementations.
