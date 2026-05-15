# Chaincode Advanced Features Specialist

## Purpose
Expert in Hyperledger Fabric chaincode advanced patterns including transaction context, chaincode events, chaincode-to-chaincode invocation, access control (ACL/ABAC), private data collections, and transient data for NestJS + Fabric applications.

## Specialization Areas
1. **Transaction Context**: Getting creator, transaction ID, timestamp
2. **Chaincode Events**: Emitting custom events from chaincode
3. **Chaincode-to-Chaincode**: Cross-chaincode invocations
4. **Access Control Lists (ACL)**: Organization-based access control
5. **Attribute-Based Access Control (ABAC)**: Fine-grained access using client attributes
6. **Private Data**: Private data collections with endorsement policies
7. **Transient Data**: Passing sensitive data without writing to ledger

## Related Specialists
- **Chaincode Core Specialist**: Basic state operations, error handling
- **Chaincode Queries & Keys Specialist**: Range queries, composite keys, pagination
- **Fabric Gateway & Transactions Specialist**: Private data from client side

---

## Pattern 1: Transaction Context (get-creator, get-transaction-id, get-transaction-timestamp)

### Overview
Access transaction metadata including submitter identity, transaction ID, and timestamp.

### TypeScript Chaincode Example

```typescript
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({
  title: 'TransactionContext',
  description: 'Accessing transaction context information',
})
export class TransactionContextContract extends Contract {

  /**
   * Get transaction creator (client identity)
   */
  @Transaction(false)
  @Returns('string')
  public async GetTransactionCreator(ctx: Context): Promise<string> {
    // Get creator's serialized identity
    const creator = ctx.stub.getCreator();

    // Get MSP ID (organization)
    const mspId = ctx.clientIdentity.getMSPID();

    // Get client ID (X.509 DN)
    const clientId = ctx.clientIdentity.getID();

    // Get attribute value (if exists)
    const role = ctx.clientIdentity.getAttributeValue('role');

    const creatorInfo = {
      mspId: mspId,
      clientId: clientId,
      role: role,
      creatorBytes: creator.toString('base64'),
    };

    return JSON.stringify(creatorInfo);
  }

  /**
   * Get transaction ID
   */
  @Transaction(false)
  @Returns('string')
  public async GetTransactionId(ctx: Context): Promise<string> {
    // Transaction ID is unique per transaction
    const txId = ctx.stub.getTxID();

    const txInfo = {
      transactionId: txId,
      channelId: ctx.stub.getChannelID(),
    };

    return JSON.stringify(txInfo);
  }

  /**
   * Get transaction timestamp
   */
  @Transaction(false)
  @Returns('string')
  public async GetTransactionTimestamp(ctx: Context): Promise<string> {
    // Get transaction timestamp (from block)
    const txTimestamp = ctx.stub.getTxTimestamp();

    const timestamp = {
      seconds: txTimestamp.seconds.toNumber(),
      nanos: txTimestamp.nanos,
      iso: new Date(txTimestamp.seconds.toNumber() * 1000).toISOString(),
    };

    return JSON.stringify(timestamp);
  }

  /**
   * Create asset with full transaction context
   */
  @Transaction()
  public async CreateAssetWithContext(
    ctx: Context,
    assetId: string,
    value: string,
  ): Promise<void> {
    // Get transaction context
    const txId = ctx.stub.getTxID();
    const txTimestamp = ctx.stub.getTxTimestamp();
    const creator = ctx.clientIdentity.getID();
    const mspId = ctx.clientIdentity.getMSPID();

    const asset = {
      ID: assetId,
      value: value,
      createdBy: creator,
      createdByOrg: mspId,
      createdAt: {
        seconds: txTimestamp.seconds.toNumber(),
        nanos: txTimestamp.nanos,
      },
      transactionId: txId,
    };

    await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
    console.info(`Asset ${assetId} created by ${creator} from ${mspId}`);
  }
}
```

### Key Points
- `ctx.stub.getCreator()`: Get serialized identity (protobuf)
- `ctx.clientIdentity.getMSPID()`: Get organization (Org1MSP, Org2MSP, etc.)
- `ctx.clientIdentity.getID()`: Get X.509 distinguished name
- `ctx.stub.getTxID()`: Get unique transaction ID
- `ctx.stub.getTxTimestamp()`: Get block timestamp (deterministic)

---

## Pattern 2: Chaincode Events (set-event)

