# Chaincode Queries & Keys Specialist

## Purpose
Expert in Hyperledger Fabric chaincode querying patterns, composite key management, range queries, rich queries (CouchDB), pagination, iterators, and deterministic operations for NestJS + Fabric applications.

## Specialization Areas
1. **Range Queries**: getStateByRange for key-based range queries
2. **Composite Keys**: Creating and splitting composite keys for complex data structures
3. **Partial Composite Key Queries**: Querying with partial composite keys
4. **Rich Queries**: CouchDB selector-based queries with JSON
5. **Query Results**: Processing query result iterators
6. **Key History**: Retrieving key modification history
7. **Pagination**: Paginated query results with bookmarks
8. **Iterator Management**: Proper iterator handling and cleanup
9. **Deterministic Operations**: Ensuring chaincode determinism

## Related Specialists
- **Chaincode Core Specialist**: Basic state operations (getState, putState, delState)
- **Chaincode Advanced Specialist**: Events, access control, private data
- **Fabric Gateway & Transactions Specialist**: Transaction submission and evaluation

---

## Pattern 1: Range Queries (getStateByRange)

### Overview
`getStateByRange` retrieves all assets within a specified key range (lexicographically ordered).

### TypeScript Chaincode Example

```typescript
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

interface Asset {
  ID: string;
  Color: string;
  Size: number;
  Owner: string;
  AppraisedValue: number;
}

@Info({
  title: 'AssetQueries',
  description: 'Chaincode for querying assets',
})
export class AssetQueriesContract extends Contract {

  /**
   * GetAssetsByRange retrieves all assets within a key range
   * @param startKey - Starting key (inclusive)
   * @param endKey - Ending key (exclusive)
   * @returns Array of assets
   */
  @Transaction(false) // Read-only
  @Returns('string')
  public async GetAssetsByRange(
    ctx: Context,
    startKey: string,
    endKey: string,
  ): Promise<string> {
    const results: Asset[] = [];

    // Get iterator for key range
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);

    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record: Asset;
      try {
        record = JSON.parse(strValue);
        results.push(record);
      } catch (err) {
        console.log(err);
      }
      result = await iterator.next();
    }

    // Always close iterator
    await iterator.close();

    return JSON.stringify(results);
  }
}
```

### NestJS Service Integration

```typescript
import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';

@Injectable()
export class AssetQueryService {
  constructor(private readonly contractService: ContractService) {}

  /**
   * Get assets within a key range
   */
  async getAssetsByRange(
    channelName: string,
    chaincodeName: string,
    startKey: string,
    endKey: string,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'GetAssetsByRange',
      startKey,
      endKey,
    );

    return JSON.parse(resultBytes.toString());
  }

  /**
   * Get all assets (using empty start/end keys)
   */
  async getAllAssets(
    channelName: string,
    chaincodeName: string,
  ): Promise<any[]> {
    return this.getAssetsByRange(channelName, chaincodeName, '', '');
  }
}
```

### Key Points
- `getStateByRange(startKey, endKey)`: startKey is inclusive, endKey is exclusive
- Empty strings `('', '')` retrieve all keys
- Always close iterators to prevent resource leaks
- Use `@Transaction(false)` for read-only queries

---

## Pattern 2: Composite Keys

### Overview
Composite keys enable complex data structures by combining multiple attributes into a single key (e.g., `owner~asset~id`).

### TypeScript Chaincode Example

