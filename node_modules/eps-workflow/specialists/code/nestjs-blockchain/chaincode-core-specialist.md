# Chaincode Core Specialist

**Domain**: Hyperledger Fabric - Chaincode Core Development
**Stack**: TypeScript/JavaScript Chaincode (fabric-contract-api)
**Responsibility**: Chaincode interface, initialization, invocation, stub API basics, state operations, error handling
**Pattern Count**: 10 patterns

---

## Overview

This specialist handles core Hyperledger Fabric chaincode development patterns including chaincode interface structure, initialization and invocation functions, stub API basics, fundamental state operations (get, put, delete), argument handling, and error handling best practices.

**Core Competencies**:
- Chaincode Interface & Contract Structure
- Init & Invoke Function Implementation
- Stub API Fundamentals
- Basic State Operations (Get, Put, Delete)
- Argument Parsing & Validation
- Error Handling & Response Formatting

---

## Pattern Index

### Chaincode Structure (3 patterns)
1. Chaincode Interface
2. Init Function
3. Invoke Function

### Stub API Basics (4 patterns)
4. Stub API Overview
5. Get State
6. Put State
7. Delete State

### Utilities (3 patterns)
8. Get Args / Get String Args
9. Error Handling Chaincode
10. Response Formatting

---

## 1. Chaincode Interface

**Purpose**: Define chaincode contract structure using fabric-contract-api.

### Pattern 1.1: Basic Contract Structure

```typescript
// src/chaincode/asset-transfer.ts
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Asset } from './asset';

@Info({
  title: 'AssetTransfer',
  description: 'Smart contract for trading assets',
})
export class AssetTransferContract extends Contract {

  // Constructor (optional)
  constructor() {
    super('AssetTransferContract');
  }

  // Transactions defined below using @Transaction() decorator
}
```

### Pattern 1.2: Multiple Contracts in One Chaincode

```typescript
// src/chaincode/index.ts
import { AssetTransferContract } from './asset-transfer-contract';
import { AuditContract } from './audit-contract';

export const contracts: any[] = [
  AssetTransferContract,
  AuditContract,
];

// Deploy with:
// peer lifecycle chaincode package multi.tar.gz --path ./chaincode --lang node --label multi_1.0
```

### Pattern 1.3: Contract with Custom Context

```typescript
// src/chaincode/custom-context.ts
import { Context, Contract } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';

export class AssetContext extends Context {
  public assetList: any; // Custom property

  constructor() {
    super();
    this.assetList = null;
  }

  // Custom helper methods
  public getClientMSPID(): string {
    return this.clientIdentity.getMSPID();
  }
}

export class AssetTransferContract extends Contract {

  createContext(): AssetContext {
    return new AssetContext();
  }

  @Transaction()
  public async createAsset(ctx: AssetContext, assetId: string): Promise<void> {
    const mspid = ctx.getClientMSPID();
    // Use custom context
  }
}
```

---

## 2. Init Function

**Purpose**: Initialize chaincode state when deployed or upgraded (Fabric 1.x) or on first invocation (Fabric 2.x).

### Pattern 2.1: Basic Init Function

```typescript
import { Context, Contract, Transaction } from 'fabric-contract-api';

export class AssetTransferContract extends Contract {

  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const assets = [
      {
        ID: 'asset1',
        Color: 'blue',
        Size: 5,
        Owner: 'Tomoko',
        AppraisedValue: 300,
      },
      {
        ID: 'asset2',
        Color: 'red',
        Size: 5,
        Owner: 'Brad',
        AppraisedValue: 400,
      },
    ];

    for (const asset of assets) {
      await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
      console.info(`Asset ${asset.ID} initialized`);
    }
  }
}
```

### Pattern 2.2: Init with Configuration

```typescript
@Transaction()
public async Initialize(ctx: Context, config: string): Promise<void> {
  const configObj = JSON.parse(config);

  // Store configuration
  await ctx.stub.putState('CONFIG', Buffer.from(JSON.stringify(configObj)));

  // Initialize admin list
  const adminMSP = ctx.clientIdentity.getMSPID();
  const admins = [adminMSP];
  await ctx.stub.putState('ADMINS', Buffer.from(JSON.stringify(admins)));

  console.info('Chaincode initialized with config:', configObj);
}
```

### Pattern 2.3: Idempotent Init (Check if Already Initialized)

