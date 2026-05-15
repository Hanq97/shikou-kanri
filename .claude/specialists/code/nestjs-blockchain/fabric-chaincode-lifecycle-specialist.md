# Fabric Chaincode Lifecycle & Identity Management Specialist

**Domain**: Hyperledger Fabric - Chaincode Lifecycle & Identity Management
**Stack**: NestJS + Hyperledger Fabric
**Responsibility**: Chaincode deployment lifecycle, Certificate Authority (CA) operations, identity/wallet management, network configuration
**Pattern Count**: 13 patterns

---

## Overview

This specialist handles Hyperledger Fabric chaincode lifecycle management (package, install, approve, commit), Certificate Authority (CA) operations for enrollment and registration, identity management, wallet operations, connection profiles, peer lifecycle, orderer Raft consensus, and backup/restore procedures.

**Core Competencies**:
- Chaincode Lifecycle Management (v2.x)
- Fabric CA Enrollment & Registration
- Identity & Wallet Management
- Connection Profile Configuration
- Peer & Orderer Lifecycle
- Raft Consensus Configuration
- Backup & Restore Procedures

---

## Pattern Index

### Chaincode Lifecycle (5 patterns)
1. Chaincode Package
2. Chaincode Install
3. Chaincode Approve
4. Chaincode Commit
5. Chaincode Lifecycle Management

### Identity & CA (4 patterns)
6. Fabric CA Enrollment
7. Fabric CA Registration
8. Identity Management
9. Wallet Creation

### Network Configuration (4 patterns)
10. Connection Profile
11. Peer Lifecycle
12. Orderer Raft Consensus
13. Fabric Backup & Restore

---

## 1. Chaincode Package

**Purpose**: Package chaincode into deployable format (.tar.gz) for Fabric 2.x lifecycle.

### Pattern 1.1: Package Node.js Chaincode

```bash
# Directory structure
chaincode/
├── package.json
├── index.js
└── lib/
    └── assetTransfer.js

# Package chaincode
peer lifecycle chaincode package assetTransfer.tar.gz \
  --path ./chaincode \
  --lang node \
  --label assetTransfer_1.0

# Verify package
ls -lh assetTransfer.tar.gz
tar -tzf assetTransfer.tar.gz
```

### Pattern 1.2: Package with External Dependencies

```json
// package.json
{
  "name": "asset-transfer-chaincode",
  "version": "1.0.0",
  "description": "Asset transfer chaincode",
  "main": "index.js",
  "scripts": {
    "start": "fabric-chaincode-node start"
  },
  "dependencies": {
    "fabric-contract-api": "^2.5.0",
    "fabric-shim": "^2.5.0"
  }
}
```

```bash
# Install dependencies before packaging
cd chaincode
npm install

# Package with dependencies
cd ..
peer lifecycle chaincode package assetTransfer.tar.gz \
  --path ./chaincode \
  --lang node \
  --label assetTransfer_1.0
```

### Pattern 1.3: Package Go Chaincode

```bash
# Go chaincode structure
chaincode/
├── go.mod
├── go.sum
└── main.go

# Package Go chaincode
peer lifecycle chaincode package assetTransfer.tar.gz \
  --path ./chaincode \
  --lang golang \
  --label assetTransfer_1.0

# With GO module path
GO111MODULE=on peer lifecycle chaincode package assetTransfer.tar.gz \
  --path ./chaincode \
  --lang golang \
  --label assetTransfer_1.0
```

---

## 2. Chaincode Install

**Purpose**: Install chaincode package on peer nodes.

### Pattern 2.1: Install on Single Peer

```bash
# Set peer environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Install chaincode
peer lifecycle chaincode install assetTransfer.tar.gz

# Output example:
# 2024-01-01 10:00:00.000 UTC [cli.lifecycle.chaincode] submitInstallProposal -> INFO 001 Installed chaincode 'assetTransfer' on peer 'peer0.org1.example.com:7051'
# Package ID: assetTransfer_1.0:abcdef123456...
```

