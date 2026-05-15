# Fabric SDK Client & Gateway Specialist

## Purpose
Expert in Hyperledger Fabric Node.js SDK client-side patterns including Gateway connection management, network configuration, connection options, timeout settings, query/commit handlers, retry strategies, and error handling for NestJS applications.

## Specialization Areas
1. **Fabric Network Import**: Importing fabric-network module components
2. **Gateway Connection**: Connecting and disconnecting from Fabric network
3. **Connection Options**: Gateway connection configuration
4. **Discovery Options**: Service discovery settings
5. **Timeout Configuration**: Commit and endorsement timeouts
6. **Query Handlers**: Custom query handlers
7. **Commit Handlers**: Custom commit handlers
8. **Retry Strategy**: Transaction retry logic
9. **Error Handling**: Fabric SDK error codes and handling
10. **Client Logging**: Fabric client logging configuration

## Related Specialists
- **Fabric Gateway & Transactions Specialist**: Transaction submission patterns (server-side perspective)
- **Fabric SDK Wallet & Identity Specialist**: Wallet and identity management
- **Fabric SDK Transactions & Events Specialist**: Contract operations and events

---

## Pattern 1: Fabric Network Import

### Overview
Import necessary components from the `fabric-network` module for client applications.

### TypeScript Import Example

```typescript
// Core Gateway components
import {
  Gateway,
  GatewayOptions,
  Network,
  Contract,
  Transaction,
  Wallet,
  Wallets,
  Identity,
  X509Identity,
} from 'fabric-network';

// Event listeners
import {
  ContractListener,
  BlockListener,
  TransactionListener,
  EventType,
  ContractEvent,
  BlockEvent,
  TransactionEvent,
} from 'fabric-network';

// Query and commit handlers
import {
  QueryHandlerFactory,
  CommitHandlerFactory,
  DefaultQueryHandlerStrategies,
  DefaultCommitHandlerStrategies,
} from 'fabric-network';

// Error handling
import {
  FabricError,
  TimeoutError,
} from 'fabric-network';
```

### NestJS Service with Imports

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Gateway,
  GatewayOptions,
  Network,
  Wallets,
  DefaultEventHandlerStrategies,
  DefaultQueryHandlerStrategies,
} from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FabricGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricGatewayService.name);
  private gateway: Gateway;
  private wallet: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing Fabric Gateway...');
    await this.initializeGateway();
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Fabric Gateway...');
    await this.disconnect();
  }

  private async initializeGateway() {
    // Implementation in next patterns
  }

  private async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
      this.logger.log('Gateway disconnected successfully');
    }
  }
}
```

### Key Points
- Import only what you need to reduce bundle size
- Use TypeScript types for better IDE support
- Common imports: Gateway, Wallets, Network, Contract
- Event-related imports for listeners
- Handler imports for custom strategies

---

## Pattern 2: Gateway Connection

### Overview
Connect to Fabric network using Gateway API with proper lifecycle management.

### Connection Pattern

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gateway, GatewayOptions, Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FabricGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricGatewayService.name);
  private gateway: Gateway;
  private wallet: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to Fabric Gateway
   */
  async connect(): Promise<void> {
    try {
      // 1. Load connection profile
      const ccpPath = path.resolve(
        __dirname,
        '..',
        '..',
        'config',
        'connection-org1.json',
      );
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // 2. Load wallet
      const walletPath = path.join(process.cwd(), 'wallet');
      this.wallet = await Wallets.newFileSystemWallet(walletPath);

      // 3. Create gateway instance
      this.gateway = new Gateway();

      // 4. Define connection options
      const connectionOptions: GatewayOptions = {
        wallet: this.wallet,
        identity: this.configService.get('FABRIC_IDENTITY', 'user1'),
        discovery: {
          enabled: true,
          asLocalhost: this.configService.get('FABRIC_DISCOVERY_AS_LOCALHOST', true),
        },
      };

      // 5. Connect to gateway
      await this.gateway.connect(ccp, connectionOptions);

      this.logger.log('Successfully connected to Fabric Gateway');
    } catch (error) {
      this.logger.error('Failed to connect to Fabric Gateway', error.stack);
      throw error;
    }
  }

  /**
   * Disconnect from Fabric Gateway
   */
  async disconnect(): Promise<void> {
    if (this.gateway) {
      try {
        await this.gateway.disconnect();
        this.logger.log('Successfully disconnected from Fabric Gateway');
      } catch (error) {
        this.logger.error('Error disconnecting from Gateway', error.stack);
      }
    }
  }

  /**
   * Get gateway instance
   */
  getGateway(): Gateway {
    if (!this.gateway) {
      throw new Error('Gateway not initialized. Call connect() first.');
    }
    return this.gateway;
  }

  /**
   * Get network instance
   */
  async getNetwork(channelName: string) {
    const gateway = this.getGateway();
    return await gateway.getNetwork(channelName);
  }
}
```