```typescript
@Transaction()
public async InitLedger(ctx: Context): Promise<void> {
  // Check if already initialized
  const initMarker = await ctx.stub.getState('INITIALIZED');
  if (initMarker && initMarker.length > 0) {
    throw new Error('Chaincode already initialized');
  }

  // Perform initialization
  const assets = [ /* ... */ ];
  for (const asset of assets) {
    await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
  }

  // Mark as initialized
  await ctx.stub.putState('INITIALIZED', Buffer.from('true'));
}
```

---

## 3. Invoke Function

**Purpose**: Execute chaincode transactions (automatic in fabric-contract-api using @Transaction decorator).

### Pattern 3.1: Transaction Function

```typescript
import { Context, Contract, Transaction, Returns } from 'fabric-contract-api';

export class AssetTransferContract extends Contract {

  @Transaction()
  @Returns('string')
  public async CreateAsset(
    ctx: Context,
    id: string,
    color: string,
    size: number,
    owner: string,
    appraisedValue: number,
  ): Promise<string> {
    const asset = {
      ID: id,
      Color: color,
      Size: size,
      Owner: owner,
      AppraisedValue: appraisedValue,
    };

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    return JSON.stringify(asset);
  }

  @Transaction(false) // false = read-only query
  @Returns('string')
  public async ReadAsset(ctx: Context, id: string): Promise<string> {
    const assetJSON = await ctx.stub.getState(id);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }
}
```

### Pattern 3.2: Transaction with Validation

```typescript
@Transaction()
public async TransferAsset(
  ctx: Context,
  id: string,
  newOwner: string,
): Promise<void> {
  // Validate input
  if (!id || id.trim().length === 0) {
    throw new Error('Asset ID must be a non-empty string');
  }
  if (!newOwner || newOwner.trim().length === 0) {
    throw new Error('New owner must be a non-empty string');
  }

  // Check asset exists
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());

  // Check ownership (only current owner can transfer)
  const clientMSPID = ctx.clientIdentity.getMSPID();
  if (asset.OwnerMSP !== clientMSPID) {
    throw new Error(`Asset ${id} is not owned by ${clientMSPID}`);
  }

  // Update ownership
  asset.Owner = newOwner;
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 3.3: Submit Transaction vs Evaluate Transaction

```typescript
// Submit transaction (modifies ledger, requires endorsement + commit)
export class AssetTransferContract extends Contract {

  @Transaction() // Default: submit = true
  public async CreateAsset(ctx: Context, ...): Promise<void> {
    // Writes to ledger
    await ctx.stub.putState(id, data);
  }

  @Transaction(false) // submit = false → read-only query
  public async GetAsset(ctx: Context, id: string): Promise<string> {
    // Only reads from ledger, no state changes
    const data = await ctx.stub.getState(id);
    return data.toString();
  }

