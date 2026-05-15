# Fabric Network Setup Specialist
# Fabricネットワークセットアップスペシャリスト
# Chuyên Gia Thiết Lập Mạng Fabric

**Role**: Expert in Hyperledger Fabric network configuration
**Focus**: Network setup, crypto config, channel management
**Patterns**: 15 network setup patterns
**Stack**: nestjs-blockchain

---

## 🎯 EXPERTISE

This specialist handles:
- Fabric network architecture and setup
- Crypto configuration (crypto-config.yaml)
- Channel configuration (configtx.yaml)
- Docker Compose for Fabric components
- Orderer, Peer, CA configuration
- MSP (Membership Service Provider) setup
- Channel creation and management
- TLS and mutual TLS authentication

---

## 📋 PATTERNS (15 total)

### Pattern 1: Fabric Network Setup
**Category**: Architecture
**Description**: Basic Fabric network topology

```yaml
# Network Components
Organizations:
  - Org1 (2 peers + CA)
  - Org2 (2 peers + CA)

Orderers:
  - orderer.example.com (Raft consensus)

Channels:
  - mychannel

Chaincode:
  - loan-contract (deployed on mychannel)
```

**Network Topology**:
```
┌─────────────────────────────────────────────────────┐
│              Ordering Service (Raft)                │
│           orderer.example.com:7050                  │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐              ┌──────▼─────────┐
│  Organization 1│              │ Organization 2 │
│                │              │                │
│ peer0.org1:7051│              │ peer0.org2:9051│
│ peer1.org1:8051│              │ peer1.org2:10051│
│ ca.org1:7054   │              │ ca.org2:8054   │
└────────────────┘              └────────────────┘
```

---

### Pattern 2: crypto-config.yaml
**Category**: Configuration
**Description**: Generate cryptographic materials

```yaml
# crypto-config.yaml
OrdererOrgs:
  - Name: Orderer
    Domain: example.com
    Specs:
      - Hostname: orderer

PeerOrgs:
  - Name: Org1
    Domain: org1.example.com
    EnableNodeOUs: true
    Template:
      Count: 2  # peer0, peer1
    Users:
      Count: 1  # User1

  - Name: Org2
    Domain: org2.example.com
    EnableNodeOUs: true
    Template:
      Count: 2
    Users:
      Count: 1
```

**Generate crypto materials**:
```bash
# Generate certificates and keys
cryptogen generate --config=./crypto-config.yaml --output="organizations"

# Output structure:
# organizations/
#   ordererOrganizations/
#     example.com/
#       orderers/orderer.example.com/
#       users/Admin@example.com/
#   peerOrganizations/
#     org1.example.com/
#       peers/peer0.org1.example.com/
#       users/Admin@org1.example.com/
```

---

### Pattern 3: configtx.yaml
**Category**: Configuration
**Description**: Channel and genesis block configuration

```yaml
# configtx.yaml
Organizations:
  - &OrdererOrg
      Name: OrdererOrg
      ID: OrdererMSP
      MSPDir: organizations/ordererOrganizations/example.com/msp
      Policies:
        Readers:
          Type: Signature
          Rule: "OR('OrdererMSP.member')"
        Writers:
          Type: Signature
          Rule: "OR('OrdererMSP.member')"
        Admins:
          Type: Signature
          Rule: "OR('OrdererMSP.admin')"

  - &Org1
      Name: Org1MSP
      ID: Org1MSP
      MSPDir: organizations/peerOrganizations/org1.example.com/msp
      Policies:
        Readers:
          Type: Signature
          Rule: "OR('Org1MSP.admin', 'Org1MSP.peer', 'Org1MSP.client')"
        Writers:
          Type: Signature
          Rule: "OR('Org1MSP.admin', 'Org1MSP.client')"
        Admins:
          Type: Signature
          Rule: "OR('Org1MSP.admin')"
      AnchorPeers:
        - Host: peer0.org1.example.com
          Port: 7051

Orderer: &OrdererDefaults
  OrdererType: etcdraft
  Addresses:
    - orderer.example.com:7050
  BatchTimeout: 2s
  BatchSize:
    MaxMessageCount: 10
    AbsoluteMaxBytes: 99 MB
    PreferredMaxBytes: 512 KB

Channel: &ChannelDefaults
  Policies:
    Readers:
      Type: ImplicitMeta
      Rule: "ANY Readers"
    Writers:
      Type: ImplicitMeta
      Rule: "ANY Writers"
    Admins:
      Type: ImplicitMeta
      Rule: "MAJORITY Admins"

Profiles:
  TwoOrgsOrdererGenesis:
    <<: *ChannelDefaults
    Orderer:
      <<: *OrdererDefaults
      Organizations:
        - *OrdererOrg
    Consortiums:
      SampleConsortium:
        Organizations:
          - *Org1
          - *Org2

  TwoOrgsChannel:
    Consortium: SampleConsortium
    <<: *ChannelDefaults
    Application:
      <<: *ApplicationDefaults
      Organizations:
        - *Org1
        - *Org2
```