### Connection Profile (connection-org1.json)

```json
{
  "name": "test-network-org1",
  "version": "1.0.0",
  "client": {
    "organization": "Org1",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        },
        "orderer": "300"
      }
    }
  },
  "organizations": {
    "Org1": {
      "mspid": "Org1MSP",
      "peers": ["peer0.org1.example.com"],
      "certificateAuthorities": ["ca.org1.example.com"]
    }
  },
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com",
        "hostnameOverride": "peer0.org1.example.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://localhost:7054",
      "caName": "ca-org1",
      "tlsCACerts": {
        "pem": ["-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"]
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
```

### Key Points
- Load connection profile (CCP) from JSON file
- Initialize wallet before connecting
- Use GatewayOptions to configure connection
- Enable service discovery for dynamic peer selection
- Call `disconnect()` in OnModuleDestroy to clean up resources
- Handle connection errors gracefully

---

## Pattern 3: Connection Options

### Overview
Configure Gateway connection with various options including discovery, event handling, and identity.

### Comprehensive Connection Options

```typescript
import {
  Gateway,
  GatewayOptions,
  DefaultEventHandlerStrategies,
  DefaultQueryHandlerStrategies,
} from 'fabric-network';

/**
 * Advanced connection options
 */
async connect(): Promise<void> {
  const connectionOptions: GatewayOptions = {
    // Wallet and identity
    wallet: this.wallet,
    identity: 'user1',

    // Service discovery
    discovery: {
      enabled: true,
      asLocalhost: true, // Use localhost for development
    },

    // Event handler strategies
    eventHandlerOptions: {
      commitTimeout: 300, // 300 seconds
      endorseTimeout: 30,  // 30 seconds
      strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX,
    },

    // Query handler
    queryHandlerOptions: {
      strategy: DefaultQueryHandlerStrategies.MSPID_SCOPE_SINGLE,
      timeout: 30,
    },

    // Client TLS identity
    clientTlsIdentity: 'tlsIdentity', // Optional

    // TLS enabled/disabled
    tlsInfo: {
      certificate: 'cert.pem',
      key: 'key.pem',
    },
  };

  await this.gateway.connect(ccp, connectionOptions);
}
```

### Connection Options Interface

```typescript
interface FabricConnectionOptions extends GatewayOptions {
  wallet: Wallet;
  identity: string;
  discovery?: {
    enabled: boolean;
    asLocalhost: boolean;
  };
  eventHandlerOptions?: {
    commitTimeout?: number;
    endorseTimeout?: number;
    strategy?: any;
  };
  queryHandlerOptions?: {
    strategy?: any;
    timeout?: number;
  };
  clientTlsIdentity?: string;
}
```

### Environment-Based Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayOptions } from 'fabric-network';