  @Transaction(false)
  public async GetAllAssets(ctx: Context): Promise<string> {
    // Query only, no writes
    const iterator = await ctx.stub.getStateByRange('', '');
    const allResults = [];

    let result = await iterator.next();
    while (!result.done) {
      const jsonRes = {
        Key: result.value.key,
        Record: JSON.parse(result.value.value.toString('utf8')),
      };
      allResults.push(jsonRes);
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(allResults);
  }
}
```

---

## 4. Stub API Overview

**Purpose**: Interact with the ledger using the ChaincodeStub API.

### Pattern 4.1: Accessing Stub API

```typescript
import { Context } from 'fabric-contract-api';
import { ChaincodeStub } from 'fabric-shim';

@Transaction()
public async MyTransaction(ctx: Context): Promise<void> {
  const stub: ChaincodeStub = ctx.stub;

  // State operations
  await stub.putState(key, value);
  const data = await stub.getState(key);
  await stub.delState(key);

  // Transaction info
  const txId = stub.getTxID();
  const timestamp = stub.getTxTimestamp();
  const channelId = stub.getChannelID();

  // Identity
  const creator = stub.getCreator();
  const mspId = ctx.clientIdentity.getMSPID();
}
```

### Pattern 4.2: Common Stub Methods

```typescript
// State database operations
stub.putState(key: string, value: Uint8Array): Promise<void>
stub.getState(key: string): Promise<Uint8Array>
stub.delState(key: string): Promise<void>

// Range queries
stub.getStateByRange(startKey: string, endKey: string): Promise<StateQueryIterator>

// Composite key operations
stub.createCompositeKey(objectType: string, attributes: string[]): string
stub.splitCompositeKey(compositeKey: string): { objectType: string; attributes: string[] }
stub.getStateByPartialCompositeKey(objectType: string, attributes: string[]): Promise<StateQueryIterator>

// Rich queries (CouchDB only)
stub.getQueryResult(query: string): Promise<StateQueryIterator>

// History
stub.getHistoryForKey(key: string): Promise<HistoryQueryIterator>

// Transaction context
stub.getTxID(): string
stub.getTxTimestamp(): Timestamp
stub.getChannelID(): string
stub.getCreator(): SerializedIdentity

// Arguments
stub.getArgs(): Uint8Array[]
stub.getStringArgs(): string[]

// Events
stub.setEvent(name: string, payload: Uint8Array): void

// Private data
stub.getPrivateData(collection: string, key: string): Promise<Uint8Array>
stub.putPrivateData(collection: string, key: string, value: Uint8Array): Promise<void>

// Chaincode-to-chaincode
stub.invokeChaincode(chaincodeName: string, args: Uint8Array[], channel: string): Promise<Response>
```

---

## 5. Get State

**Purpose**: Retrieve state from the ledger.

### Pattern 5.1: Basic Get State

```typescript
@Transaction(false)
public async ReadAsset(ctx: Context, id: string): Promise<string> {
  const assetJSON = await ctx.stub.getState(id);

  // Check if asset exists
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`The asset ${id} does not exist`);
  }

  return assetJSON.toString();
}
```

### Pattern 5.2: Get State with JSON Parsing

```typescript
@Transaction(false)
public async GetAssetDetails(ctx: Context, id: string): Promise<Asset> {
  const assetJSON = await ctx.stub.getState(id);

  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} not found`);
  }

  const asset: Asset = JSON.parse(assetJSON.toString());
  return asset;
}
```

### Pattern 5.3: Get Multiple States

```typescript
@Transaction(false)
public async GetMultipleAssets(ctx: Context, ids: string): Promise<string> {
  const assetIds: string[] = JSON.parse(ids);
  const results = [];

  for (const id of assetIds) {
    const assetJSON = await ctx.stub.getState(id);
    if (assetJSON && assetJSON.length > 0) {
      results.push({
        id: id,
        asset: JSON.parse(assetJSON.toString()),
      });
    }
  }

  return JSON.stringify(results);
}
```

---

## 6. Put State

**Purpose**: Write or update state in the ledger.

### Pattern 6.1: Basic Put State