```typescript
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({
  title: 'CompositeKeyContract',
  description: 'Chaincode demonstrating composite key usage',
})
export class CompositeKeyContract extends Contract {

  /**
   * Create asset with composite key: owner~name~id
   */
  @Transaction()
  public async CreateAssetWithCompositeKey(
    ctx: Context,
    owner: string,
    assetName: string,
    assetId: string,
    color: string,
    size: number,
  ): Promise<void> {
    // Create composite key
    const compositeKey = ctx.stub.createCompositeKey('owner~asset', [
      owner,
      assetName,
      assetId,
    ]);

    const asset = {
      docType: 'asset',
      owner,
      assetName,
      assetId,
      color,
      size,
    };

    await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(asset)));
    console.info(`Asset ${compositeKey} created`);
  }

  /**
   * Read asset using composite key
   */
  @Transaction(false)
  @Returns('string')
  public async ReadAssetByCompositeKey(
    ctx: Context,
    owner: string,
    assetName: string,
    assetId: string,
  ): Promise<string> {
    const compositeKey = ctx.stub.createCompositeKey('owner~asset', [
      owner,
      assetName,
      assetId,
    ]);

    const assetJSON = await ctx.stub.getState(compositeKey);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset ${compositeKey} does not exist`);
    }

    return assetJSON.toString();
  }

  /**
   * Delete asset using composite key
   */
  @Transaction()
  public async DeleteAssetByCompositeKey(
    ctx: Context,
    owner: string,
    assetName: string,
    assetId: string,
  ): Promise<void> {
    const compositeKey = ctx.stub.createCompositeKey('owner~asset', [
      owner,
      assetName,
      assetId,
    ]);

    const exists = await this.AssetExists(ctx, compositeKey);
    if (!exists) {
      throw new Error(`Asset ${compositeKey} does not exist`);
    }

    await ctx.stub.delState(compositeKey);
  }

  private async AssetExists(ctx: Context, key: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(key);
    return assetJSON && assetJSON.length > 0;
  }
}
```

### Splitting Composite Keys

```typescript
/**
 * Split composite key to extract attributes
 */
@Transaction(false)
@Returns('string')
public async GetAssetAttributes(
  ctx: Context,
  compositeKey: string,
): Promise<string> {
  // Split composite key
  const splitKey = ctx.stub.splitCompositeKey(compositeKey);

  if (!splitKey || !splitKey.attributes) {
    throw new Error('Invalid composite key');
  }

  const attributes = {
    objectType: splitKey.objectType,
    owner: splitKey.attributes[0],
    assetName: splitKey.attributes[1],
    assetId: splitKey.attributes[2],
  };

  return JSON.stringify(attributes);
}
```

### Key Points
- `createCompositeKey(objectType, attributes[])`: Creates composite key
- `splitCompositeKey(compositeKey)`: Extracts objectType and attributes
- Composite keys are lexicographically ordered
- Use consistent attribute order across operations

---

## Pattern 3: Partial Composite Key Queries

### Overview
Query assets using partial composite keys (e.g., all assets for a specific owner).

### TypeScript Chaincode Example

```typescript
/**
 * Get all assets owned by a specific owner
 */
@Transaction(false)
@Returns('string')
public async GetAssetsByOwner(
  ctx: Context,
  owner: string,
): Promise<string> {
  const results: any[] = [];

  // Query with partial composite key (only owner attribute)
  const iterator = await ctx.stub.getStateByPartialCompositeKey(
    'owner~asset',
    [owner],
  );

  let result = await iterator.next();
  while (!result.done) {
    const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    let record: any;
    try {
      record = JSON.parse(strValue);
      results.push(record);
    } catch (err) {
      console.log(err);
    }
    result = await iterator.next();
  }

  await iterator.close();

  return JSON.stringify(results);
}

/**
 * Get all assets of a specific type for an owner
 */
@Transaction(false)
@Returns('string')
public async GetAssetsByOwnerAndType(
  ctx: Context,
  owner: string,
  assetName: string,
): Promise<string> {
  const results: any[] = [];

  // Query with 2 attributes (owner + assetName)
  const iterator = await ctx.stub.getStateByPartialCompositeKey(
    'owner~asset',
    [owner, assetName],
  );

  let result = await iterator.next();
  while (!result.done) {
    const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    let record: any;
    try {
      record = JSON.parse(strValue);
      results.push(record);
    } catch (err) {
      console.log(err);
    }
    result = await iterator.next();
  }

  await iterator.close();

  return JSON.stringify(results);
}
```

### NestJS Service

```typescript
@Injectable()
export class CompositeKeyQueryService {
  constructor(private readonly contractService: ContractService) {}