@Injectable()
export class FabricConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConnectionOptions(wallet: any): GatewayOptions {
    return {
      wallet,
      identity: this.configService.get('FABRIC_IDENTITY', 'user1'),
      discovery: {
        enabled: this.configService.get('FABRIC_DISCOVERY_ENABLED', true),
        asLocalhost: this.configService.get('FABRIC_DISCOVERY_AS_LOCALHOST', true),
      },
      eventHandlerOptions: {
        commitTimeout: this.configService.get('FABRIC_COMMIT_TIMEOUT', 300),
        endorseTimeout: this.configService.get('FABRIC_ENDORSE_TIMEOUT', 30),
      },
      queryHandlerOptions: {
        timeout: this.configService.get('FABRIC_QUERY_TIMEOUT', 30),
      },
    };
  }
}
```

### .env Configuration

```bash
# Fabric Gateway Configuration
FABRIC_IDENTITY=user1
FABRIC_DISCOVERY_ENABLED=true
FABRIC_DISCOVERY_AS_LOCALHOST=true
FABRIC_COMMIT_TIMEOUT=300
FABRIC_ENDORSE_TIMEOUT=30
FABRIC_QUERY_TIMEOUT=30
```

### Key Points
- `discovery.enabled`: Enable/disable service discovery
- `discovery.asLocalhost`: Use localhost for peer addresses (development)
- `eventHandlerOptions.commitTimeout`: Max time to wait for commit (seconds)
- `eventHandlerOptions.endorseTimeout`: Max time to wait for endorsement
- `queryHandlerOptions.timeout`: Max time for query operations
- Use ConfigService for environment-based configuration

---

## Pattern 4: Discovery Options

### Overview
Configure service discovery to dynamically find and select peers for endorsement and queries.

### Discovery Configuration

```typescript
/**
 * Service discovery options
 */
const discoveryOptions = {
  // Enable service discovery
  enabled: true,

  // Use localhost for peer addresses (development)
  asLocalhost: true,
};

const connectionOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  discovery: discoveryOptions,
};
```

### Production Discovery Configuration

```typescript
/**
 * Production discovery (no localhost)
 */
async connectProduction(): Promise<void> {
  const connectionOptions: GatewayOptions = {
    wallet: this.wallet,
    identity: 'user1',
    discovery: {
      enabled: true,
      asLocalhost: false, // Use actual peer addresses
    },
  };

  await this.gateway.connect(ccp, connectionOptions);
}
```

### Discovery Benefits
- **Dynamic Peer Selection**: Automatically select available peers
- **Endorsement Policy Matching**: Find peers that satisfy endorsement policy
- **Failure Handling**: Automatically retry with different peers
- **Load Balancing**: Distribute queries across available peers

### Manual Peer Selection (No Discovery)

```typescript
/**
 * Disable discovery for manual peer selection
 */
async connectManual(): Promise<void> {
  const connectionOptions: GatewayOptions = {
    wallet: this.wallet,
    identity: 'user1',
    discovery: {
      enabled: false, // Manual peer selection
    },
  };

  await this.gateway.connect(ccp, connectionOptions);
}
```

### Key Points
- `enabled: true`: Use service discovery (recommended)
- `asLocalhost: true`: Development mode (localhost addresses)
- `asLocalhost: false`: Production mode (actual addresses)
- Discovery enabled = automatic peer selection
- Discovery disabled = use peers from connection profile

---

## Pattern 5: Timeout Configuration

### Overview
Configure commit and endorsement timeouts to handle network latency and transaction duration.

### Timeout Options

```typescript
const connectionOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  discovery: { enabled: true, asLocalhost: true },

  eventHandlerOptions: {
    // Commit timeout: Max time to wait for transaction commit
    commitTimeout: 300, // 300 seconds (5 minutes)

    // Endorsement timeout: Max time to wait for endorsement
    endorseTimeout: 30, // 30 seconds
  },

  queryHandlerOptions: {
    // Query timeout: Max time for query operations
    timeout: 30, // 30 seconds
  },
};
```

### Environment-Based Timeouts

```typescript
@Injectable()
export class FabricTimeoutService {
  constructor(private readonly configService: ConfigService) {}

  getTimeoutOptions() {
    return {
      eventHandlerOptions: {
        commitTimeout: this.getCommitTimeout(),
        endorseTimeout: this.getEndorseTimeout(),
      },
      queryHandlerOptions: {
        timeout: this.getQueryTimeout(),
      },
    };
  }

  private getCommitTimeout(): number {
    return this.configService.get('FABRIC_COMMIT_TIMEOUT', 300);
  }

  private getEndorseTimeout(): number {
    return this.configService.get('FABRIC_ENDORSE_TIMEOUT', 30);
  }

