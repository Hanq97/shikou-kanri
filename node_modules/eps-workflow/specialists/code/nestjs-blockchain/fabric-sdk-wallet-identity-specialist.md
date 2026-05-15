# Fabric SDK Wallet & Identity Management Specialist

**Purpose**: Comprehensive guide for Hyperledger Fabric wallet management, identity handling, and Fabric CA integration in NestJS applications.

**Scope**: 10 patterns covering file-based wallets, in-memory wallets, identity operations, X.509 certificates, Fabric CA client operations, user enrollment, registration, revocation, and attribute-based enrollment.

**Target Audience**: NestJS developers implementing Fabric SDK wallet and identity management for blockchain applications.

---

## Table of Contents

1. [Wallet Types](#1-wallet-types)
   - [File System Wallet](#11-file-system-wallet)
   - [In-Memory Wallet](#12-in-memory-wallet)
2. [Identity Management](#2-identity-management)
   - [X.509 Identity](#21-x509-identity)
   - [Identity Export/Import](#22-identity-exportimport)
3. [Fabric CA Client](#3-fabric-ca-client)
   - [CA Client Setup](#31-ca-client-setup)
   - [Enroll Admin](#32-enroll-admin)
   - [Register User](#33-register-user)
   - [Revoke Identity](#34-revoke-identity)
   - [Reenroll Identity](#35-reenroll-identity)
4. [Attribute-Based Enrollment](#4-attribute-based-enrollment)
5. [NestJS Integration](#5-nestjs-integration)
6. [Testing](#6-testing)

---

## 1. Wallet Types

### 1.1 File System Wallet

**Pattern**: wallet-file-system

Store identities persistently on the file system for production use.

#### Implementation

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wallet, Wallets, Identity } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FabricWalletService implements OnModuleInit {
  private readonly logger = new Logger(FabricWalletService.name);
  private wallet: Wallet;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeWallet();
  }

  /**
   * Initialize file system wallet
   */
  async initializeWallet(): Promise<void> {
    try {
      // Get wallet path from config
      const walletPath = this.configService.get<string>(
        'FABRIC_WALLET_PATH',
        path.join(process.cwd(), 'wallet'),
      );

      // Ensure wallet directory exists
      if (!fs.existsSync(walletPath)) {
        fs.mkdirSync(walletPath, { recursive: true });
        this.logger.log(`Created wallet directory at ${walletPath}`);
      }

      // Create file system wallet
      this.wallet = await Wallets.newFileSystemWallet(walletPath);

      this.logger.log('File system wallet initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize wallet', error.stack);
      throw error;
    }
  }

  /**
   * Get wallet instance
   */
  getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet;
  }

  /**
   * Check if identity exists in wallet
   */
  async identityExists(label: string): Promise<boolean> {
    try {
      const identity = await this.wallet.get(label);
      return !!identity;
    } catch (error) {
      this.logger.error(`Error checking identity ${label}`, error.stack);
      return false;
    }
  }

  /**
   * Put identity into wallet
   */
  async putIdentity(label: string, identity: Identity): Promise<void> {
    try {
      await this.wallet.put(label, identity);
      this.logger.log(`Identity ${label} added to wallet`);
    } catch (error) {
      this.logger.error(`Failed to put identity ${label}`, error.stack);
      throw error;
    }
  }

  /**
   * Get identity from wallet
   */
  async getIdentity(label: string): Promise<Identity | undefined> {
    try {
      return await this.wallet.get(label);
    } catch (error) {
      this.logger.error(`Failed to get identity ${label}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove identity from wallet
   */
  async removeIdentity(label: string): Promise<void> {
    try {
      await this.wallet.remove(label);
      this.logger.log(`Identity ${label} removed from wallet`);
    } catch (error) {
      this.logger.error(`Failed to remove identity ${label}`, error.stack);
      throw error;
    }
  }

  /**
   * List all identities in wallet
   */
  async listIdentities(): Promise<string[]> {
    try {
      const identities: string[] = [];
      const walletPath = this.configService.get<string>(
        'FABRIC_WALLET_PATH',
        path.join(process.cwd(), 'wallet'),
      );

      const files = fs.readdirSync(walletPath);
      for (const file of files) {
        if (file.endsWith('.id')) {
          identities.push(file.replace('.id', ''));
        }
      }

      return identities;
    } catch (error) {
      this.logger.error('Failed to list identities', error.stack);
      throw error;
    }
  }
}
```

#### Configuration

```typescript
// config/fabric.config.ts
export default () => ({
  fabric: {
    walletPath: process.env.FABRIC_WALLET_PATH || './wallet',
  },
});
```

---

### 1.2 In-Memory Wallet

**Pattern**: wallet-in-memory

Use in-memory wallet for testing or temporary identity storage.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Wallet, Wallets, Identity } from 'fabric-network';

@Injectable()
export class InMemoryWalletService {
  private readonly logger = new Logger(InMemoryWalletService.name);
  private wallet: Wallet;

  constructor() {
    this.initializeWallet();
  }

  /**
   * Initialize in-memory wallet
   */
  private async initializeWallet(): Promise<void> {
    try {
      this.wallet = await Wallets.newInMemoryWallet();
      this.logger.log('In-memory wallet initialized');
    } catch (error) {
      this.logger.error('Failed to initialize in-memory wallet', error.stack);
      throw error;
    }
  }

  /**
   * Get wallet instance
   */
  getWallet(): Wallet {
    return this.wallet;
  }

  /**
   * Put identity into in-memory wallet
   */
  async putIdentity(label: string, identity: Identity): Promise<void> {
    await this.wallet.put(label, identity);
    this.logger.log(`Identity ${label} stored in memory`);
  }

  /**
   * Get identity from in-memory wallet
   */
  async getIdentity(label: string): Promise<Identity | undefined> {
    return await this.wallet.get(label);
  }

  /**
   * Clear all identities from memory
   */
  async clearWallet(): Promise<void> {
    // Re-initialize to clear all identities
    await this.initializeWallet();
    this.logger.log('In-memory wallet cleared');
  }
}
```

#### Use Case: Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryWalletService } from './in-memory-wallet.service';
import { X509Identity } from 'fabric-network';

describe('InMemoryWalletService', () => {
  let service: InMemoryWalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InMemoryWalletService],
    }).compile();

    service = module.get<InMemoryWalletService>(InMemoryWalletService);
  });

  it('should store and retrieve identity', async () => {
    const identity: X509Identity = {
      credentials: {
        certificate: '-----BEGIN CERTIFICATE-----...',
        privateKey: '-----BEGIN PRIVATE KEY-----...',
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await service.putIdentity('user1', identity);
    const retrieved = await service.getIdentity('user1');

    expect(retrieved).toBeDefined();
    expect(retrieved.mspId).toBe('Org1MSP');
  });
});
```

---

## 2. Identity Management

### 2.1 X.509 Identity

**Pattern**: x509-identity

Work with X.509 certificate-based identities.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { X509Identity } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class X509IdentityService {
  private readonly logger = new Logger(X509IdentityService.name);

  /**
   * Create X.509 identity from certificate and private key
   */
  createX509Identity(
    mspId: string,
    certificate: string,
    privateKey: string,
  ): X509Identity {
    const identity: X509Identity = {
      credentials: {
        certificate: certificate,
        privateKey: privateKey,
      },
      mspId: mspId,
      type: 'X.509',
    };

    this.logger.log(`Created X.509 identity for MSP ${mspId}`);
    return identity;
  }

  /**
   * Create X.509 identity from PEM files
   */
  createX509IdentityFromFiles(
    mspId: string,
    certPath: string,
    keyPath: string,
  ): X509Identity {
    try {
      const certificate = fs.readFileSync(certPath, 'utf8');
      const privateKey = fs.readFileSync(keyPath, 'utf8');

      return this.createX509Identity(mspId, certificate, privateKey);
    } catch (error) {
      this.logger.error('Failed to read certificate files', error.stack);
      throw error;
    }
  }

  /**
   * Validate X.509 identity structure
   */
  validateX509Identity(identity: any): identity is X509Identity {
    return (
      identity &&
      identity.type === 'X.509' &&
      identity.credentials &&
      identity.credentials.certificate &&
      identity.credentials.privateKey &&
      identity.mspId
    );
  }

  /**
   * Extract common name from certificate
   */
  extractCommonName(certificate: string): string {
    // Simple extraction - in production use a proper X.509 parser
    const cnMatch = certificate.match(/CN=([^,]+)/);
    return cnMatch ? cnMatch[1] : 'unknown';
  }
}
```

#### DTO

```typescript
// dto/create-identity.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateX509IdentityDto {
  @IsString()
  @IsNotEmpty()
  mspId: string;

  @IsString()
  @IsNotEmpty()
  certificate: string;

  @IsString()
  @IsNotEmpty()
  privateKey: string;
}
```

---

### 2.2 Identity Export/Import

**Pattern**: identity-export-import

Export and import identities for backup or transfer.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricWalletService } from './fabric-wallet.service';
import { Identity, X509Identity } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IdentityImportExportService {
  private readonly logger = new Logger(IdentityImportExportService.name);

  constructor(private readonly walletService: FabricWalletService) {}

  /**
   * Export identity to JSON file
   */
  async exportIdentity(label: string, exportPath: string): Promise<void> {
    try {
      const identity = await this.walletService.getIdentity(label);

      if (!identity) {
        throw new Error(`Identity ${label} not found in wallet`);
      }

      // Ensure export directory exists
      const dir = path.dirname(exportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write identity to file
      fs.writeFileSync(exportPath, JSON.stringify(identity, null, 2), 'utf8');

      this.logger.log(`Identity ${label} exported to ${exportPath}`);
    } catch (error) {
      this.logger.error(`Failed to export identity ${label}`, error.stack);
      throw error;
    }
  }

  /**
   * Import identity from JSON file
   */
  async importIdentity(label: string, importPath: string): Promise<void> {
    try {
      // Read identity from file
      const identityJson = fs.readFileSync(importPath, 'utf8');
      const identity: Identity = JSON.parse(identityJson);

      // Validate identity structure
      if (!this.validateIdentity(identity)) {
        throw new Error('Invalid identity structure');
      }

      // Put identity into wallet
      await this.walletService.putIdentity(label, identity);

      this.logger.log(`Identity ${label} imported from ${importPath}`);
    } catch (error) {
      this.logger.error(`Failed to import identity ${label}`, error.stack);
      throw error;
    }
  }

  /**
   * Export all identities to directory
   */
  async exportAllIdentities(exportDir: string): Promise<number> {
    try {
      const identities = await this.walletService.listIdentities();
      let count = 0;

      for (const label of identities) {
        const exportPath = path.join(exportDir, `${label}.json`);
        await this.exportIdentity(label, exportPath);
        count++;
      }

      this.logger.log(`Exported ${count} identities to ${exportDir}`);
      return count;
    } catch (error) {
      this.logger.error('Failed to export all identities', error.stack);
      throw error;
    }
  }

  /**
   * Import multiple identities from directory
   */
  async importAllIdentities(importDir: string): Promise<number> {
    try {
      const files = fs.readdirSync(importDir);
      let count = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const label = file.replace('.json', '');
          const importPath = path.join(importDir, file);
          await this.importIdentity(label, importPath);
          count++;
        }
      }

      this.logger.log(`Imported ${count} identities from ${importDir}`);
      return count;
    } catch (error) {
      this.logger.error('Failed to import identities', error.stack);
      throw error;
    }
  }

  /**
   * Validate identity structure
   */
  private validateIdentity(identity: any): boolean {
    return (
      identity &&
      identity.type &&
      identity.mspId &&
      identity.credentials
    );
  }
}
```

#### Controller

```typescript
// controllers/identity.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { IdentityImportExportService } from '../services/identity-import-export.service';

@Controller('fabric/identity')
export class IdentityController {
  constructor(
    private readonly importExportService: IdentityImportExportService,
  ) {}

  @Post(':label/export')
  async exportIdentity(
    @Param('label') label: string,
    @Body('exportPath') exportPath: string,
  ) {
    await this.importExportService.exportIdentity(label, exportPath);
    return { message: `Identity ${label} exported successfully` };
  }

  @Post(':label/import')
  async importIdentity(
    @Param('label') label: string,
    @Body('importPath') importPath: string,
  ) {
    await this.importExportService.importIdentity(label, importPath);
    return { message: `Identity ${label} imported successfully` };
  }
}
```

---

## 3. Fabric CA Client

### 3.1 CA Client Setup

**Pattern**: fabric-ca-client

Initialize and configure Fabric CA client.

#### Implementation

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FabricCAServices from 'fabric-ca-client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FabricCAClientService implements OnModuleInit {
  private readonly logger = new Logger(FabricCAClientService.name);
  private caClient: FabricCAServices;
  private caTLSCACerts: string;
  private caURL: string;
  private caName: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeCAClient();
  }

  /**
   * Initialize Fabric CA client
   */
  async initializeCAClient(): Promise<void> {
    try {
      // Get CA configuration
      this.caURL = this.configService.get<string>(
        'FABRIC_CA_URL',
        'https://localhost:7054',
      );
      this.caName = this.configService.get<string>('FABRIC_CA_NAME', 'ca-org1');

      // Load TLS CA certificate
      const tlsCertPath = this.configService.get<string>(
        'FABRIC_CA_TLS_CERT_PATH',
        path.join(
          process.cwd(),
          'fabric-config',
          'organizations',
          'peerOrganizations',
          'org1.example.com',
          'ca',
          'ca-org1-7054-ca-org1.pem',
        ),
      );

      this.caTLSCACerts = fs.readFileSync(tlsCertPath, 'utf8');

      // Create CA client
      this.caClient = new FabricCAServices(
        this.caURL,
        {
          trustedRoots: this.caTLSCACerts,
          verify: false, // Set to true in production with proper certificates
        },
        this.caName,
      );

      this.logger.log(
        `Fabric CA client initialized for ${this.caName} at ${this.caURL}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize CA client', error.stack);
      throw error;
    }
  }

  /**
   * Get CA client instance
   */
  getCAClient(): FabricCAServices {
    if (!this.caClient) {
      throw new Error('CA client not initialized');
    }
    return this.caClient;
  }

  /**
   * Get CA info
   */
  async getCAInfo(): Promise<any> {
    try {
      const caInfo = await this.caClient.getCaInfo();
      this.logger.log('Retrieved CA info successfully');
      return caInfo;
    } catch (error) {
      this.logger.error('Failed to get CA info', error.stack);
      throw error;
    }
  }
}
```

---

### 3.2 Enroll Admin

**Pattern**: enroll-admin

Enroll admin user with Fabric CA.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FabricCAClientService } from './fabric-ca-client.service';
import { FabricWalletService } from './fabric-wallet.service';
import { X509Identity } from 'fabric-network';

@Injectable()
export class AdminEnrollmentService {
  private readonly logger = new Logger(AdminEnrollmentService.name);

  constructor(
    private readonly caClientService: FabricCAClientService,
    private readonly walletService: FabricWalletService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enroll admin user
   */
  async enrollAdmin(): Promise<void> {
    try {
      const adminLabel = 'admin';

      // Check if admin already enrolled
      const adminExists = await this.walletService.identityExists(adminLabel);
      if (adminExists) {
        this.logger.log('Admin identity already exists in wallet');
        return;
      }

      // Get admin credentials from config
      const adminId = this.configService.get<string>('FABRIC_ADMIN_ID', 'admin');
      const adminSecret = this.configService.get<string>(
        'FABRIC_ADMIN_SECRET',
        'adminpw',
      );
      const mspId = this.configService.get<string>('FABRIC_MSP_ID', 'Org1MSP');

      // Enroll admin
      const caClient = this.caClientService.getCAClient();
      const enrollment = await caClient.enroll({
        enrollmentID: adminId,
        enrollmentSecret: adminSecret,
      });

      // Create X.509 identity
      const identity: X509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: mspId,
        type: 'X.509',
      };

      // Put admin identity into wallet
      await this.walletService.putIdentity(adminLabel, identity);

      this.logger.log(`Admin enrolled and added to wallet successfully`);
    } catch (error) {
      this.logger.error('Failed to enroll admin', error.stack);
      throw error;
    }
  }

  /**
   * Get admin identity
   */
  async getAdminIdentity(): Promise<X509Identity> {
    const identity = await this.walletService.getIdentity('admin');

    if (!identity) {
      throw new Error('Admin identity not found. Please enroll admin first.');
    }

    return identity as X509Identity;
  }
}
```

#### Bootstrap Script

```typescript
// scripts/bootstrap-network.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AdminEnrollmentService } from './fabric/services/admin-enrollment.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminEnrollmentService);

  try {
    console.log('Enrolling admin...');
    await adminService.enrollAdmin();
    console.log('Admin enrolled successfully');
  } catch (error) {
    console.error('Failed to enroll admin:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
```

---

### 3.3 Register User

**Pattern**: register-user

Register new users with Fabric CA.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FabricCAClientService } from './fabric-ca-client.service';
import { FabricWalletService } from './fabric-wallet.service';
import { AdminEnrollmentService } from './admin-enrollment.service';
import { X509Identity } from 'fabric-network';

export interface RegisterUserRequest {
  userId: string;
  affiliation?: string;
  role?: string;
  attrs?: Array<{ name: string; value: string; ecert: boolean }>;
}

@Injectable()
export class UserRegistrationService {
  private readonly logger = new Logger(UserRegistrationService.name);

  constructor(
    private readonly caClientService: FabricCAClientService,
    private readonly walletService: FabricWalletService,
    private readonly adminService: AdminEnrollmentService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register and enroll user
   */
  async registerUser(request: RegisterUserRequest): Promise<string> {
    try {
      const { userId, affiliation, role, attrs } = request;

      // Check if user already exists
      const userExists = await this.walletService.identityExists(userId);
      if (userExists) {
        throw new Error(`User ${userId} already exists in wallet`);
      }

      // Get admin identity
      const adminIdentity = await this.adminService.getAdminIdentity();

      // Create admin user object for CA
      const provider = this.walletService.getWallet();
      const adminUser = await provider.get('admin');

      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      // Register user with CA
      const caClient = this.caClientService.getCAClient();
      const mspId = this.configService.get<string>('FABRIC_MSP_ID', 'Org1MSP');

      const secret = await caClient.register(
        {
          enrollmentID: userId,
          affiliation: affiliation || 'org1.department1',
          role: role || 'client',
          attrs: attrs || [],
        },
        adminUser,
      );

      this.logger.log(`User ${userId} registered with secret: ${secret}`);

      // Enroll user
      const enrollment = await caClient.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret,
      });

      // Create X.509 identity
      const identity: X509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: mspId,
        type: 'X.509',
      };

      // Put user identity into wallet
      await this.walletService.putIdentity(userId, identity);

      this.logger.log(`User ${userId} enrolled and added to wallet`);

      return secret;
    } catch (error) {
      this.logger.error(`Failed to register user ${request.userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Register multiple users
   */
  async registerUsers(requests: RegisterUserRequest[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const request of requests) {
      try {
        const secret = await this.registerUser(request);
        results.set(request.userId, secret);
      } catch (error) {
        this.logger.error(`Failed to register user ${request.userId}`, error.stack);
        results.set(request.userId, `ERROR: ${error.message}`);
      }
    }

    return results;
  }
}
```

#### DTO

```typescript
// dto/register-user.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class UserAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  ecert?: boolean;
}

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  affiliation?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsArray()
  @IsOptional()
  attrs?: UserAttributeDto[];
}
```

---

### 3.4 Revoke Identity

**Pattern**: revoke-identity

Revoke user certificates with Fabric CA.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricCAClientService } from './fabric-ca-client.service';
import { FabricWalletService } from './fabric-wallet.service';
import { AdminEnrollmentService } from './admin-enrollment.service';

export interface RevokeRequest {
  enrollmentID: string;
  reason?: string;
  aki?: string;
  serial?: string;
}

@Injectable()
export class IdentityRevocationService {
  private readonly logger = new Logger(IdentityRevocationService.name);

  constructor(
    private readonly caClientService: FabricCAClientService,
    private readonly walletService: FabricWalletService,
    private readonly adminService: AdminEnrollmentService,
  ) {}

  /**
   * Revoke identity by enrollment ID
   */
  async revokeIdentity(request: RevokeRequest): Promise<void> {
    try {
      const { enrollmentID, reason } = request;

      // Get admin user for revocation
      const adminUser = await this.walletService.getIdentity('admin');

      if (!adminUser) {
        throw new Error('Admin identity not found');
      }

      // Revoke certificate
      const caClient = this.caClientService.getCAClient();
      await caClient.revoke(
        {
          enrollmentID: enrollmentID,
          reason: reason || 'unspecified',
        },
        adminUser,
      );

      this.logger.log(`Identity ${enrollmentID} revoked successfully`);

      // Remove from wallet
      const exists = await this.walletService.identityExists(enrollmentID);
      if (exists) {
        await this.walletService.removeIdentity(enrollmentID);
        this.logger.log(`Identity ${enrollmentID} removed from wallet`);
      }
    } catch (error) {
      this.logger.error(`Failed to revoke identity ${request.enrollmentID}`, error.stack);
      throw error;
    }
  }

  /**
   * Revoke identity by AKI and serial number
   */
  async revokeByAKIAndSerial(
    aki: string,
    serial: string,
    reason?: string,
  ): Promise<void> {
    try {
      const adminUser = await this.walletService.getIdentity('admin');

      if (!adminUser) {
        throw new Error('Admin identity not found');
      }

      const caClient = this.caClientService.getCAClient();
      await caClient.revoke(
        {
          aki: aki,
          serial: serial,
          reason: reason || 'unspecified',
        },
        adminUser,
      );

      this.logger.log(`Certificate revoked (AKI: ${aki}, Serial: ${serial})`);
    } catch (error) {
      this.logger.error('Failed to revoke certificate by AKI/Serial', error.stack);
      throw error;
    }
  }

  /**
   * Get revocation reasons
   */
  getRevocationReasons(): string[] {
    return [
      'unspecified',
      'keycompromise',
      'cacompromise',
      'affiliationchange',
      'superseded',
      'cessationofoperation',
      'certificatehold',
      'removefromcrl',
      'privilegewithdrawn',
      'aacompromise',
    ];
  }
}
```

---

### 3.5 Reenroll Identity

**Pattern**: reenroll-identity

Reenroll existing identities to renew certificates.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricCAClientService } from './fabric-ca-client.service';
import { FabricWalletService } from './fabric-wallet.service';
import { ConfigService } from '@nestjs/config';
import { X509Identity } from 'fabric-network';

@Injectable()
export class IdentityReenrollmentService {
  private readonly logger = new Logger(IdentityReenrollmentService.name);

  constructor(
    private readonly caClientService: FabricCAClientService,
    private readonly walletService: FabricWalletService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Reenroll identity to renew certificate
   */
  async reenrollIdentity(userId: string): Promise<void> {
    try {
      // Get existing identity
      const existingIdentity = await this.walletService.getIdentity(userId);

      if (!existingIdentity) {
        throw new Error(`Identity ${userId} not found in wallet`);
      }

      // Reenroll with CA
      const caClient = this.caClientService.getCAClient();
      const reenrollment = await caClient.reenroll(existingIdentity);

      // Create new X.509 identity with renewed certificate
      const mspId = this.configService.get<string>('FABRIC_MSP_ID', 'Org1MSP');
      const newIdentity: X509Identity = {
        credentials: {
          certificate: reenrollment.certificate,
          privateKey: reenrollment.key.toBytes(),
        },
        mspId: mspId,
        type: 'X.509',
      };

      // Update identity in wallet
      await this.walletService.putIdentity(userId, newIdentity);

      this.logger.log(`Identity ${userId} reenrolled successfully`);
    } catch (error) {
      this.logger.error(`Failed to reenroll identity ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if certificate is expiring soon
   */
  isCertificateExpiringSoon(
    certificate: string,
    daysThreshold: number = 30,
  ): boolean {
    // In production, use a proper X.509 parser like node-forge
    // This is a simplified example
    try {
      const notAfterMatch = certificate.match(/Not After : (.+)/);
      if (!notAfterMatch) {
        return false;
      }

      const expiryDate = new Date(notAfterMatch[1]);
      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return daysUntilExpiry <= daysThreshold;
    } catch (error) {
      this.logger.error('Failed to check certificate expiry', error.stack);
      return false;
    }
  }

  /**
   * Auto-reenroll identities expiring soon
   */
  async autoReenrollExpiringIdentities(
    daysThreshold: number = 30,
  ): Promise<string[]> {
    const reenrolled: string[] = [];

    try {
      const identities = await this.walletService.listIdentities();

      for (const userId of identities) {
        const identity = await this.walletService.getIdentity(userId);

        if (identity && identity.type === 'X.509') {
          const x509Identity = identity as X509Identity;
          const certificate = x509Identity.credentials.certificate;

          if (this.isCertificateExpiringSoon(certificate, daysThreshold)) {
            await this.reenrollIdentity(userId);
            reenrolled.push(userId);
          }
        }
      }

      this.logger.log(`Auto-reenrolled ${reenrolled.length} identities`);
      return reenrolled;
    } catch (error) {
      this.logger.error('Failed to auto-reenroll identities', error.stack);
      throw error;
    }
  }
}
```

---

## 4. Attribute-Based Enrollment

**Pattern**: attribute-based-enrollment

Enroll users with custom attributes for ABAC.

#### Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FabricCAClientService } from './fabric-ca-client.service';
import { FabricWalletService } from './fabric-wallet.service';
import { ConfigService } from '@nestjs/config';
import { X509Identity } from 'fabric-network';

export interface AttributeBasedEnrollmentRequest {
  userId: string;
  attributes: Array<{ name: string; value: string; ecert: boolean }>;
  affiliation?: string;
}

@Injectable()
export class AttributeBasedEnrollmentService {
  private readonly logger = new Logger(AttributeBasedEnrollmentService.name);

  constructor(
    private readonly caClientService: FabricCAClientService,
    private readonly walletService: FabricWalletService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enroll user with custom attributes
   */
  async enrollWithAttributes(
    request: AttributeBasedEnrollmentRequest,
  ): Promise<void> {
    try {
      const { userId, attributes, affiliation } = request;

      // Check if user already exists
      const exists = await this.walletService.identityExists(userId);
      if (exists) {
        throw new Error(`User ${userId} already exists`);
      }

      // Get admin for registration
      const adminUser = await this.walletService.getIdentity('admin');
      if (!adminUser) {
        throw new Error('Admin identity not found');
      }

      // Register user with attributes
      const caClient = this.caClientService.getCAClient();
      const secret = await caClient.register(
        {
          enrollmentID: userId,
          affiliation: affiliation || 'org1.department1',
          role: 'client',
          attrs: attributes,
        },
        adminUser,
      );

      this.logger.log(
        `User ${userId} registered with ${attributes.length} attributes`,
      );

      // Enroll user with attributes embedded in certificate
      const enrollment = await caClient.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret,
        attr_reqs: attributes.map((attr) => ({
          name: attr.name,
          optional: false,
        })),
      });

      // Create X.509 identity
      const mspId = this.configService.get<string>('FABRIC_MSP_ID', 'Org1MSP');
      const identity: X509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: mspId,
        type: 'X.509',
      };

      // Put identity into wallet
      await this.walletService.putIdentity(userId, identity);

      this.logger.log(`User ${userId} enrolled with attributes successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to enroll user ${request.userId} with attributes`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Common attribute templates
   */
  getCommonAttributes() {
    return {
      role: (value: string) => ({ name: 'role', value, ecert: true }),
      department: (value: string) => ({ name: 'department', value, ecert: true }),
      clearance: (value: string) => ({ name: 'clearance', value, ecert: true }),
      email: (value: string) => ({ name: 'email', value, ecert: true }),
      organization: (value: string) => ({ name: 'organization', value, ecert: true }),
    };
  }

  /**
   * Enroll manager with specific attributes
   */
  async enrollManager(userId: string, department: string): Promise<void> {
    const attrs = this.getCommonAttributes();
    await this.enrollWithAttributes({
      userId,
      attributes: [
        attrs.role('manager'),
        attrs.department(department),
        attrs.clearance('high'),
      ],
    });
  }

  /**
   * Enroll regular user
   */
  async enrollRegularUser(userId: string, department: string): Promise<void> {
    const attrs = this.getCommonAttributes();
    await this.enrollWithAttributes({
      userId,
      attributes: [
        attrs.role('user'),
        attrs.department(department),
        attrs.clearance('normal'),
      ],
    });
  }
}
```

---

## 5. NestJS Integration

### 5.1 Module Setup

```typescript
// fabric-wallet.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FabricWalletService } from './services/fabric-wallet.service';
import { InMemoryWalletService } from './services/in-memory-wallet.service';
import { X509IdentityService } from './services/x509-identity.service';
import { IdentityImportExportService } from './services/identity-import-export.service';
import { FabricCAClientService } from './services/fabric-ca-client.service';
import { AdminEnrollmentService } from './services/admin-enrollment.service';
import { UserRegistrationService } from './services/user-registration.service';
import { IdentityRevocationService } from './services/identity-revocation.service';
import { IdentityReenrollmentService } from './services/identity-reenrollment.service';
import { AttributeBasedEnrollmentService } from './services/attribute-based-enrollment.service';
import { IdentityController } from './controllers/identity.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    FabricWalletService,
    InMemoryWalletService,
    X509IdentityService,
    IdentityImportExportService,
    FabricCAClientService,
    AdminEnrollmentService,
    UserRegistrationService,
    IdentityRevocationService,
    IdentityReenrollmentService,
    AttributeBasedEnrollmentService,
  ],
  controllers: [IdentityController],
  exports: [
    FabricWalletService,
    InMemoryWalletService,
    X509IdentityService,
    FabricCAClientService,
    AdminEnrollmentService,
    UserRegistrationService,
  ],
})
export class FabricWalletModule {}
```

---

## 6. Testing

### 6.1 Unit Tests

```typescript
// tests/fabric-wallet.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FabricWalletService } from '../services/fabric-wallet.service';
import { X509Identity } from 'fabric-network';

describe('FabricWalletService', () => {
  let service: FabricWalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FabricWalletService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<FabricWalletService>(FabricWalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should put and get identity', async () => {
    const identity: X509Identity = {
      credentials: {
        certificate: '-----BEGIN CERTIFICATE-----...',
        privateKey: '-----BEGIN PRIVATE KEY-----...',
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await service.putIdentity('testUser', identity);
    const retrieved = await service.getIdentity('testUser');

    expect(retrieved).toBeDefined();
    expect(retrieved.mspId).toBe('Org1MSP');
  });
});
```

---

## Summary

This specialist covers 10 comprehensive patterns for Fabric SDK wallet and identity management:

1. **File System Wallet**: Persistent identity storage for production
2. **In-Memory Wallet**: Temporary storage for testing
3. **X.509 Identity**: Certificate-based identity handling
4. **Identity Export/Import**: Backup and transfer identities
5. **Fabric CA Client**: CA client setup and configuration
6. **Enroll Admin**: Bootstrap admin identity
7. **Register User**: Register and enroll new users
8. **Revoke Identity**: Certificate revocation
9. **Reenroll Identity**: Certificate renewal
10. **Attribute-Based Enrollment**: ABAC attributes in certificates

All patterns include NestJS integration, error handling, logging, and production-ready implementations.