---

### Pattern 4: docker-compose-fabric
**Category**: Infrastructure
**Description**: Docker Compose for Fabric network

```yaml
# docker-compose.yaml
version: '3.7'

networks:
  fabric-network:
    name: fabric-network

services:
  orderer.example.com:
    image: hyperledger/fabric-orderer:2.5
    container_name: orderer.example.com
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=7050
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_BOOTSTRAPMETHOD=file
      - ORDERER_GENERAL_BOOTSTRAPFILE=/var/hyperledger/orderer/orderer.genesis.block
    volumes:
      - ./channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
      - ./organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp:/var/hyperledger/orderer/msp
      - ./organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls:/var/hyperledger/orderer/tls
    ports:
      - 7050:7050
    networks:
      - fabric-network

  peer0.org1.example.com:
    image: hyperledger/fabric-peer:2.5
    container_name: peer0.org1.example.com
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric-network
      - FABRIC_LOGGING_SPEC=INFO
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_PROFILE_ENABLED=false
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      - CORE_PEER_ID=peer0.org1.example.com
      - CORE_PEER_ADDRESS=peer0.org1.example.com:7051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:7051
      - CORE_PEER_CHAINCODEADDRESS=peer0.org1.example.com:7052
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052
      - CORE_PEER_GOSSIP_BOOTSTRAP=peer0.org1.example.com:7051
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.org1.example.com:7051
      - CORE_PEER_LOCALMSPID=Org1MSP
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb0:5984
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - ./organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com:/etc/hyperledger/fabric
    ports:
      - 7051:7051
    networks:
      - fabric-network
    depends_on:
      - couchdb0

  couchdb0:
    image: couchdb:3.3
    container_name: couchdb0
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - 5984:5984
    networks:
      - fabric-network
```

---

### Pattern 5: Orderer Configuration
**Category**: Configuration
**Description**: Orderer node setup

```yaml
# orderer.yaml (environment variables)
ORDERER_GENERAL_LISTENADDRESS: 0.0.0.0
ORDERER_GENERAL_LISTENPORT: 7050
ORDERER_GENERAL_LOCALMSPID: OrdererMSP
ORDERER_GENERAL_LOCALMSPDIR: /var/hyperledger/orderer/msp

# Raft Consensus
ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE: /var/hyperledger/orderer/tls/server.crt
ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY: /var/hyperledger/orderer/tls/server.key
ORDERER_GENERAL_CLUSTER_ROOTCAS: '[/var/hyperledger/orderer/tls/ca.crt]'

# TLS
ORDERER_GENERAL_TLS_ENABLED: 'true'
ORDERER_GENERAL_TLS_PRIVATEKEY: /var/hyperledger/orderer/tls/server.key
ORDERER_GENERAL_TLS_CERTIFICATE: /var/hyperledger/orderer/tls/server.crt
ORDERER_GENERAL_TLS_ROOTCAS: '[/var/hyperledger/orderer/tls/ca.crt]'
```

---

### Pattern 6: Peer Configuration
**Category**: Configuration
**Description**: Peer node setup

```yaml
# peer.yaml (environment variables)
CORE_PEER_ID: peer0.org1.example.com
CORE_PEER_ADDRESS: peer0.org1.example.com:7051
CORE_PEER_LISTENADDRESS: 0.0.0.0:7051
CORE_PEER_CHAINCODEADDRESS: peer0.org1.example.com:7052
CORE_PEER_CHAINCODELISTENADDRESS: 0.0.0.0:7052

# Gossip
CORE_PEER_GOSSIP_BOOTSTRAP: peer1.org1.example.com:8051
CORE_PEER_GOSSIP_EXTERNALENDPOINT: peer0.org1.example.com:7051
CORE_PEER_GOSSIP_USELEADERELECTION: 'true'
CORE_PEER_GOSSIP_ORGLEADER: 'false'

# MSP
CORE_PEER_LOCALMSPID: Org1MSP
CORE_PEER_MSPCONFIGPATH: /etc/hyperledger/fabric/msp

# CouchDB
CORE_LEDGER_STATE_STATEDATABASE: CouchDB
CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS: couchdb0:5984
CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME: admin
CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD: adminpw
```