### Pattern 2.2: Query Installed Chaincode

```bash
# List all installed chaincodes
peer lifecycle chaincode queryinstalled

# Output:
# Installed chaincodes on peer:
# Package ID: assetTransfer_1.0:abcdef123456..., Label: assetTransfer_1.0

# Store package ID for later use
peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[0].package_id' > packageID.txt
export CC_PACKAGE_ID=$(cat packageID.txt)
```

### Pattern 2.3: Install on Multiple Peers

```bash
#!/bin/bash
# install-chaincode.sh - Install on all peers in organization

PACKAGE_FILE="assetTransfer.tar.gz"
PEERS=("peer0:7051" "peer1:8051")

for PEER in "${PEERS[@]}"; do
  IFS=':' read -r HOST PORT <<< "$PEER"

  export CORE_PEER_ADDRESS="${HOST}.org1.example.com:${PORT}"

  echo "Installing on ${HOST}.org1.example.com:${PORT}..."
  peer lifecycle chaincode install ${PACKAGE_FILE}

  if [ $? -eq 0 ]; then
    echo "✓ Successfully installed on ${HOST}"
  else
    echo "✗ Failed to install on ${HOST}"
    exit 1
  fi
done
```

---

## 3. Chaincode Approve

**Purpose**: Approve chaincode definition for organization before commit.

### Pattern 3.1: Approve Chaincode Definition

```bash
# Approve for Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --waitForEvent
```

### Pattern 3.2: Approve with Endorsement Policy

```bash
# Simple endorsement policy (Org1 OR Org2)
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --waitForEvent

# Complex policy (Org1 AND Org2)
peer lifecycle chaincode approveformyorg \
  ... \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')" \
  --waitForEvent

# Majority policy (2 of 3 orgs)
peer lifecycle chaincode approveformyorg \
  ... \
  --signature-policy "OutOf(2,'Org1MSP.peer','Org2MSP.peer','Org3MSP.peer')" \
  --waitForEvent
```

### Pattern 3.3: Check Commit Readiness

```bash
# Check if chaincode is ready to commit
peer lifecycle chaincode checkcommitreadiness \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --sequence 1 \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --output json

# Output:
# {
#   "approvals": {
#     "Org1MSP": true,
#     "Org2MSP": false
#   }
# }
```

---

## 4. Chaincode Commit

**Purpose**: Commit approved chaincode definition to channel.

### Pattern 4.1: Commit Chaincode Definition

```bash
# Commit to channel (requires approval from majority of orgs)
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --sequence 1 \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  --waitForEvent
```

### Pattern 4.2: Query Committed Chaincode

```bash
# List all committed chaincodes on channel
peer lifecycle chaincode querycommitted --channelID mychannel

# Query specific chaincode
peer lifecycle chaincode querycommitted \
  --channelID mychannel \
  --name assetTransfer \
  --output json

# Output:
# {
#   "sequence": 1,
#   "version": "1.0",
#   "endorsement_plugin": "escc",
#   "validation_plugin": "vscc",
#   "validation_parameter": "...",
#   "approvals": {
#     "Org1MSP": true,
#     "Org2MSP": true
#   }
# }
```

---

## 5. Chaincode Lifecycle Management

**Purpose**: Upgrade, update endorsement policies, and manage chaincode versions.

### Pattern 5.1: Chaincode Upgrade

```bash
# Step 1: Package new version
peer lifecycle chaincode package assetTransfer_v2.tar.gz \
  --path ./chaincode-v2 \
  --lang node \
  --label assetTransfer_2.0

# Step 2: Install on peers
peer lifecycle chaincode install assetTransfer_v2.tar.gz

# Step 3: Get new package ID
export CC_PACKAGE_ID_V2=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label=="assetTransfer_2.0") | .package_id')

# Step 4: Approve with incremented sequence
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 2.0 \
  --package-id $CC_PACKAGE_ID_V2 \
  --sequence 2 \
  --waitForEvent

# Step 5: Commit upgrade
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 2.0 \
  --sequence 2 \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  --waitForEvent
```