### Overview
Emit custom events from chaincode that clients can listen to.

### TypeScript Chaincode Example

```typescript
/**
 * Create asset and emit event
 */
@Transaction()
public async CreateAssetWithEvent(
  ctx: Context,
  assetId: string,
  color: string,
  size: number,
  owner: string,
): Promise<void> {
  const asset = {
    ID: assetId,
    Color: color,
    Size: size,
    Owner: owner,
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

  // Emit custom event
  const eventPayload = {
    assetId: assetId,
    color: color,
    owner: owner,
    timestamp: ctx.stub.getTxTimestamp().seconds.toNumber(),
  };

  ctx.stub.setEvent('AssetCreated', Buffer.from(JSON.stringify(eventPayload)));

  console.info(`Asset ${assetId} created, event emitted`);
}

/**
 * Transfer asset and emit event
 */
@Transaction()
public async TransferAssetWithEvent(
  ctx: Context,
  assetId: string,
  newOwner: string,
): Promise<void> {
  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  const oldOwner = asset.Owner;

  asset.Owner = newOwner;
  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

  // Emit transfer event
  const eventPayload = {
    assetId: assetId,
    from: oldOwner,
    to: newOwner,
    timestamp: ctx.stub.getTxTimestamp().seconds.toNumber(),
  };

  ctx.stub.setEvent('AssetTransferred', Buffer.from(JSON.stringify(eventPayload)));

  console.info(`Asset ${assetId} transferred from ${oldOwner} to ${newOwner}`);
}

/**
 * Delete asset and emit event
 */
@Transaction()
public async DeleteAssetWithEvent(
  ctx: Context,
  assetId: string,
): Promise<void> {
  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  await ctx.stub.delState(assetId);

  // Emit delete event
  const eventPayload = {
    assetId: assetId,
    deletedBy: ctx.clientIdentity.getID(),
    timestamp: ctx.stub.getTxTimestamp().seconds.toNumber(),
  };

  ctx.stub.setEvent('AssetDeleted', Buffer.from(JSON.stringify(eventPayload)));

  console.info(`Asset ${assetId} deleted`);
}
```

### NestJS Event Listener

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Injectable()
export class ChaincodeEventListenerService implements OnModuleInit, OnModuleDestroy {
  private listeners: Map<string, any> = new Map();

  constructor(private readonly gatewayService: GatewayService) {}

  async onModuleInit() {
    await this.listenToAssetEvents();
  }

  async listenToAssetEvents() {
    const network = await this.gatewayService.getNetwork('mychannel');

    // Listen to AssetCreated events
    const createdListener = async (event: any) => {
      const payload = JSON.parse(event.payload.toString());
      console.log('Asset Created:', payload);
      // Handle event (store in database, send notification, etc.)
    };

    await network.addContractListener(
      createdListener,
      { contract: 'basic', eventName: 'AssetCreated' },
    );

    this.listeners.set('AssetCreated', createdListener);

    // Listen to AssetTransferred events
    const transferredListener = async (event: any) => {
      const payload = JSON.parse(event.payload.toString());
      console.log('Asset Transferred:', payload);
      // Handle event
    };

    await network.addContractListener(
      transferredListener,
      { contract: 'basic', eventName: 'AssetTransferred' },
    );

    this.listeners.set('AssetTransferred', transferredListener);
  }

  async onModuleDestroy() {
    // Clean up listeners
    this.listeners.clear();
  }
}
```

### Key Points
- `ctx.stub.setEvent(name, payload)`: Emit custom event
- Event name is a string identifier
- Payload is a Buffer (JSON.stringify then Buffer.from)
- Events are emitted after transaction commits
- Clients can filter events by name

---

## Pattern 3: Chaincode-to-Chaincode Invocation

### Overview
Invoke functions in another chaincode from within your chaincode.

### TypeScript Chaincode Example

```typescript
/**
 * Invoke another chaincode to get asset
 */
@Transaction(false)
@Returns('string')
public async GetAssetFromOtherChaincode(
  ctx: Context,
  targetChaincode: string,
  targetChannel: string,
  assetId: string,
): Promise<string> {
  // Invoke another chaincode
  const response = await ctx.stub.invokeChaincode(
    targetChaincode,
    ['ReadAsset', assetId],
    targetChannel,
  );

  if (response.status !== 200) {
    throw new Error(`Failed to invoke chaincode: ${response.message}`);
  }

  return response.payload.toString();
}