---

### Pattern 7: CA Configuration
**Category**: Configuration
**Description**: Certificate Authority setup

```yaml
# fabric-ca-server-config.yaml
version: 1.5.7
port: 7054

tls:
  enabled: true
  certfile: /etc/hyperledger/fabric-ca-server/tls-cert.pem
  keyfile: /etc/hyperledger/fabric-ca-server/tls-key.pem

ca:
  name: ca-org1
  keyfile: /etc/hyperledger/fabric-ca-server/ca-key.pem
  certfile: /etc/hyperledger/fabric-ca-server/ca-cert.pem

registry:
  maxenrollments: -1
  identities:
    - name: admin
      pass: adminpw
      type: client
      affiliation: ""
      attrs:
        hf.Registrar.Roles: "*"
        hf.Registrar.DelegateRoles: "*"
        hf.Revoker: true
        hf.IntermediateCA: true
        hf.GenCRL: true
        hf.Registrar.Attributes: "*"
        hf.AffiliationMgr: true

db:
  type: sqlite3
  datasource: fabric-ca-server.db
```

---

### Pattern 8: MSP Configuration
**Category**: Configuration
**Description**: Membership Service Provider setup

```yaml
# MSP Directory Structure
organizations/peerOrganizations/org1.example.com/msp/
├── admincerts/
│   └── Admin@org1.example.com-cert.pem
├── cacerts/
│   └── ca.org1.example.com-cert.pem
├── config.yaml  # NodeOUs configuration
├── keystore/
│   └── priv_sk
├── signcerts/
│   └── cert.pem
├── tlscacerts/
│   └── tlsca.org1.example.com-cert.pem
└── tlsintermediatecerts/
```

**config.yaml (NodeOUs)**:
```yaml
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.org1.example.com-cert.pem
    OrganizationalUnitIdentifier: orderer
```

---

### Pattern 9: Channel Creation
**Category**: Channel Management
**Description**: Create application channel

```bash
# 1. Generate genesis block
configtxgen -profile TwoOrgsOrdererGenesis \
  -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block

# 2. Generate channel configuration transaction
configtxgen -profile TwoOrgsChannel \
  -outputCreateChannelTx ./channel-artifacts/mychannel.tx \
  -channelID mychannel

# 3. Create channel (executed by peer)
peer channel create \
  -o orderer.example.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/mychannel.tx \
  --outputBlock ./channel-artifacts/mychannel.block \
  --tls --cafile /path/to/orderer/tls/ca.crt
```

---

### Pattern 10: Channel Join
**Category**: Channel Management
**Description**: Peers join channel

```bash
# Org1 Peer0 joins channel
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/path/to/org1/peer0/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/path/to/org1/users/Admin@org1/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051

peer channel join -b ./channel-artifacts/mychannel.block

# Org2 Peer0 joins channel
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/path/to/org2/peer0/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/path/to/org2/users/Admin@org2/msp
export CORE_PEER_ADDRESS=peer0.org2.example.com:9051

peer channel join -b ./channel-artifacts/mychannel.block
```

---

### Pattern 11: Anchor Peer Update
**Category**: Channel Management
**Description**: Update anchor peers for gossip

```bash
# Generate anchor peer update for Org1
configtxgen -profile TwoOrgsChannel \
  -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx \
  -channelID mychannel \
  -asOrg Org1MSP

# Update anchor peer (as Org1 Admin)
peer channel update \
  -o orderer.example.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/Org1MSPanchors.tx \
  --tls --cafile /path/to/orderer/tls/ca.crt

# Repeat for Org2
configtxgen -profile TwoOrgsChannel \
  -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx \
  -channelID mychannel \
  -asOrg Org2MSP

peer channel update \
  -o orderer.example.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/Org2MSPanchors.tx \
  --tls --cafile /path/to/orderer/tls/ca.crt
```

---

### Pattern 12: TLS Configuration
**Category**: Security
**Description**: Enable TLS encryption

```yaml
# Orderer TLS
ORDERER_GENERAL_TLS_ENABLED: 'true'
ORDERER_GENERAL_TLS_PRIVATEKEY: /var/hyperledger/orderer/tls/server.key
ORDERER_GENERAL_TLS_CERTIFICATE: /var/hyperledger/orderer/tls/server.crt
ORDERER_GENERAL_TLS_ROOTCAS: '[/var/hyperledger/orderer/tls/ca.crt]'

# Peer TLS
CORE_PEER_TLS_ENABLED: 'true'
CORE_PEER_TLS_CERT_FILE: /etc/hyperledger/fabric/tls/server.crt
CORE_PEER_TLS_KEY_FILE: /etc/hyperledger/fabric/tls/server.key
CORE_PEER_TLS_ROOTCERT_FILE: /etc/hyperledger/fabric/tls/ca.crt
```