```typescript
@Transaction()
public async CreateAsset(
  ctx: Context,
  id: string,
  color: string,
  size: number,
  owner: string,
  value: number,
): Promise<void> {
  const asset = {
    ID: id,
    Color: color,
    Size: size,
    Owner: owner,
    AppraisedValue: value,
  };

  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 6.2: Put State with Duplicate Check

```typescript
@Transaction()
public async CreateAsset(ctx: Context, id: string, data: string): Promise<void> {
  // Check if asset already exists
  const existing = await ctx.stub.getState(id);
  if (existing && existing.length > 0) {
    throw new Error(`Asset ${id} already exists`);
  }

  const asset = JSON.parse(data);
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 6.3: Update Existing State

```typescript
@Transaction()
public async UpdateAssetValue(
  ctx: Context,
  id: string,
  newValue: number,
): Promise<void> {
  // Get existing asset
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  // Parse and update
  const asset = JSON.parse(assetJSON.toString());
  asset.AppraisedValue = newValue;
  asset.UpdatedAt = new Date().toISOString();

  // Save updated state
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

---

## 7. Delete State

**Purpose**: Remove state from the ledger (mark as deleted, not physically removed).

### Pattern 7.1: Basic Delete State

```typescript
@Transaction()
public async DeleteAsset(ctx: Context, id: string): Promise<void> {
  // Check if asset exists
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  // Delete asset
  await ctx.stub.delState(id);
}
```

### Pattern 7.2: Soft Delete (Mark as Deleted)

```typescript
@Transaction()
public async SoftDeleteAsset(ctx: Context, id: string): Promise<void> {
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  asset.Deleted = true;
  asset.DeletedAt = new Date().toISOString();
  asset.DeletedBy = ctx.clientIdentity.getID();

  // Update instead of delete
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 7.3: Delete with Authorization

```typescript
@Transaction()
public async DeleteAsset(ctx: Context, id: string): Promise<void> {
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());

  // Check if caller is the owner
  const clientID = ctx.clientIdentity.getID();
  if (asset.Owner !== clientID) {
    throw new Error(`Only the owner can delete asset ${id}`);
  }

  await ctx.stub.delState(id);
}
```

---

## 8. Get Args / Get String Args

**Purpose**: Parse transaction arguments from the stub.

### Pattern 8.1: Using Typed Parameters (Recommended)

```typescript
// fabric-contract-api automatically parses args
@Transaction()
public async CreateAsset(
  ctx: Context,
  id: string,          // Auto-parsed from args[0]
  color: string,       // Auto-parsed from args[1]
  size: number,        // Auto-parsed from args[2]
  owner: string,       // Auto-parsed from args[3]
  value: number,       // Auto-parsed from args[4]
): Promise<void> {
  // Use typed parameters directly
  const asset = { ID: id, Color: color, Size: size, Owner: owner, AppraisedValue: value };
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 8.2: Manual Args Parsing (Low-Level)

```typescript
@Transaction()
public async ProcessArgs(ctx: Context): Promise<void> {
  // Get raw args (Uint8Array[])
  const args = ctx.stub.getArgs();

  // args[0] is function name
  // args[1], args[2], ... are parameters

  if (args.length < 3) {
    throw new Error('Incorrect number of arguments. Expecting at least 2');
  }

  const id = args[1].toString();
  const data = args[2].toString();

  // Process...
}
```

### Pattern 8.3: Get String Args

```typescript
@Transaction()
public async ProcessStringArgs(ctx: Context): Promise<void> {
  const args = ctx.stub.getStringArgs();

  // args[0] = function name
  // args[1] = first parameter
  // args[2] = second parameter

  console.info('Function:', args[0]);
  console.info('Param 1:', args[1]);
  console.info('Param 2:', args[2]);
}
```

---

## 9. Error Handling Chaincode

**Purpose**: Handle errors gracefully and return meaningful error messages.

### Pattern 9.1: Try-Catch Error Handling

```typescript
@Transaction()
public async CreateAsset(ctx: Context, id: string, data: string): Promise<string> {
  try {
    // Validate input
    if (!id || id.trim() === '') {
      throw new Error('Asset ID cannot be empty');
    }

    // Check if exists
    const existing = await ctx.stub.getState(id);
    if (existing && existing.length > 0) {
      throw new Error(`Asset ${id} already exists`);
    }

    // Parse JSON
    let asset;
    try {
      asset = JSON.parse(data);
    } catch (e) {
      throw new Error(`Invalid JSON format: ${e.message}`);
    }

    // Save state
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));

    return JSON.stringify({ success: true, id: id });

  } catch (error) {
    console.error(`Error in CreateAsset: ${error.message}`);
    throw error; // Re-throw to return error to client
  }
}
```

### Pattern 9.2: Custom Error Classes

```typescript
// src/chaincode/errors.ts
export class AssetNotFoundError extends Error {
  constructor(id: string) {
    super(`Asset ${id} not found`);
    this.name = 'AssetNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized to perform action: ${action}`);
    this.name = 'UnauthorizedError';
  }
}

// Usage in contract
@Transaction()
public async UpdateAsset(ctx: Context, id: string, newValue: number): Promise<void> {
  const assetJSON = await ctx.stub.getState(id);
  if (!assetJSON || assetJSON.length === 0) {
    throw new AssetNotFoundError(id);
  }

  const asset = JSON.parse(assetJSON.toString());

  // Check authorization
  if (asset.Owner !== ctx.clientIdentity.getID()) {
    throw new UnauthorizedError('update asset');
  }

  asset.AppraisedValue = newValue;
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
}
```

### Pattern 9.3: Error Response Formatting

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

interface SuccessResponse {
  success: true;
  data: any;
}

type Response = ErrorResponse | SuccessResponse;

@Transaction()
public async SafeCreateAsset(ctx: Context, id: string, data: string): Promise<string> {
  try {
    const asset = JSON.parse(data);
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));

    const response: SuccessResponse = {
      success: true,
      data: { id: id, asset: asset },
    };

    return JSON.stringify(response);

  } catch (error) {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      code: 'CREATE_ASSET_FAILED',
    };

    return JSON.stringify(response);
  }
}
```