  /**
   * Get all assets for a specific owner
   */
  async getAssetsByOwner(
    channelName: string,
    chaincodeName: string,
    owner: string,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'GetAssetsByOwner',
      owner,
    );

    return JSON.parse(resultBytes.toString());
  }

  /**
   * Get assets by owner and asset type
   */
  async getAssetsByOwnerAndType(
    channelName: string,
    chaincodeName: string,
    owner: string,
    assetName: string,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'GetAssetsByOwnerAndType',
      owner,
      assetName,
    );

    return JSON.parse(resultBytes.toString());
  }
}
```

### Key Points
- `getStateByPartialCompositeKey(objectType, attributes[])`: Query with partial key
- Can specify 0 to N attributes
- Results are lexicographically ordered
- More attributes = more specific query

---

## Pattern 4: Rich Queries (CouchDB)

### Overview
Rich queries use CouchDB selector syntax for complex JSON-based queries (requires CouchDB state database).

### TypeScript Chaincode Example

```typescript
/**
 * Query assets by color (rich query)
 */
@Transaction(false)
@Returns('string')
public async QueryAssetsByColor(
  ctx: Context,
  color: string,
): Promise<string> {
  const queryString = {
    selector: {
      docType: 'asset',
      color: color,
    },
  };

  return await this.GetQueryResultForQueryString(
    ctx,
    JSON.stringify(queryString),
  );
}

/**
 * Query assets with multiple conditions
 */
@Transaction(false)
@Returns('string')
public async QueryAssetsByOwnerAndColor(
  ctx: Context,
  owner: string,
  color: string,
): Promise<string> {
  const queryString = {
    selector: {
      docType: 'asset',
      owner: owner,
      color: color,
    },
  };

  return await this.GetQueryResultForQueryString(
    ctx,
    JSON.stringify(queryString),
  );
}

/**
 * Query assets with range conditions
 */
@Transaction(false)
@Returns('string')
public async QueryAssetsByValueRange(
  ctx: Context,
  minValue: number,
  maxValue: number,
): Promise<string> {
  const queryString = {
    selector: {
      docType: 'asset',
      appraisedValue: {
        $gte: minValue,
        $lte: maxValue,
      },
    },
    sort: [{ appraisedValue: 'desc' }],
  };

  return await this.GetQueryResultForQueryString(
    ctx,
    JSON.stringify(queryString),
  );
}

/**
 * Helper: Execute query string and return results
 */
private async GetQueryResultForQueryString(
  ctx: Context,
  queryString: string,
): Promise<string> {
  const resultsIterator = await ctx.stub.getQueryResult(queryString);
  const results: any[] = [];

  let result = await resultsIterator.next();
  while (!result.done) {
    const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    let record: any;
    try {
      record = JSON.parse(strValue);
      results.push(record);
    } catch (err) {
      console.log(err);
    }
    result = await resultsIterator.next();
  }

  await resultsIterator.close();

  return JSON.stringify(results);
}
```

### CouchDB Selector Examples

```typescript
// 1. Exact match
{
  selector: {
    docType: 'asset',
    owner: 'Alice',
  }
}

// 2. Range query
{
  selector: {
    docType: 'asset',
    appraisedValue: {
      $gte: 1000,
      $lte: 5000,
    }
  }
}

// 3. Multiple conditions (AND)
{
  selector: {
    docType: 'asset',
    owner: 'Alice',
    color: 'blue',
    size: { $gt: 10 }
  }
}

// 4. OR conditions
{
  selector: {
    docType: 'asset',
    $or: [
      { color: 'blue' },
      { color: 'red' }
    ]
  }
}