/**
 * Transfer asset with verification from another chaincode
 */
@Transaction()
public async TransferAssetWithVerification(
  ctx: Context,
  assetId: string,
  newOwner: string,
  verificationChaincode: string,
): Promise<void> {
  // Verify ownership in another chaincode
  const verifyResponse = await ctx.stub.invokeChaincode(
    verificationChaincode,
    ['VerifyOwnership', assetId, newOwner],
    ctx.stub.getChannelID(),
  );

  if (verifyResponse.status !== 200) {
    throw new Error('Ownership verification failed');
  }

  const isVerified = JSON.parse(verifyResponse.payload.toString());
  if (!isVerified) {
    throw new Error('Owner not verified');
  }

  // Proceed with transfer
  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  asset.Owner = newOwner;

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
  console.info(`Asset ${assetId} transferred to ${newOwner} after verification`);
}

/**
 * Composite transaction across multiple chaincodes
 */
@Transaction()
public async CreateCompositeAsset(
  ctx: Context,
  assetId: string,
  metadata: string,
  metadataChaincode: string,
): Promise<void> {
  // Create asset in this chaincode
  const asset = {
    ID: assetId,
    MetadataRef: `${metadataChaincode}:${assetId}`,
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

  // Store metadata in another chaincode
  const metadataResponse = await ctx.stub.invokeChaincode(
    metadataChaincode,
    ['CreateMetadata', assetId, metadata],
    ctx.stub.getChannelID(),
  );

  if (metadataResponse.status !== 200) {
    throw new Error('Failed to create metadata in external chaincode');
  }

  console.info(`Composite asset ${assetId} created across chaincodes`);
}
```

### Key Points
- `ctx.stub.invokeChaincode(name, args, channel)`: Cross-chaincode call
- Can invoke chaincodes on same channel or different channels
- Response has `status` (200 = success) and `payload`
- Both chaincodes must be installed on the peer
- Invocation is part of the same transaction (atomic)

---

## Pattern 4: Access Control Lists (ACL)

### Overview
Implement organization-based access control using MSP IDs.

### TypeScript Chaincode Example

```typescript
/**
 * ACL: Only Org1 can create assets
 */
@Transaction()
public async CreateAssetOrg1Only(
  ctx: Context,
  assetId: string,
  value: string,
): Promise<void> {
  // Check caller's MSP ID
  const mspId = ctx.clientIdentity.getMSPID();

  if (mspId !== 'Org1MSP') {
    throw new Error(`Access denied: Only Org1MSP can create assets`);
  }

  const asset = {
    ID: assetId,
    value: value,
    createdBy: mspId,
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
  console.info(`Asset ${assetId} created by ${mspId}`);
}

/**
 * ACL: Only asset owner's organization can transfer
 */
@Transaction()
public async TransferAssetOwnerOrgOnly(
  ctx: Context,
  assetId: string,
  newOwner: string,
): Promise<void> {
  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  const callerMSP = ctx.clientIdentity.getMSPID();

  // Check if caller is from the same organization as the owner
  if (asset.ownerMSP !== callerMSP) {
    throw new Error(`Access denied: Only ${asset.ownerMSP} can transfer this asset`);
  }

  asset.Owner = newOwner;
  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}

/**
 * ACL: Multiple organizations allowed
 */
@Transaction()
public async UpdateAssetMultiOrg(
  ctx: Context,
  assetId: string,
  value: string,
): Promise<void> {
  const allowedOrgs = ['Org1MSP', 'Org2MSP', 'Org3MSP'];
  const callerMSP = ctx.clientIdentity.getMSPID();

  if (!allowedOrgs.includes(callerMSP)) {
    throw new Error(`Access denied: ${callerMSP} not in allowed organizations`);
  }

  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  asset.value = value;
  asset.lastUpdatedBy = callerMSP;

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}

/**
 * Reusable ACL helper
 */
private checkOrgAccess(ctx: Context, allowedOrgs: string[]): void {
  const callerMSP = ctx.clientIdentity.getMSPID();

  if (!allowedOrgs.includes(callerMSP)) {
    throw new Error(
      `Access denied: ${callerMSP} not authorized. Allowed: ${allowedOrgs.join(', ')}`,
    );
  }
}
```

### Key Points
- `ctx.clientIdentity.getMSPID()`: Get caller's organization
- Compare MSP ID against whitelist
- Throw error if not authorized
- Store creator MSP ID for ownership checks

---

## Pattern 5: Attribute-Based Access Control (ABAC)

### Overview
Fine-grained access control using client certificate attributes.

### Setting Up Attributes
Client certificates can have custom attributes (set during enrollment with Fabric CA):

```typescript
// During enrollment (Fabric CA)
const enrollmentRequest = {
  enrollmentID: 'user1',
  enrollmentSecret: 'user1pw',
  attrs: [
    { name: 'role', value: 'admin', ecert: true },
    { name: 'department', value: 'finance', ecert: true },
    { name: 'clearance', value: '5', ecert: true },
  ],
};
```

### TypeScript Chaincode Example

```typescript
/**
 * ABAC: Only users with 'admin' role can create
 */
@Transaction()
public async CreateAssetAdminOnly(
  ctx: Context,
  assetId: string,
  value: string,
): Promise<void> {
  // Get 'role' attribute from client certificate
  const role = ctx.clientIdentity.getAttributeValue('role');

  if (role !== 'admin') {
    throw new Error(`Access denied: Admin role required (current: ${role})`);
  }

  const asset = {
    ID: assetId,
    value: value,
    createdBy: ctx.clientIdentity.getID(),
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}

/**
 * ABAC: Department-based access
 */
@Transaction()
public async ReadSensitiveAsset(
  ctx: Context,
  assetId: string,
): Promise<string> {
  const department = ctx.clientIdentity.getAttributeValue('department');
  const allowedDepartments = ['finance', 'audit'];

  if (!allowedDepartments.includes(department)) {
    throw new Error(`Access denied: Department ${department} not authorized`);
  }

  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  return assetJSON.toString();
}

/**
 * ABAC: Clearance level-based access
 */
@Transaction()
public async AccessClassifiedAsset(
  ctx: Context,
  assetId: string,
): Promise<string> {
  const clearanceStr = ctx.clientIdentity.getAttributeValue('clearance');
  const clearance = parseInt(clearanceStr || '0', 10);

  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());
  const requiredClearance = asset.clearanceLevel || 0;

  if (clearance < requiredClearance) {
    throw new Error(
      `Access denied: Clearance ${clearance} < required ${requiredClearance}`,
    );
  }

  return assetJSON.toString();
}

/**
 * ABAC: Check if attribute exists
 */
@Transaction(false)
@Returns('boolean')
public async HasAttribute(
  ctx: Context,
  attributeName: string,
): Promise<boolean> {
  const { found } = ctx.clientIdentity.getAttributeValue(attributeName);
  return found;
}

/**
 * Reusable ABAC helper
 */
private checkAttributeAccess(
  ctx: Context,
  attributeName: string,
  allowedValues: string[],
): void {
  const value = ctx.clientIdentity.getAttributeValue(attributeName);

  if (!value) {
    throw new Error(`Access denied: Missing attribute ${attributeName}`);
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Access denied: ${attributeName}=${value} not in ${allowedValues.join(', ')}`,
    );
  }
}
```

### Key Points
- `ctx.clientIdentity.getAttributeValue(name)`: Get attribute from certificate
- Attributes must be set during enrollment (Fabric CA)
- Returns object with `{ value: string, found: boolean }`
- Use for fine-grained access control (role, department, clearance, etc.)

---

## Pattern 6: Private Data Collections

### Overview
Store private data that is only shared among specific organizations, not visible on the ledger.

### Collection Configuration
Define collections in `collections_config.json`:

```json
[
  {
    "name": "assetCollection",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 3,
    "memberOnlyRead": true,
    "memberOnlyWrite": true,
    "endorsementPolicy": {
      "signaturePolicy": "OR('Org1MSP.member', 'Org2MSP.member')"
    }
  },
  {
    "name": "priceCollection",
    "policy": "OR('Org1MSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 1,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": true
  }
]
```

### TypeScript Chaincode Example

```typescript
/**
 * Create asset with private data
 */
@Transaction()
public async CreateAssetWithPrivateData(
  ctx: Context,
  assetId: string,
): Promise<void> {
  // Get public data from transaction arguments
  const publicData = {
    ID: assetId,
    Color: 'blue',
    Size: 35,
    Owner: 'Alice',
  };

  // Get private data from transient map
  const transientMap = ctx.stub.getTransient();
  const privateDataBytes = transientMap.get('asset_properties');

  if (!privateDataBytes) {
    throw new Error('Private data not provided in transient map');
  }

  const privateData = JSON.parse(privateDataBytes.toString());

  // Store public data on ledger
  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(publicData)));

  // Store private data in collection
  await ctx.stub.putPrivateData(
    'assetCollection',
    assetId,
    Buffer.from(JSON.stringify(privateData)),
  );

  console.info(`Asset ${assetId} created with private data`);
}

/**
 * Read private data
 */
@Transaction(false)
@Returns('string')
public async ReadAssetPrivateData(
  ctx: Context,
  assetId: string,
  collection: string,
): Promise<string> {
  // Check if caller has access to collection
  const mspId = ctx.clientIdentity.getMSPID();
  const allowedOrgs = this.getCollectionAllowedOrgs(collection);

  if (!allowedOrgs.includes(mspId)) {
    throw new Error(`Organization ${mspId} not authorized for collection ${collection}`);
  }

  // Read private data
  const privateDataJSON = await ctx.stub.getPrivateData(collection, assetId);

  if (!privateDataJSON || privateDataJSON.length === 0) {
    throw new Error(`Private data for ${assetId} does not exist in ${collection}`);
  }

  return privateDataJSON.toString();
}

/**
 * Update private data
 */
@Transaction()
public async UpdateAssetPrivateData(
  ctx: Context,
  assetId: string,
  collection: string,
): Promise<void> {
  // Get new private data from transient map
  const transientMap = ctx.stub.getTransient();
  const privateDataBytes = transientMap.get('asset_properties');

  if (!privateDataBytes) {
    throw new Error('Private data not provided in transient map');
  }

  // Update private data
  await ctx.stub.putPrivateData(
    collection,
    assetId,
    privateDataBytes,
  );

  console.info(`Private data for ${assetId} updated in ${collection}`);
}

/**
 * Delete private data
 */
@Transaction()
public async DeleteAssetPrivateData(
  ctx: Context,
  assetId: string,
  collection: string,
): Promise<void> {
  await ctx.stub.delPrivateData(collection, assetId);
  console.info(`Private data for ${assetId} deleted from ${collection}`);
}

/**
 * Verify private data hash (for public verification)
 */
@Transaction(false)
@Returns('boolean')
public async VerifyAssetPrivateDataHash(
  ctx: Context,
  assetId: string,
  collection: string,
): Promise<boolean> {
  // Get private data hash from public ledger
  const hashBytes = await ctx.stub.getPrivateDataHash(collection, assetId);

  if (!hashBytes || hashBytes.length === 0) {
    return false;
  }

  return true;
}

private getCollectionAllowedOrgs(collection: string): string[] {
  const collections: Record<string, string[]> = {
    assetCollection: ['Org1MSP', 'Org2MSP'],
    priceCollection: ['Org1MSP'],
  };

  return collections[collection] || [];
}
```

### Key Points
- `putPrivateData(collection, key, value)`: Store private data
- `getPrivateData(collection, key)`: Read private data
- `delPrivateData(collection, key)`: Delete private data
- `getPrivateDataHash(collection, key)`: Get hash (public verification)
- Private data passed via transient map (not visible in transaction args)
- Only authorized organizations can read/write

---

## Pattern 7: Transient Data

### Overview
Pass sensitive data to chaincode without storing it on the ledger.

### TypeScript Chaincode Example

```typescript
/**
 * Process sensitive data via transient map
 */
@Transaction()
public async CreateAssetWithSensitiveData(
  ctx: Context,
  assetId: string,
  color: string,
  size: number,
): Promise<void> {
  // Get sensitive data from transient map (NOT from transaction args)
  const transientMap = ctx.stub.getTransient();

  const priceBytes = transientMap.get('price');
  const ownerSSNBytes = transientMap.get('ownerSSN');

  if (!priceBytes || !ownerSSNBytes) {
    throw new Error('Sensitive data not provided in transient map');
  }

  const price = parseInt(priceBytes.toString(), 10);
  const ownerSSN = ownerSSNBytes.toString();

  // Validate SSN format (example)
  if (!/^\d{3}-\d{2}-\d{4}$/.test(ownerSSN)) {
    throw new Error('Invalid SSN format');
  }

  // Store only non-sensitive data on ledger
  const asset = {
    ID: assetId,
    Color: color,
    Size: size,
    // Price and SSN NOT stored on public ledger
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

  // Store sensitive data in private data collection
  const privateData = {
    price: price,
    ownerSSNHash: this.hashSSN(ownerSSN), // Store hash, not plaintext
  };

  await ctx.stub.putPrivateData(
    'assetCollection',
    assetId,
    Buffer.from(JSON.stringify(privateData)),
  );

  console.info(`Asset ${assetId} created with sensitive data in transient map`);
}

/**
 * Verify transient data without storing
 */
@Transaction()
public async VerifyOwnershipWithPassword(
  ctx: Context,
  assetId: string,
  owner: string,
): Promise<void> {
  // Get password from transient map
  const transientMap = ctx.stub.getTransient();
  const passwordBytes = transientMap.get('password');

  if (!passwordBytes) {
    throw new Error('Password not provided in transient map');
  }

  const password = passwordBytes.toString();

  // Verify password (example: check against stored hash)
  const assetJSON = await ctx.stub.getState(assetId);
  if (!assetJSON || assetJSON.length === 0) {
    throw new Error(`Asset ${assetId} does not exist`);
  }

  const asset = JSON.parse(assetJSON.toString());

  // In real implementation, compare against bcrypt hash
  const isValid = this.verifyPassword(password, asset.ownerPasswordHash);

  if (!isValid) {
    throw new Error('Invalid password');
  }

  // Update owner if password valid
  asset.Owner = owner;
  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}

private hashSSN(ssn: string): string {
  // In real implementation, use crypto.createHash('sha256')
  return `HASH_${ssn.substring(0, 3)}`;
}

private verifyPassword(password: string, hash: string): boolean {
  // In real implementation, use bcrypt.compare
  return password === 'demo';
}
```

### NestJS Client Sending Transient Data

```typescript
import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';

@Injectable()
export class AssetTransientService {
  constructor(private readonly contractService: ContractService) {}

  async createAssetWithSensitiveData(
    channelName: string,
    chaincodeName: string,
    assetId: string,
    color: string,
    size: number,
    price: number,
    ownerSSN: string,
  ): Promise<void> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    // Create transaction
    const transaction = contract.createTransaction('CreateAssetWithSensitiveData');

    // Set transient data (NOT visible in transaction args)
    const transientData = {
      price: Buffer.from(price.toString()),
      ownerSSN: Buffer.from(ownerSSN),
    };

    transaction.setTransient(transientData);

    // Submit with regular args
    await transaction.submit(assetId, color, size.toString());
  }
}
```

### Key Points
- `ctx.stub.getTransient()`: Get transient map
- Transient data is NOT stored on ledger or in blocks
- Only visible to endorsing peers during transaction execution
- Use for passwords, SSNs, credit cards, etc.
- Client sends via `transaction.setTransient(map)`

---

## NestJS Module Setup

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { ContractService } from './contract.service';
import { ChaincodeEventListenerService } from './chaincode-event-listener.service';
import { AssetTransientService } from './asset-transient.service';

@Module({
  providers: [
    GatewayService,
    ContractService,
    ChaincodeEventListenerService,
    AssetTransientService,
  ],
  exports: [
    ChaincodeEventListenerService,
    AssetTransientService,
  ],
})
export class FabricAdvancedModule {}
```

### Controller Example

```typescript
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ContractService } from './contract.service';
import { AssetTransientService } from './asset-transient.service';

@Controller('fabric/advanced')
export class AdvancedController {
  constructor(
    private readonly contractService: ContractService,
    private readonly transientService: AssetTransientService,
  ) {}

  @Get('context/:channel/:chaincode')
  async getTransactionContext(
    @Param('channel') channel: string,
    @Param('chaincode') chaincode: string,
  ) {
    const contract = await this.contractService.getContract(channel, chaincode);
    const result = await contract.evaluateTransaction('GetTransactionCreator');
    return JSON.parse(result.toString());
  }

  @Post('asset/sensitive')
  async createAssetWithSensitiveData(
    @Body() body: {
      channel: string;
      chaincode: string;
      assetId: string;
      color: string;
      size: number;
      price: number;
      ownerSSN: string;
    },
  ) {
    await this.transientService.createAssetWithSensitiveData(
      body.channel,
      body.chaincode,
      body.assetId,
      body.color,
      body.size,
      body.price,
      body.ownerSSN,
    );

    return { success: true, assetId: body.assetId };
  }
}
```

---

## Testing Patterns

### Unit Testing Advanced Features

```typescript
import { Test } from '@nestjs/testing';
import { AssetTransientService } from './asset-transient.service';
import { ContractService } from './contract.service';
import * as sinon from 'sinon';

describe('AssetTransientService', () => {
  let service: AssetTransientService;
  let contractService: ContractService;
  let mockContract: any;
  let mockTransaction: any;

  beforeEach(async () => {
    mockTransaction = {
      setTransient: sinon.stub(),
      submit: sinon.stub().resolves(),
    };

    mockContract = {
      createTransaction: sinon.stub().returns(mockTransaction),
    };

    const module = await Test.createTestingModule({
      providers: [
        AssetTransientService,
        {
          provide: ContractService,
          useValue: {
            getContract: sinon.stub().resolves(mockContract),
          },
        },
      ],
    }).compile();

    service = module.get<AssetTransientService>(AssetTransientService);
    contractService = module.get<ContractService>(ContractService);
  });

  it('should create asset with transient data', async () => {
    await service.createAssetWithSensitiveData(
      'mychannel',
      'basic',
      'asset1',
      'blue',
      5,
      1000,
      '123-45-6789',
    );

    expect(mockContract.createTransaction.calledWith('CreateAssetWithSensitiveData')).toBe(true);
    expect(mockTransaction.setTransient.called).toBe(true);
    expect(mockTransaction.submit.calledWith('asset1', 'blue', '5')).toBe(true);
  });
});
```

---

## Common Pitfalls

### 1. Storing Sensitive Data in Transaction Args
```typescript
// ❌ BAD: SSN visible in transaction args (stored in blocks!)
await contract.submitTransaction('CreateAsset', assetId, color, '123-45-6789');

// ✅ GOOD: SSN in transient map (not stored)
const transaction = contract.createTransaction('CreateAsset');
transaction.setTransient({ ssn: Buffer.from('123-45-6789') });
await transaction.submit(assetId, color);
```

### 2. Not Checking Access Control
```typescript
// ❌ BAD: No access control
@Transaction()
public async DeleteAsset(ctx: Context, assetId: string): Promise<void> {
  await ctx.stub.delState(assetId);
}

// ✅ GOOD: Check MSP ID
@Transaction()
public async DeleteAsset(ctx: Context, assetId: string): Promise<void> {
  const mspId = ctx.clientIdentity.getMSPID();
  if (mspId !== 'Org1MSP') {
    throw new Error('Access denied');
  }
  await ctx.stub.delState(assetId);
}
```

### 3. Missing Event Data
```typescript
// ❌ BAD: Event with no payload
ctx.stub.setEvent('AssetCreated', Buffer.from(''));

// ✅ GOOD: Event with meaningful payload
const payload = { assetId, owner, timestamp };
ctx.stub.setEvent('AssetCreated', Buffer.from(JSON.stringify(payload)));
```

---

## Performance Optimization

### 1. Minimize Cross-Chaincode Calls
Cross-chaincode invocations add latency.

```typescript
// ❌ SLOW: Multiple cross-chaincode calls
const data1 = await ctx.stub.invokeChaincode('cc1', ['GetData'], channel);
const data2 = await ctx.stub.invokeChaincode('cc2', ['GetData'], channel);

// ✅ BETTER: Batch data in single call or cache results
const batchData = await ctx.stub.invokeChaincode('cc1', ['GetBatchData'], channel);
```

### 2. Use Private Data for Large Sensitive Data
```typescript
// ✅ GOOD: Large sensitive data in private collection
await ctx.stub.putPrivateData('collection', key, largeData);

// Public ledger only stores hash
const hash = await ctx.stub.getPrivateDataHash('collection', key);
```

---

## Summary

This specialist covers:
1. **Transaction Context**: get-creator, get-transaction-id, get-transaction-timestamp
2. **Chaincode Events**: set-event with custom payloads
3. **Chaincode-to-Chaincode**: Cross-chaincode invocation patterns
4. **Access Control Lists**: Organization-based access (MSP ID)
5. **Attribute-Based Access Control**: Certificate attribute-based access
6. **Private Data Collections**: Organization-scoped private data
7. **Transient Data**: Sensitive data without ledger storage

**Related Specialists**:
- Chaincode Core Specialist: Basic operations
- Chaincode Queries & Keys Specialist: Query patterns
- Fabric Gateway & Transactions Specialist: Client-side integration