  private getQueryTimeout(): number {
    return this.configService.get('FABRIC_QUERY_TIMEOUT', 30);
  }
}
```

### Timeout Recommendations

```typescript
// Development environment
const devTimeouts = {
  commitTimeout: 300,   // 5 minutes (generous for slow dev networks)
  endorseTimeout: 30,   // 30 seconds
  queryTimeout: 30,     // 30 seconds
};

// Production environment
const prodTimeouts = {
  commitTimeout: 60,    // 1 minute (tighter for production)
  endorseTimeout: 10,   // 10 seconds
  queryTimeout: 10,     // 10 seconds
};

// High-volume environment
const highVolumeTimeouts = {
  commitTimeout: 30,    // 30 seconds (fast)
  endorseTimeout: 5,    // 5 seconds
  queryTimeout: 5,      // 5 seconds
};
```

### Handling Timeout Errors

```typescript
import { TimeoutError } from 'fabric-network';

async submitTransaction(
  channelName: string,
  chaincodeName: string,
  functionName: string,
  ...args: string[]
): Promise<Buffer> {
  try {
    const network = await this.gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    return await contract.submitTransaction(functionName, ...args);
  } catch (error) {
    if (error instanceof TimeoutError) {
      this.logger.error('Transaction timeout', error.message);
      throw new Error('Transaction timed out. Please try again.');
    }
    throw error;
  }
}
```

### Key Points
- `commitTimeout`: Max time for transaction to commit (default: 300s)
- `endorseTimeout`: Max time for endorsement (default: 30s)
- `queryTimeout`: Max time for queries (default: 30s)
- Adjust timeouts based on network performance
- Handle TimeoutError gracefully
- Production should have tighter timeouts than development

---

## Pattern 6: Query Handler

### Overview
Configure custom query handlers to control peer selection for query operations.

### Default Query Handler Strategies

```typescript
import { DefaultQueryHandlerStrategies } from 'fabric-network';

// Strategy 1: MSPID_SCOPE_SINGLE (default)
// Query single peer from client's organization
const singlePeerOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  queryHandlerOptions: {
    strategy: DefaultQueryHandlerStrategies.MSPID_SCOPE_SINGLE,
  },
};

// Strategy 2: MSPID_SCOPE_ROUND_ROBIN
// Round-robin across peers in client's organization
const roundRobinOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  queryHandlerOptions: {
    strategy: DefaultQueryHandlerStrategies.MSPID_SCOPE_ROUND_ROBIN,
  },
};
```

### Custom Query Handler

```typescript
import { QueryHandlerFactory, Query, Network } from 'fabric-network';

/**
 * Custom query handler that prefers specific peers
 */
class PreferredPeerQueryHandler implements QueryHandlerFactory {
  private preferredPeers: string[];

  constructor(preferredPeers: string[]) {
    this.preferredPeers = preferredPeers;
  }

  createQueryHandler(network: Network) {
    return async (query: Query) => {
      // Get all peers
      const channel = network.getChannel();
      const peers = channel.getPeers();

      // Filter for preferred peers
      const preferred = peers.filter(peer =>
        this.preferredPeers.includes(peer.getName()),
      );

      // Use preferred peers if available, otherwise use all
      const targetPeers = preferred.length > 0 ? preferred : peers;

      // Execute query on first available peer
      for (const peer of targetPeers) {
        try {
          return await query.evaluate([peer]);
        } catch (error) {
          // Try next peer
          continue;
        }
      }

      throw new Error('All query attempts failed');
    };
  }
}

// Usage
const preferredPeerHandler = new PreferredPeerQueryHandler([
  'peer0.org1.example.com',
  'peer1.org1.example.com',
]);

const connectionOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  queryHandlerOptions: {
    strategy: preferredPeerHandler,
  },
};
```

### Query Handler with Retry

```typescript
import { QueryHandlerFactory, Query, Network } from 'fabric-network';