// 5. Sort and limit
{
  selector: {
    docType: 'asset',
  },
  sort: [{ appraisedValue: 'desc' }],
  limit: 10
}
```

### NestJS Service

```typescript
@Injectable()
export class RichQueryService {
  constructor(private readonly contractService: ContractService) {}

  /**
   * Query assets by color
   */
  async queryAssetsByColor(
    channelName: string,
    chaincodeName: string,
    color: string,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'QueryAssetsByColor',
      color,
    );

    return JSON.parse(resultBytes.toString());
  }

  /**
   * Query assets with value range
   */
  async queryAssetsByValueRange(
    channelName: string,
    chaincodeName: string,
    minValue: number,
    maxValue: number,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'QueryAssetsByValueRange',
      minValue.toString(),
      maxValue.toString(),
    );

    return JSON.parse(resultBytes.toString());
  }
}
```

### Key Points
- Requires CouchDB state database (not LevelDB)
- Use CouchDB selector syntax (MongoDB-like)
- Supports operators: `$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$in`, `$or`, `$and`
- Can sort and limit results
- Create indexes for better performance

---

## Pattern 5: Key History Queries

### Overview
Retrieve the complete modification history of a specific key (all transactions that modified it).

### TypeScript Chaincode Example

```typescript
/**
 * Get history of changes for an asset
 */
@Transaction(false)
@Returns('string')
public async GetAssetHistory(
  ctx: Context,
  assetId: string,
): Promise<string> {
  const resultsIterator = await ctx.stub.getHistoryForKey(assetId);
  const results: any[] = [];

  let result = await resultsIterator.next();
  while (!result.done) {
    const modification: any = {
      txId: result.value.txId,
      timestamp: result.value.timestamp,
      isDelete: result.value.isDelete,
    };

    if (!result.value.isDelete && result.value.value) {
      try {
        modification.value = JSON.parse(
          result.value.value.toString('utf8'),
        );
      } catch (err) {
        modification.value = result.value.value.toString('utf8');
      }
    }

    results.push(modification);
    result = await resultsIterator.next();
  }

  await resultsIterator.close();

  return JSON.stringify(results);
}
```

### History Response Structure

```typescript
interface HistoryRecord {
  txId: string;           // Transaction ID that modified the key
  timestamp: {
    seconds: number;
    nanos: number;
  };
  isDelete: boolean;      // True if this transaction deleted the key
  value?: any;            // The value at this point in history (if not deleted)
}
```

### NestJS Service

```typescript
@Injectable()
export class AssetHistoryService {
  constructor(private readonly contractService: ContractService) {}

  /**
   * Get complete history of an asset
   */
  async getAssetHistory(
    channelName: string,
    chaincodeName: string,
    assetId: string,
  ): Promise<any[]> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'GetAssetHistory',
      assetId,
    );

    return JSON.parse(resultBytes.toString());
  }

  /**
   * Get asset ownership history
   */
  async getOwnershipHistory(
    channelName: string,
    chaincodeName: string,
    assetId: string,
  ): Promise<string[]> {
    const history = await this.getAssetHistory(
      channelName,
      chaincodeName,
      assetId,
    );

    return history
      .filter(record => !record.isDelete && record.value)
      .map(record => record.value.owner);
  }
}
```

### Key Points
- Returns chronological history of all modifications
- Includes transaction ID and timestamp
- `isDelete: true` indicates deletion transactions
- Useful for audit trails and provenance tracking

---

## Pattern 6: Pagination

### Overview
Paginate query results using bookmarks to handle large result sets efficiently.

### TypeScript Chaincode Example

```typescript
interface PaginatedQueryResult {
  records: any[];
  fetchedRecordsCount: number;
  bookmark: string;
}

/**
 * Query assets with pagination
 */