### Pattern 5.2: Update Endorsement Policy (No Code Change)

```bash
# Update policy without changing code - just increment sequence
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 2 \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')" \
  --waitForEvent

# Commit policy update
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name assetTransfer \
  --version 1.0 \
  --sequence 2 \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  --waitForEvent
```

---

## 6. Fabric CA Enrollment

**Purpose**: Enroll identities with Fabric Certificate Authority to obtain X.509 certificates.

### Pattern 6.1: Enroll Admin User

```bash
# Set CA client home
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

# Enroll admin (bootstrap identity)
fabric-ca-client enroll \
  -u https://admin:adminpw@localhost:7054 \
  --caname ca-org1 \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"

# Output structure:
# organizations/peerOrganizations/org1.example.com/
# ├── msp/
# │   ├── cacerts/
# │   │   └── localhost-7054-ca-org1.pem
# │   ├── keystore/
# │   │   └── priv_sk (private key)
# │   └── signcerts/
# │       └── cert.pem (enrollment certificate)
```

### Pattern 6.2: Enroll Peer Identity

```bash
# Enroll peer0
fabric-ca-client enroll \
  -u https://peer0:peer0pw@localhost:7054 \
  --caname ca-org1 \
  -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp" \
  --csr.hosts peer0.org1.example.com \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"

# Enroll peer0 TLS certificate
fabric-ca-client enroll \
  -u https://peer0:peer0pw@localhost:7054 \
  --caname ca-org1 \
  -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls" \
  --enrollment.profile tls \
  --csr.hosts peer0.org1.example.com \
  --csr.hosts localhost \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
```

### Pattern 6.3: Enroll with Attributes

```bash
# Enroll user with custom attributes
fabric-ca-client enroll \
  -u https://user1:user1pw@localhost:7054 \
  --caname ca-org1 \
  -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp" \
  --enrollment.attrs "role=client,department=finance:ecert" \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
```

---

## 7. Fabric CA Registration

**Purpose**: Register new identities with Fabric CA before enrollment.

### Pattern 7.1: Register User Identity

```bash
# Register new user (requires admin enrollment first)
fabric-ca-client register \
  --caname ca-org1 \
  --id.name user1 \
  --id.secret user1pw \
  --id.type client \
  --id.affiliation org1.department1 \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"

# Output: Password: user1pw
```

### Pattern 7.2: Register with Attributes

```bash
# Register user with custom attributes
fabric-ca-client register \
  --caname ca-org1 \
  --id.name manager1 \
  --id.secret manager1pw \
  --id.type client \
  --id.affiliation org1.department1 \
  --id.attrs 'role=manager,department=finance' \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
```

### Pattern 7.3: Register Peer/Orderer Identity

```bash
# Register peer identity
fabric-ca-client register \
  --caname ca-org1 \
  --id.name peer0 \
  --id.secret peer0pw \
  --id.type peer \
  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"

# Register orderer identity
fabric-ca-client register \
  --caname ca-orderer \
  --id.name orderer1 \
  --id.secret orderer1pw \
  --id.type orderer \
  --tls.certfiles "${PWD}/organizations/fabric-ca/orderer/ca-cert.pem"
```

---

## 8. Identity Management

**Purpose**: Manage user identities, certificates, and MSP structures in NestJS application.

### Pattern 8.1: Identity Service