---

## 10. Response Formatting

**Purpose**: Format chaincode responses consistently.

### Pattern 10.1: JSON Response

```typescript
@Transaction(false)
public async GetAsset(ctx: Context, id: string): Promise<string> {
  const assetJSON = await ctx.stub.getState(id);

  if (!assetJSON || assetJSON.length === 0) {
    // Return structured error
    return JSON.stringify({
      success: false,
      error: `Asset ${id} not found`,
    });
  }

  // Return structured success
  return JSON.stringify({
    success: true,
    data: JSON.parse(assetJSON.toString()),
  });
}
```

### Pattern 10.2: Return Type Decorators

```typescript
import { Object, Property } from 'fabric-contract-api';

@Object()
export class Asset {
  @Property()
  public ID: string;

  @Property()
  public Color: string;

  @Property()
  public Size: number;

  @Property()
  public Owner: string;

  @Property()
  public AppraisedValue: number;
}

@Transaction(false)
@Returns('Asset')
public async ReadAsset(ctx: Context, id: string): Promise<Asset> {
  const assetJSON = await ctx.stub.getState(id);

  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${id} does not exist`);
  }

  return JSON.parse(assetJSON.toString()) as Asset;
}
```

---

## Best Practices

### Chaincode Development
1. **Type Safety**: Use TypeScript for compile-time type checking
2. **Validation**: Always validate inputs before processing
3. **Existence Checks**: Check if keys exist before operations
4. **Idempotency**: Design transactions to be safely retryable
5. **Determinism**: Avoid non-deterministic operations (random, timestamps from Date.now())

### State Management
1. **Key Naming**: Use consistent, hierarchical key naming conventions
2. **JSON Encoding**: Serialize complex objects as JSON
3. **Soft Deletes**: Consider soft deletes for audit trails
4. **Versioning**: Include version field for schema evolution
5. **Timestamps**: Store creation and update timestamps

### Error Handling
1. **Descriptive Errors**: Provide clear error messages
2. **Error Logging**: Log errors for debugging
3. **Graceful Failures**: Return errors instead of crashing
4. **Validation Early**: Fail fast on invalid inputs
5. **Custom Errors**: Use custom error classes for specific failures

### Performance
1. **Minimize Reads**: Batch reads when possible
2. **Avoid Large Objects**: Keep state objects reasonably sized
3. **Optimize Queries**: Use composite keys for efficient queries
4. **Limit Iterations**: Avoid unbounded loops over state
5. **Cache Configuration**: Cache frequently read configuration

---

## Testing Patterns

### Pattern: Unit Test Contract

```typescript
// test/asset-transfer.test.ts
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { AssetTransferContract } from '../src/asset-transfer';

describe('AssetTransferContract', () => {
  let contract: AssetTransferContract;
  let ctx: Context;
  let stub: sinon.SinonStubbedInstance<ChaincodeStub>;
  let clientIdentity: sinon.SinonStubbedInstance<ClientIdentity>;

  beforeEach(() => {
    contract = new AssetTransferContract();
    stub = sinon.createStubInstance(ChaincodeStub);
    clientIdentity = sinon.createStubInstance(ClientIdentity);

    ctx = ({
      stub: stub,
      clientIdentity: clientIdentity,
    } as unknown) as Context;
  });

  describe('CreateAsset', () => {
    it('should create an asset', async () => {
      await contract.CreateAsset(ctx, 'asset1', 'blue', 5, 'owner1', 100);

      sinon.assert.calledWith(
        stub.putState,
        'asset1',
        Buffer.from(JSON.stringify({ ID: 'asset1', Color: 'blue', Size: 5, Owner: 'owner1', AppraisedValue: 100 })),
      );
    });

    it('should throw error if asset exists', async () => {
      stub.getState.resolves(Buffer.from('existing'));

      await expect(contract.CreateAsset(ctx, 'asset1', 'blue', 5, 'owner1', 100))
        .to.be.rejectedWith('Asset asset1 already exists');
    });
  });
});
```

---

**Related Specialists**:
- Chaincode Queries & Keys Specialist (composite keys, range queries, rich queries)
- Chaincode Advanced Features Specialist (events, access control, private data)
- Fabric Gateway & Transactions Specialist (application-side transaction submission)