@Transaction(false)
@Returns('string')
public async QueryAssetsWithPagination(
  ctx: Context,
  pageSize: number,
  bookmark: string,
): Promise<string> {
  const queryString = {
    selector: {
      docType: 'asset',
    },
  };

  const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
    JSON.stringify(queryString),
    pageSize,
    bookmark,
  );

  const results = await this.GetAllResults(iterator);

  const paginatedResult: PaginatedQueryResult = {
    records: results,
    fetchedRecordsCount: metadata.fetchedRecordsCount,
    bookmark: metadata.bookmark,
  };

  return JSON.stringify(paginatedResult);
}

/**
 * Query by range with pagination
 */
@Transaction(false)
@Returns('string')
public async GetAssetsByRangeWithPagination(
  ctx: Context,
  startKey: string,
  endKey: string,
  pageSize: number,
  bookmark: string,
): Promise<string> {
  const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(
    startKey,
    endKey,
    pageSize,
    bookmark,
  );

  const results = await this.GetAllResults(iterator);

  const paginatedResult: PaginatedQueryResult = {
    records: results,
    fetchedRecordsCount: metadata.fetchedRecordsCount,
    bookmark: metadata.bookmark,
  };

  return JSON.stringify(paginatedResult);
}

private async GetAllResults(iterator: any): Promise<any[]> {
  const results: any[] = [];

  let result = await iterator.next();
  while (!result.done) {
    const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    let record: any;
    try {
      record = JSON.parse(strValue);
      results.push(record);
    } catch (err) {
      console.log(err);
    }
    result = await iterator.next();
  }

  await iterator.close();

  return results;
}
```

### NestJS Service with Pagination

```typescript
@Injectable()
export class PaginatedQueryService {
  constructor(private readonly contractService: ContractService) {}

  /**
   * Get paginated assets
   */
  async getAssetsPaginated(
    channelName: string,
    chaincodeName: string,
    pageSize: number,
    bookmark?: string,
  ): Promise<PaginatedQueryResult> {
    const contract = await this.contractService.getContract(
      channelName,
      chaincodeName,
    );

    const resultBytes = await contract.evaluateTransaction(
      'QueryAssetsWithPagination',
      pageSize.toString(),
      bookmark || '',
    );

    return JSON.parse(resultBytes.toString());
  }

  /**
   * Get all pages (iterate through all bookmarks)
   */
  async getAllAssetsPaginated(
    channelName: string,
    chaincodeName: string,
    pageSize: number,
  ): Promise<any[]> {
    const allRecords: any[] = [];
    let bookmark = '';

    do {
      const page = await this.getAssetsPaginated(
        channelName,
        chaincodeName,
        pageSize,
        bookmark,
      );

      allRecords.push(...page.records);
      bookmark = page.bookmark;
    } while (bookmark);

    return allRecords;
  }
}
```

### Key Points
- `getQueryResultWithPagination(query, pageSize, bookmark)`: Paginate rich queries
- `getStateByRangeWithPagination(start, end, pageSize, bookmark)`: Paginate range queries
- Empty bookmark `''` starts from beginning
- Empty bookmark in response = no more pages
- Bookmarks are opaque strings (do not parse or modify)

---

## Pattern 7: Iterator Management

### Overview
Proper iterator handling to prevent resource leaks and ensure clean operation.

### Best Practices

```typescript
/**
 * ✅ GOOD: Always close iterators
 */
@Transaction(false)
public async QueryAssetsGood(ctx: Context): Promise<string> {
  const queryString = { selector: { docType: 'asset' } };
  const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));

  try {
    const results: any[] = [];
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      try {
        const record = JSON.parse(strValue);
        results.push(record);
      } catch (err) {
        console.log(`Failed to parse record: ${err}`);
      }
      result = await iterator.next();
    }

    return JSON.stringify(results);
  } finally {
    // Always close iterator, even if error occurs
    await iterator.close();
  }
}