```typescript
// src/fabric/identity/identity.service.ts
import { Injectable } from '@nestjs/common';
import FabricCAServices from 'fabric-ca-client';
import { Wallets, X509Identity } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IdentityService {
  private caClient: FabricCAServices;
  private adminIdentity: X509Identity;

  async initCA() {
    // Load CA connection profile
    const ccpPath = path.resolve(__dirname, '..', '..', 'config', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    this.caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
  }

  async enrollAdmin(adminUserId: string, adminUserPasswd: string): Promise<X509Identity> {
    const enrollment = await this.caClient.enroll({
      enrollmentID: adminUserId,
      enrollmentSecret: adminUserPasswd,
    });

    const identity: X509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    this.adminIdentity = identity;
    return identity;
  }

  async registerUser(userId: string, affiliation: string): Promise<string> {
    // Register user with CA using admin identity
    const secret = await this.caClient.register(
      {
        affiliation: affiliation,
        enrollmentID: userId,
        role: 'client',
      },
      this.adminIdentity as any,
    );

    return secret;
  }

  async enrollUser(userId: string, secret: string): Promise<X509Identity> {
    const enrollment = await this.caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });

    const identity: X509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    return identity;
  }

  async revokeUser(userId: string, reason: string): Promise<void> {
    await this.caClient.revoke(
      {
        enrollmentID: userId,
        reason: reason,
      },
      this.adminIdentity as any,
    );
  }
}
```

---

## 9. Wallet Creation

**Purpose**: Create and manage Fabric wallets for identity storage.

### Pattern 9.1: File System Wallet

```typescript
// src/fabric/wallet/wallet.service.ts
import { Injectable } from '@nestjs/common';
import { Wallets, Wallet, X509Identity } from 'fabric-network';
import * as path from 'path';

@Injectable()
export class WalletService {
  private wallet: Wallet;

  async initWallet(): Promise<Wallet> {
    const walletPath = path.join(process.cwd(), 'wallet');
    this.wallet = await Wallets.newFileSystemWallet(walletPath);
    return this.wallet;
  }

  async addIdentity(userId: string, identity: X509Identity): Promise<void> {
    await this.wallet.put(userId, identity);
  }

  async getIdentity(userId: string): Promise<X509Identity | undefined> {
    const identity = await this.wallet.get(userId);
    return identity as X509Identity;
  }

  async identityExists(userId: string): Promise<boolean> {
    return await this.wallet.get(userId) !== undefined;
  }

  async removeIdentity(userId: string): Promise<void> {
    await this.wallet.remove(userId);
  }

  async listIdentities(): Promise<string[]> {
    const identities = await this.wallet.list();
    return identities.map(identity => identity.label);
  }
}
```

### Pattern 9.2: In-Memory Wallet (Testing)

```typescript
// src/fabric/wallet/wallet.service.spec.ts
import { Test } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { Wallets, X509Identity } from 'fabric-network';

describe('WalletService', () => {
  let service: WalletService;
  let inMemoryWallet;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WalletService],
    }).compile();

    service = module.get<WalletService>(WalletService);

    // Use in-memory wallet for testing
    inMemoryWallet = await Wallets.newInMemoryWallet();
    service['wallet'] = inMemoryWallet;
  });

  it('should add identity to wallet', async () => {
    const identity: X509Identity = {
      credentials: {
        certificate: 'CERTIFICATE',
        privateKey: 'PRIVATE_KEY',
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await service.addIdentity('user1', identity);
    const exists = await service.identityExists('user1');
    expect(exists).toBe(true);
  });
});
```

---

## 10. Connection Profile

**Purpose**: Configure connection profiles (CCP) for Fabric network discovery.

### Pattern 10.1: Connection Profile Structure

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
      "peers": [
        "peer0.org1.example.com"
      ],
      "certificateAuthorities": [
        "ca.org1.example.com"
      ]
    }
  },
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
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
        "pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