---

### Pattern 13: Mutual TLS Authentication
**Category**: Security
**Description**: Client authentication with mTLS

```yaml
# Orderer Client Auth
ORDERER_GENERAL_TLS_CLIENTAUTHREQUIRED: 'true'
ORDERER_GENERAL_TLS_CLIENTROOTCAS: '[/var/hyperledger/orderer/tls/ca.crt]'

# Peer Client Auth
CORE_PEER_TLS_CLIENTAUTHREQUIRED: 'true'
CORE_PEER_TLS_CLIENTROOTCAS_FILES: /etc/hyperledger/fabric/tls/ca.crt
```

---

### Pattern 14: Consortium Management
**Category**: Governance
**Description**: Manage network consortium

```yaml
# In configtx.yaml
Consortiums:
  SampleConsortium:
    Organizations:
      - *Org1
      - *Org2
      - *Org3  # Add new organization

# Update consortium (requires majority approval)
# 1. Generate config update
# 2. Sign by majority of consortium members
# 3. Submit to orderer
```

---

### Pattern 15: Organization Management
**Category**: Governance
**Description**: Add/remove organizations

```bash
# Fetch current channel config
peer channel fetch config config_block.pb \
  -o orderer.example.com:7050 \
  -c mychannel \
  --tls --cafile /path/to/orderer/tls/ca.crt

# Convert to JSON
configtxlator proto_decode \
  --input config_block.pb \
  --type common.Block \
  | jq .data.data[0].payload.data.config > config.json

# Modify config to add Org3
jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups":{"Org3MSP":.[1]}}}}}' \
  config.json org3.json > modified_config.json

# Generate config update
configtxlator compute_update \
  --channel_id mychannel \
  --original config.json \
  --updated modified_config.json \
  --output org3_update.pb

# Sign and submit update
peer channel signconfigtx -f org3_update_envelope.pb
peer channel update -f org3_update_envelope.pb \
  -c mychannel \
  -o orderer.example.com:7050 \
  --tls --cafile /path/to/orderer/tls/ca.crt
```

---

## 🎓 CRITICAL RULES

### ✅ REQUIRED
- Always enable TLS in production
- Use Raft consensus for production orderers
- Implement proper MSP configuration with NodeOUs
- Backup crypto materials securely
- Use CouchDB for rich queries
- Configure proper endorsement policies

### ❌ PROHIBITED
- Solo orderer in production (deprecated)
- Disabling TLS in production
- Sharing private keys between organizations
- Hard-coding credentials in Docker Compose
- Exposing CA admin credentials

---

## 🔧 USE CASES

### Use Case 1: Complete Network Startup

```bash
#!/bin/bash
# network-start.sh

# 1. Generate crypto materials
cryptogen generate --config=./crypto-config.yaml

# 2. Generate genesis block
configtxgen -profile TwoOrgsOrdererGenesis \
  -channelID system-channel \
  -outputBlock ./channel-artifacts/genesis.block

# 3. Generate channel transaction
configtxgen -profile TwoOrgsChannel \
  -outputCreateChannelTx ./channel-artifacts/mychannel.tx \
  -channelID mychannel

# 4. Start network
docker-compose up -d

# 5. Create channel
peer channel create -o orderer.example.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/mychannel.tx \
  --tls --cafile /path/to/orderer/tls/ca.crt

# 6. Join peers to channel
peer channel join -b ./channel-artifacts/mychannel.block

# 7. Update anchor peers
peer channel update -o orderer.example.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/Org1MSPanchors.tx \
  --tls --cafile /path/to/orderer/tls/ca.crt
```

---

## 📊 TESTING

```bash
# Verify orderer is running
docker logs orderer.example.com

# Verify peer joined channel
peer channel list

# Verify channel configuration
peer channel getinfo -c mychannel

# Test TLS connection
openssl s_client -connect peer0.org1.example.com:7051 \
  -CAfile /path/to/ca.crt
```

---

## 🔗 RELATED PATTERNS

- Fabric Chaincode Lifecycle (chaincode deployment)
- Fabric Gateway & Transactions (application integration)
- NestJS Services (integration with backend)

---

**Lines**: ~650 lines
**Coverage**: 15 network setup patterns
**Phase**: 3 (NestJS + Blockchain)
**Status**: ✅ Complete