/**
 * ❌ BAD: Iterator not closed (resource leak)
 */
@Transaction(false)
public async QueryAssetsBad(ctx: Context): Promise<string> {
  const queryString = { selector: { docType: 'asset' } };
  const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));

  const results: any[] = [];
  let result = await iterator.next();

  while (!result.done) {
    const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    const record = JSON.parse(strValue);
    results.push(record);
    result = await iterator.next();
  }

  // Missing: await iterator.close(); ❌
  return JSON.stringify(results);
}
```

### Reusable Iterator Processor

```typescript
/**
 * Generic iterator processor with automatic cleanup
 */
private async processIterator<T>(
  iterator: any,
  parser: (value: string) => T,
): Promise<T[]> {
  const results: T[] = [];

  try {
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');

      try {
        const parsed = parser(strValue);
        results.push(parsed);
      } catch (err) {
        console.log(`Failed to parse record: ${err}`);
      }

      result = await iterator.next();
    }
  } finally {
    await iterator.close();
  }

  return results;
}

/**
 * Usage example
 */
@Transaction(false)
public async GetAllAssets(ctx: Context): Promise<string> {
  const iterator = await ctx.stub.getStateByRange('', '');

  const results = await this.processIterator(
    iterator,
    (value) => JSON.parse(value),
  );

  return JSON.stringify(results);
}
```

### Key Points
- Always close iterators with `await iterator.close()`
- Use try-finally blocks to ensure cleanup
- Handle parse errors gracefully
- Create reusable iterator processing utilities

---

## Pattern 8: Deterministic Chaincode

### Overview
Chaincode must be deterministic to ensure all peers reach consensus. Non-deterministic operations will cause endorsement failures.

### Deterministic Rules

```typescript
/**
 * ✅ DETERMINISTIC: Safe operations
 */
@Transaction()
public async DeterministicExample(ctx: Context): Promise<void> {
  // ✅ Reading from ledger (deterministic)
  const value = await ctx.stub.getState('key1');

  // ✅ Transaction timestamp (same across all peers for same tx)
  const txTimestamp = ctx.stub.getTxTimestamp();

  // ✅ Transaction ID (same across all peers for same tx)
  const txId = ctx.stub.getTxID();

  // ✅ Client identity (same across all peers for same tx)
  const clientId = ctx.clientIdentity.getID();

  // ✅ Deterministic calculations
  const result = 100 + 200;

  // ✅ Transient data (same across all peers for same tx)
  const transientMap = ctx.stub.getTransient();
}

/**
 * ❌ NON-DETERMINISTIC: Avoid these operations
 */
@Transaction()
public async NonDeterministicExample(ctx: Context): Promise<void> {
  // ❌ Current time (different on each peer)
  const now = new Date(); // DON'T DO THIS!

  // ❌ Random numbers (different on each peer)
  const random = Math.random(); // DON'T DO THIS!

  // ❌ External API calls (different results, timing)
  // const data = await fetch('https://api.example.com'); // DON'T DO THIS!

  // ❌ Reading local files (different on each peer)
  // const file = fs.readFileSync('/tmp/data.json'); // DON'T DO THIS!

  // ❌ UUID generation (different on each peer)
  // const id = uuidv4(); // DON'T DO THIS!
}
```

### How to Handle Time

```typescript
/**
 * ✅ CORRECT: Use transaction timestamp
 */