class RetryQueryHandler implements QueryHandlerFactory {
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }

  createQueryHandler(network: Network) {
    return async (query: Query) => {
      const channel = network.getChannel();
      const peers = channel.getPeers();

      for (let i = 0; i < this.maxRetries; i++) {
        try {
          return await query.evaluate(peers);
        } catch (error) {
          if (i === this.maxRetries - 1) {
            throw error;
          }
          // Wait before retry (exponential backoff)
          await this.sleep(Math.pow(2, i) * 1000);
        }
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Key Points
- `MSPID_SCOPE_SINGLE`: Query single peer (fast, may be stale)
- `MSPID_SCOPE_ROUND_ROBIN`: Distribute load across peers
- Custom handlers allow preferred peer selection
- Implement retry logic for resilience
- Balance between performance and data freshness

---

## Pattern 7: Commit Handler

### Overview
Configure commit handlers to control how transaction commit events are handled.

### Default Commit Handler Strategies

```typescript
import { DefaultEventHandlerStrategies } from 'fabric-network';

// Strategy 1: MSPID_SCOPE_ALLFORTX (default)
// Listen to all peers in client's organization for commit event
const allForTxOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  eventHandlerOptions: {
    strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX,
  },
};

// Strategy 2: MSPID_SCOPE_ANYFORTX
// Wait for commit event from any peer in client's organization
const anyForTxOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  eventHandlerOptions: {
    strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ANYFORTX,
  },
};

// Strategy 3: NETWORK_SCOPE_ALLFORTX
// Wait for commit events from all peers in network
const networkAllOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  eventHandlerOptions: {
    strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX,
  },
};

// Strategy 4: NETWORK_SCOPE_ANYFORTX
// Wait for commit event from any peer in network
const networkAnyOptions: GatewayOptions = {
  wallet: this.wallet,
  identity: 'user1',
  eventHandlerOptions: {
    strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ANYFORTX,
  },
};
```

### Strategy Comparison

| Strategy | Scope | Wait For | Speed | Reliability |
|----------|-------|----------|-------|-------------|
| MSPID_SCOPE_ALLFORTX | Org | All org peers | Slower | Higher |
| MSPID_SCOPE_ANYFORTX | Org | Any org peer | Faster | Lower |
| NETWORK_SCOPE_ALLFORTX | Network | All network peers | Slowest | Highest |
| NETWORK_SCOPE_ANYFORTX | Network | Any network peer | Fast | Medium |

### Environment-Based Strategy Selection

```typescript
@Injectable()
export class FabricCommitStrategyService {
  constructor(private readonly configService: ConfigService) {}

  getCommitStrategy() {
    const env = this.configService.get('NODE_ENV', 'development');

    switch (env) {
      case 'production':
        // Production: Wait for all org peers (high reliability)
        return DefaultEventHandlerStrategies.MSPID_SCOPE_ALLFORTX;

      case 'staging':
        // Staging: Wait for any org peer (balanced)
        return DefaultEventHandlerStrategies.MSPID_SCOPE_ANYFORTX;

      case 'development':
      default:
        // Development: Wait for any peer (fast)
        return DefaultEventHandlerStrategies.NETWORK_SCOPE_ANYFORTX;
    }
  }
}
```

### Key Points
- `MSPID_SCOPE_ALLFORTX`: High reliability, slower (production)
- `MSPID_SCOPE_ANYFORTX`: Balanced (staging)
- `NETWORK_SCOPE_ANYFORTX`: Fast, lower reliability (development)
- Choose strategy based on environment and requirements
- All strategies guarantee transaction is committed

---

## Pattern 8: Retry Strategy

### Overview
Implement retry logic for failed transactions to handle transient network errors.

### Basic Retry Service

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Contract } from 'fabric-network';

@Injectable()
export class FabricRetryService {
  private readonly logger = new Logger(FabricRetryService.name);

  /**
   * Retry transaction with exponential backoff
   */
  async retryTransaction<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;

        if (isLastAttempt) {
          this.logger.error('All retry attempts failed', error.stack);
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, ...
        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Transaction failed (attempt ${attempt + 1}/${maxRetries}). ` +
          `Retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { FabricGatewayService } from './fabric-gateway.service';
import { FabricRetryService } from './fabric-retry.service';

@Injectable()
export class AssetService {
  constructor(
    private readonly gatewayService: FabricGatewayService,
    private readonly retryService: FabricRetryService,
  ) {}

  async createAsset(
    channelName: string,
    chaincodeName: string,
    assetId: string,
    color: string,
    size: number,
  ): Promise<void> {
    await this.retryService.retryTransaction(async () => {
      const network = await this.gatewayService.getNetwork(channelName);
      const contract = network.getContract(chaincodeName);
      await contract.submitTransaction(
        'CreateAsset',
        assetId,
        color,
        size.toString(),
      );
    }, 3, 1000); // 3 retries, 1s base delay
  }
}
```

### Selective Retry (Only Transient Errors)

```typescript
import { TimeoutError } from 'fabric-network';

async retryOnTransientErrors<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Only retry on transient errors
      const isTransientError = this.isTransientError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isTransientError || isLastAttempt) {
        throw error;
      }

      this.logger.warn(`Transient error, retrying... (${attempt + 1}/${maxRetries})`);
      await this.sleep(1000 * Math.pow(2, attempt));
    }
  }
}

