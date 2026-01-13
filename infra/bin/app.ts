#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};

const appName = 'MaintenanceRecord';

// Auth Stack
const authStack = new AuthStack(app, `${appName}AuthStack`, {
  env,
  appName,
});

// Database Stack
const databaseStack = new DatabaseStack(app, `${appName}DatabaseStack`, {
  env,
  appName,
});

// Storage Stack
const storageStack = new StorageStack(app, `${appName}StorageStack`, {
  env,
  appName,
});

// API Stack
const apiStack = new ApiStack(app, `${appName}ApiStack`, {
  env,
  appName,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  equipmentTable: databaseStack.equipmentTable,
  recordTable: databaseStack.recordTable,
  chatSessionTable: databaseStack.chatSessionTable,
  chatMessageTable: databaseStack.chatMessageTable,
  pdfBucket: storageStack.pdfBucket,
});

app.synth();