@Transaction()
public async CreateAssetWithTimestamp(
  ctx: Context,
  assetId: string,
  value: string,
): Promise<void> {
  // Get transaction timestamp (same on all peers)
  const txTimestamp = ctx.stub.getTxTimestamp();

  const asset = {
    ID: assetId,
    value: value,
    createdAt: {
      seconds: txTimestamp.seconds.toNumber(),
      nanos: txTimestamp.nanos,
    },
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}
```

### How to Handle Random/Unique IDs

```typescript
/**
 * ✅ CORRECT: Use transaction ID for uniqueness
 */
@Transaction()
public async CreateAssetWithUniqueId(
  ctx: Context,
  value: string,
): Promise<void> {
  // Use transaction ID (unique and deterministic)
  const txId = ctx.stub.getTxID();

  const asset = {
    ID: txId, // Unique per transaction
    value: value,
  };

  await ctx.stub.putState(txId, Buffer.from(JSON.stringify(asset)));
}

/**
 * ✅ ALTERNATIVE: Client provides unique ID
 */
@Transaction()
public async CreateAssetWithClientId(
  ctx: Context,
  assetId: string, // Client generates and sends
  value: string,
): Promise<void> {
  const asset = {
    ID: assetId,
    value: value,
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}
```

### How to Handle External Data

```typescript
/**
 * ✅ CORRECT: Use transient data for external information
 */
@Transaction()
public async CreateAssetWithExternalData(
  ctx: Context,
  assetId: string,
): Promise<void> {
  // Get external data from transient map (provided by client)
  const transientMap = ctx.stub.getTransient();
  const externalDataBytes = transientMap.get('externalData');

  if (!externalDataBytes) {
    throw new Error('External data not provided in transient map');
  }

  const externalData = JSON.parse(externalDataBytes.toString());

  const asset = {
    ID: assetId,
    externalData: externalData,
  };

  await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));
}
```

### Key Points
- Use `ctx.stub.getTxTimestamp()` for time (NOT `new Date()`)
- Use `ctx.stub.getTxID()` for unique IDs (NOT `uuidv4()`)
- NO random numbers, NO external API calls, NO file I/O
- Client provides non-deterministic data via transaction args or transient map
- All peers must reach same result for endorsement to succeed

---

## NestJS Module Setup

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { ContractService } from './contract.service';
import { AssetQueryService } from './asset-query.service';
import { CompositeKeyQueryService } from './composite-key-query.service';
import { RichQueryService } from './rich-query.service';
import { AssetHistoryService } from './asset-history.service';
import { PaginatedQueryService } from './paginated-query.service';

@Module({
  providers: [
    GatewayService,
    ContractService,
    AssetQueryService,
    CompositeKeyQueryService,
    RichQueryService,
    AssetHistoryService,
    PaginatedQueryService,
  ],
  exports: [
    AssetQueryService,
    CompositeKeyQueryService,
    RichQueryService,
    AssetHistoryService,
    PaginatedQueryService,
  ],
})
export class FabricQueryModule {}
```

### Controller Example

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { AssetQueryService } from './asset-query.service';
import { RichQueryService } from './rich-query.service';
import { PaginatedQueryService } from './paginated-query.service';

@Controller('fabric/assets')
export class AssetQueryController {
  constructor(
    private readonly assetQueryService: AssetQueryService,
    private readonly richQueryService: RichQueryService,
    private readonly paginatedQueryService: PaginatedQueryService,
  ) {}

  @Get('range')
  async getAssetsByRange(
    @Query('channel') channel: string,
    @Query('chaincode') chaincode: string,
    @Query('startKey') startKey: string,
    @Query('endKey') endKey: string,
  ) {
    return this.assetQueryService.getAssetsByRange(
      channel,
      chaincode,
      startKey,
      endKey,
    );
  }

  @Get('color')
  async getAssetsByColor(
    @Query('channel') channel: string,
    @Query('chaincode') chaincode: string,
    @Query('color') color: string,
  ) {
    return this.richQueryService.queryAssetsByColor(
      channel,
      chaincode,
      color,
    );
  }

  @Get('paginated')
  async getAssetsPaginated(
    @Query('channel') channel: string,
    @Query('chaincode') chaincode: string,
    @Query('pageSize') pageSize: number,
    @Query('bookmark') bookmark?: string,
  ) {
    return this.paginatedQueryService.getAssetsPaginated(
      channel,
      chaincode,
      pageSize,
      bookmark,
    );
  }
}
```

---

## Testing Patterns

### Unit Testing Queries

```typescript
import { Test } from '@nestjs/testing';
import { AssetQueryService } from './asset-query.service';
import { ContractService } from './contract.service';
import * as sinon from 'sinon';