private isTransientError(error: any): boolean {
  // Retry on timeout errors
  if (error instanceof TimeoutError) {
    return true;
  }

  // Retry on connection errors
  if (error.message && error.message.includes('ECONNREFUSED')) {
    return true;
  }

  // Retry on MVCC_READ_CONFLICT
  if (error.message && error.message.includes('MVCC_READ_CONFLICT')) {
    return true;
  }

  // Don't retry on business logic errors
  return false;
}
```

### Key Points
- Use exponential backoff (1s, 2s, 4s, ...)
- Retry only transient errors (timeout, connection)
- Don't retry business logic errors
- Log retry attempts for debugging
- Set maximum retry limit (3-5 retries)

---

## Pattern 9: Error Codes Handling

### Overview
Handle Fabric SDK error codes and translate them to user-friendly messages.

### Common Fabric Error Codes

```typescript
export enum FabricErrorCode {
  // Timeout errors
  TIMEOUT = 'TIMEOUT',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // Endorsement errors
  ENDORSEMENT_POLICY_FAILURE = 'ENDORSEMENT_POLICY_FAILURE',
  ENDORSEMENT_MISMATCH = 'ENDORSEMENT_MISMATCH',

  // MVCC errors
  MVCC_READ_CONFLICT = 'MVCC_READ_CONFLICT',

  // Validation errors
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  DUPLICATE_TXID = 'DUPLICATE_TXID',

  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Chaincode errors
  CHAINCODE_INVOKE_ERROR = 'CHAINCODE_INVOKE_ERROR',
}
```

### Error Handler Service

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { TimeoutError } from 'fabric-network';

@Injectable()
export class FabricErrorHandlerService {
  private readonly logger = new Logger(FabricErrorHandlerService.name);

  /**
   * Handle Fabric SDK errors and convert to HTTP exceptions
   */
  handleError(error: any, context: string): never {
    this.logger.error(`Error in ${context}:`, error.stack);

    // Timeout errors
    if (error instanceof TimeoutError || error.message?.includes('TIMEOUT')) {
      throw new HttpException(
        'Transaction timed out. Please try again.',
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    // MVCC read conflict
    if (error.message?.includes('MVCC_READ_CONFLICT')) {
      throw new HttpException(
        'Concurrent modification detected. Please retry.',
        HttpStatus.CONFLICT,
      );
    }

    // Endorsement policy failure
    if (error.message?.includes('ENDORSEMENT_POLICY_FAILURE')) {
      throw new HttpException(
        'Transaction did not meet endorsement policy requirements.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Connection errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('SERVICE_UNAVAILABLE')) {
      throw new HttpException(
        'Fabric network is currently unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Chaincode errors (business logic)
    if (error.message?.includes('Error:')) {
      // Extract error message from chaincode
      const match = error.message.match(/Error: (.+)/);
      const message = match ? match[1] : error.message;

      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }

    // Generic error
    throw new HttpException(
      'An unexpected error occurred.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Usage in Service

```typescript
@Injectable()
export class AssetService {
  constructor(
    private readonly gatewayService: FabricGatewayService,
    private readonly errorHandler: FabricErrorHandlerService,
  ) {}