```

### Pattern 10.2: Load Connection Profile in NestJS

```typescript
// src/fabric/config/connection-profile.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConnectionProfileService {
  private connectionProfile: any;

  loadConnectionProfile(orgName: string): any {
    const ccpPath = path.resolve(
      __dirname,
      '..',
      '..',
      'config',
      `connection-${orgName.toLowerCase()}.json`,
    );

    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found: ${ccpPath}`);
    }

    this.connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    return this.connectionProfile;
  }

  getConnectionProfile(): any {
    return this.connectionProfile;
  }

  getPeerEndpoint(peerName: string): string {
    return this.connectionProfile.peers[peerName]?.url;
  }

  getCAEndpoint(caName: string): string {
    return this.connectionProfile.certificateAuthorities[caName]?.url;
  }

  getOrdererEndpoint(ordererName: string): string {
    return this.connectionProfile.orderers?.[ordererName]?.url;
  }
}
```

---

## 11. Peer Lifecycle

**Purpose**: Manage peer node lifecycle operations.

### Pattern 11.1: Peer Node Operations

```bash
# Start peer
docker-compose -f docker/docker-compose-org1.yaml up -d peer0.org1.example.com

# Stop peer
docker-compose -f docker/docker-compose-org1.yaml stop peer0.org1.example.com

# Restart peer
docker-compose -f docker/docker-compose-org1.yaml restart peer0.org1.example.com

# Check peer logs
docker logs -f peer0.org1.example.com

# Peer health check
docker exec peer0.org1.example.com peer node status
```

### Pattern 11.2: Peer Join Channel

```bash
# Fetch genesis block
peer channel fetch 0 mychannel.block \
  -o orderer.example.com:7050 \
  -c mychannel \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Join channel
peer channel join -b mychannel.block

# List joined channels
peer channel list
```

---

## 12. Orderer Raft Consensus

**Purpose**: Configure Raft consensus for orderer nodes.

### Pattern 12.1: Raft Configuration in configtx.yaml

```yaml
Orderer: &OrdererDefaults
  OrdererType: etcdraft

  EtcdRaft:
    Consenters:
      - Host: orderer.example.com
        Port: 7050
        ClientTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
        ServerTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
      - Host: orderer2.example.com
        Port: 8050
        ClientTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt
        ServerTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt
      - Host: orderer3.example.com
        Port: 9050
        ClientTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.crt
        ServerTLSCert: organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.crt

  # Raft tuning parameters
  Options:
    TickInterval: 500ms
    ElectionTick: 10
    HeartbeatTick: 1
    MaxInflightBlocks: 5
    SnapshotIntervalSize: 16 MB

  Addresses:
    - orderer.example.com:7050
    - orderer2.example.com:8050
    - orderer3.example.com:9050

  BatchTimeout: 2s
  BatchSize:
    MaxMessageCount: 500
    AbsoluteMaxBytes: 10 MB
    PreferredMaxBytes: 2 MB
```

---

## 13. Fabric Backup & Restore

**Purpose**: Backup and restore Fabric network data (ledger, state database, MSP).

### Pattern 13.1: Backup Peer Data

```bash
#!/bin/bash
# backup-peer.sh

BACKUP_DIR="/backup/fabric/$(date +%Y%m%d-%H%M%S)"
PEER_DATA="/var/hyperledger/production"
MSP_DIR="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto"

mkdir -p $BACKUP_DIR

# Backup ledger data
docker exec peer0.org1.example.com tar czf - -C $PEER_DATA ledgersData \
  > $BACKUP_DIR/ledger-backup.tar.gz

# Backup state database (CouchDB)
docker exec couchdb0 curl -X POST http://admin:adminpw@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{"source":"mychannel_assetTransfer","target":"http://admin:adminpw@backup-couchdb:5984/mychannel_assetTransfer_backup","create_target":true}'

# Backup MSP
tar czf $BACKUP_DIR/msp-backup.tar.gz -C $MSP_DIR .

echo "Backup completed: $BACKUP_DIR"
```

### Pattern 13.2: Restore Peer Data

```bash
#!/bin/bash
# restore-peer.sh

BACKUP_DIR="/backup/fabric/20240101-120000"
PEER_DATA="/var/hyperledger/production"

# Stop peer
docker-compose -f docker/docker-compose-org1.yaml stop peer0.org1.example.com

# Restore ledger data
docker exec peer0.org1.example.com sh -c "rm -rf $PEER_DATA/ledgersData"
docker cp $BACKUP_DIR/ledger-backup.tar.gz peer0.org1.example.com:/tmp/
docker exec peer0.org1.example.com tar xzf /tmp/ledger-backup.tar.gz -C $PEER_DATA

# Restore MSP
tar xzf $BACKUP_DIR/msp-backup.tar.gz -C /path/to/crypto

# Start peer
docker-compose -f docker/docker-compose-org1.yaml start peer0.org1.example.com

echo "Restore completed"
```

---

## Best Practices

### Chaincode Lifecycle
1. **Version Control**: Always use semantic versioning (1.0, 1.1, 2.0)
2. **Sequence Management**: Increment sequence for any definition change
3. **Package Labels**: Use descriptive labels (assetTransfer_1.0, not cc1)
4. **Testing**: Test chaincode in dev mode before packaging
5. **Endorsement Policies**: Define clear, auditable policies

### Identity & CA Management
1. **Secure Secrets**: Never hardcode CA passwords in code
2. **Certificate Rotation**: Regularly rotate certificates before expiry
3. **Attribute-Based Access**: Use attributes for fine-grained access control
4. **Wallet Security**: Encrypt file system wallets, use HSM for production
5. **Identity Lifecycle**: Implement proper registration → enrollment → revocation flow

### Network Configuration
1. **Connection Profiles**: Use environment-specific profiles (dev, staging, prod)
2. **TLS Verification**: Always enable TLS verification in production
3. **Discovery**: Enable service discovery for dynamic peer/orderer updates
4. **Timeouts**: Configure appropriate timeouts for endorsement and orderer
5. **Monitoring**: Monitor peer/orderer health and consensus metrics

### Backup & Restore
1. **Regular Backups**: Implement automated daily backups
2. **Offsite Storage**: Store backups in separate infrastructure
3. **Test Restores**: Regularly test restore procedures
4. **Snapshot Coordination**: Backup all peers at same block height
5. **Documentation**: Document backup/restore procedures clearly

---

## Common Issues

### Issue 1: Package ID Mismatch
**Symptom**: Chaincode approve fails with "package ID not found"
**Solution**: Query installed chaincode and verify package ID matches

### Issue 2: Endorsement Policy Violation
**Symptom**: Transaction fails with "endorsement policy failure"
**Solution**: Ensure sufficient organizations approved and committed

### Issue 3: CA Enrollment Failure
**Symptom**: "Certificate authority connection refused"
**Solution**: Verify CA is running, check TLS certificates, verify CA URL

### Issue 4: Wallet Identity Not Found
**Symptom**: "Identity does not exist in wallet"
**Solution**: Ensure identity enrolled and added to wallet before gateway connect

### Issue 5: Raft Consensus Stall
**Symptom**: Orderer cluster stops processing blocks
**Solution**: Check orderer logs, verify majority of orderers running, check network connectivity

---

## Testing Patterns

### Pattern: Chaincode Lifecycle E2E Test

```typescript
// src/fabric/chaincode/chaincode-lifecycle.spec.ts
import { Test } from '@nestjs/testing';
import { ChaincodeLifecycleService } from './chaincode-lifecycle.service';

describe('ChaincodeLifecycleService', () => {
  let service: ChaincodeLifecycleService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChaincodeLifecycleService],
    }).compile();

    service = module.get<ChaincodeLifecycleService>(ChaincodeLifecycleService);
  });

  it('should install chaincode on peer', async () => {
    const packageId = await service.installChaincode('assetTransfer.tar.gz');
    expect(packageId).toMatch(/^assetTransfer_1.0:[a-f0-9]+$/);
  });

  it('should approve chaincode for organization', async () => {
    await service.approveChaincode({
      channelId: 'mychannel',
      chaincodeName: 'assetTransfer',
      version: '1.0',
      packageId: 'assetTransfer_1.0:abc123',
      sequence: 1,
    });

    const readiness = await service.checkCommitReadiness('mychannel', 'assetTransfer', 1);
    expect(readiness['Org1MSP']).toBe(true);
  });
});
```

---

**Related Specialists**:
- Fabric Network Setup Specialist (crypto, docker, channels)
- Fabric Gateway & Transactions Specialist (application integration)
- Chaincode Development Specialist (smart contract implementation)
