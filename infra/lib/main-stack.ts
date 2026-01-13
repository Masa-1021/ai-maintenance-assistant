import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthStack } from './auth-stack';
import { DatabaseStack } from './database-stack';
import { StorageStack } from './storage-stack';
import { ApiStack } from './api-stack';

interface MainStackProps extends cdk.StackProps {
  appName: string;
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const { appName } = props;

    // Auth Stack
    const authStack = new AuthStack(this, 'AuthStack', {
      appName,
    });

    // Database Stack
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      appName,
    });

    // Storage Stack
    const storageStack = new StorageStack(this, 'StorageStack', {
      appName,
    });

    // API Stack
    const apiStack = new ApiStack(this, 'ApiStack', {
      appName,
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
      equipmentTable: databaseStack.equipmentTable,
      recordTable: databaseStack.recordTable,
      chatSessionTable: databaseStack.chatSessionTable,
      chatMessageTable: databaseStack.chatMessageTable,
      pdfBucket: storageStack.pdfBucket,
    });

    // Output important values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: authStack.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: authStack.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiStack.api.url,
      description: 'API Gateway Endpoint',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: storageStack.frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: storageStack.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${storageStack.distribution.distributionDomainName}`,
      description: 'CloudFront URL',
    });
  }
}