describe('AssetQueryService', () => {
  let service: AssetQueryService;
  let contractService: ContractService;
  let mockContract: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AssetQueryService,
        {
          provide: ContractService,
          useValue: {
            getContract: sinon.stub(),
          },
        },
      ],
    }).compile();

    service = module.get<AssetQueryService>(AssetQueryService);
    contractService = module.get<ContractService>(ContractService);

    mockContract = {
      evaluateTransaction: sinon.stub(),
    };

    sinon.stub(contractService, 'getContract').resolves(mockContract);
  });

  it('should query assets by range', async () => {
    const mockAssets = [
      { ID: 'asset1', Color: 'blue' },
      { ID: 'asset2', Color: 'red' },
    ];

    mockContract.evaluateTransaction.resolves(
      Buffer.from(JSON.stringify(mockAssets)),
    );

    const result = await service.getAssetsByRange(
      'mychannel',
      'basic',
      'asset1',
      'asset3',
    );

    expect(result).toEqual(mockAssets);
    expect(mockContract.evaluateTransaction.calledWith(
      'GetAssetsByRange',
      'asset1',
      'asset3',
    )).toBe(true);
  });
});
```

---

## Common Pitfalls

### 1. Iterator Leaks
```typescript
// ❌ BAD: Iterator not closed
const iterator = await ctx.stub.getStateByRange('', '');
const results = await processResults(iterator);
return JSON.stringify(results);

// ✅ GOOD: Always close
const iterator = await ctx.stub.getStateByRange('', '');
try {
  const results = await processResults(iterator);
  return JSON.stringify(results);
} finally {
  await iterator.close();
}
```

### 2. Non-Deterministic Operations
```typescript
// ❌ BAD: Using current time
const timestamp = new Date().toISOString();

// ✅ GOOD: Using transaction timestamp
const txTimestamp = ctx.stub.getTxTimestamp();
const timestamp = txTimestamp.seconds.toNumber();
```

### 3. Large Result Sets Without Pagination
```typescript
// ❌ BAD: Querying all records (could be millions)
const allAssets = await ctx.stub.getStateByRange('', '');

// ✅ GOOD: Use pagination
const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(
  '', '', 100, bookmark
);
```

---

## Performance Optimization

### 1. Use Indexes for Rich Queries
Create CouchDB indexes to speed up queries:

```json
// indexes/indexOwner.json
{
  "index": {
    "fields": ["docType", "owner"]
  },
  "ddoc": "indexOwnerDoc",
  "name": "indexOwner",
  "type": "json"
}
```

### 2. Limit Result Sets
```typescript
const queryString = {
  selector: { docType: 'asset' },
  limit: 100, // Limit results
};
```

### 3. Use Partial Composite Keys
More specific queries return fewer results:

```typescript
// Less specific (more results)
await ctx.stub.getStateByPartialCompositeKey('owner~asset', []);

// More specific (fewer results)
await ctx.stub.getStateByPartialCompositeKey('owner~asset', ['Alice', 'car']);
```

---

## Summary

This specialist covers:
1. **Range Queries**: getStateByRange for key-based queries
2. **Composite Keys**: Multi-attribute key structures
3. **Partial Composite Key Queries**: Querying with partial keys
4. **Rich Queries**: CouchDB selector-based queries
5. **Key History**: Transaction history for keys
6. **Pagination**: Handling large result sets with bookmarks
7. **Iterator Management**: Proper cleanup to prevent leaks
8. **Deterministic Operations**: Ensuring consensus across peers

**Next Steps**: See Chaincode Advanced Specialist for events, access control, and private data patterns.