  async getAsset(
    channelName: string,
    chaincodeName: string,
    assetId: string,
  ): Promise<any> {
    try {
      const network = await this.gatewayService.getNetwork(channelName);
      const contract = network.getContract(chaincodeName);
      const result = await contract.evaluateTransaction('ReadAsset', assetId);
      return JSON.parse(result.toString());
    } catch (error) {
      this.errorHandler.handleError(error, 'getAsset');
    }
  }
}
```

### Key Points
- Map Fabric errors to HTTP status codes
- Extract chaincode error messages
- Provide user-friendly error messages
- Log errors for debugging
- Handle timeouts, MVCC conflicts, endorsement failures separately

---

## Pattern 10: Client Logging

### Overview
Configure Fabric SDK client logging for debugging and monitoring.

### Fabric SDK Logging

```typescript
// Set logging level via environment variable
process.env.HFC_LOGGING = '{"debug": "console"}';

// Levels: fatal, error, warn, info, debug, trace
```

### NestJS Logger Integration

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Gateway } from 'fabric-network';

@Injectable()
export class FabricLoggingService {
  private readonly logger = new Logger('FabricSDK');

  /**
   * Log gateway connection
   */
  logConnection(identity: string, channel: string) {
    this.logger.log(`Connected to Fabric Gateway as ${identity} on channel ${channel}`);
  }

  /**
   * Log transaction submission
   */
  logTransactionSubmit(
    chaincode: string,
    functionName: string,
    args: string[],
  ) {
    this.logger.debug(
      `Submitting transaction: ${chaincode}.${functionName}(${args.join(', ')})`,
    );
  }

  /**
   * Log transaction result
   */
  logTransactionResult(txId: string, result: Buffer) {
    this.logger.debug(`Transaction ${txId} successful. Result: ${result.toString()}`);
  }

  /**
   * Log transaction error
   */
  logTransactionError(chaincode: string, functionName: string, error: any) {
    this.logger.error(
      `Transaction failed: ${chaincode}.${functionName}`,
      error.stack,
    );
  }
}
```

### Logging Interceptor

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class FabricLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('FabricRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    this.logger.log(`Incoming request: ${method} ${url}`);
    this.logger.debug(`Request body: ${JSON.stringify(body)}`);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(response => {
        const duration = Date.now() - startTime;
        this.logger.log(`Request completed in ${duration}ms`);
        this.logger.debug(`Response: ${JSON.stringify(response)}`);
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        this.logger.error(`Request failed after ${duration}ms`, error.stack);
        throw error;
      }),
    );
  }
}
```

### Key Points
- Use NestJS Logger for consistent logging
- Log connection, transaction submission, results, errors
- Include transaction IDs for tracing
- Use debug level for detailed logs
- Implement logging interceptor for HTTP requests

---

## NestJS Module Setup

### Complete Module

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FabricGatewayService } from './fabric-gateway.service';
import { FabricConfigService } from './fabric-config.service';
import { FabricRetryService } from './fabric-retry.service';
import { FabricErrorHandlerService } from './fabric-error-handler.service';
import { FabricLoggingService } from './fabric-logging.service';

@Module({
  imports: [ConfigModule],
  providers: [
    FabricGatewayService,
    FabricConfigService,
    FabricRetryService,
    FabricErrorHandlerService,
    FabricLoggingService,
  ],
  exports: [
    FabricGatewayService,
    FabricRetryService,
    FabricErrorHandlerService,
    FabricLoggingService,
  ],
})
export class FabricClientModule {}
```

---

## Summary

This specialist covers:
1. **Fabric Network Import**: Essential fabric-network module components
2. **Gateway Connection**: Connect/disconnect patterns with lifecycle management
3. **Connection Options**: Comprehensive gateway configuration
4. **Discovery Options**: Service discovery configuration
5. **Timeout Configuration**: Commit, endorsement, query timeouts
6. **Query Handlers**: Custom query handler strategies
7. **Commit Handlers**: Event handler strategies for commit confirmation
8. **Retry Strategy**: Exponential backoff retry logic
9. **Error Codes Handling**: Fabric error mapping to HTTP exceptions
10. **Client Logging**: SDK and application logging integration
11. **NestJS Integration**: Complete module setup

**Next Steps**: See Fabric SDK Wallet & Identity Specialist for wallet management and Fabric CA operations.
