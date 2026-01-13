import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  appName: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly equipmentTable: dynamodb.Table;
  public readonly recordTable: dynamodb.Table;
  public readonly chatSessionTable: dynamodb.Table;
  public readonly chatMessageTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Equipment Table (設備マスタ)
    this.equipmentTable = new dynamodb.Table(this, 'EquipmentTable', {
      tableName: `${props.appName}Equipment`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for equipment ID search
    this.equipmentTable.addGlobalSecondaryIndex({
      indexName: 'EquipmentIdIndex',
      partitionKey: { name: 'equipmentId', type: dynamodb.AttributeType.STRING },
    });

    // Maintenance Record Table (メンテナンス記録)
    this.recordTable = new dynamodb.Table(this, 'RecordTable', {
      tableName: `${props.appName}Record`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for equipment-based record search
    this.recordTable.addGlobalSecondaryIndex({
      indexName: 'EquipmentRecordIndex',
      partitionKey: { name: 'equipmentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // GSI for date-based record search
    this.recordTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Chat Session Table (チャットセッション)
    this.chatSessionTable = new dynamodb.Table(this, 'ChatSessionTable', {
      tableName: `${props.appName}ChatSession`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Chat Message Table (チャットメッセージ)
    this.chatMessageTable = new dynamodb.Table(this, 'ChatMessageTable', {
      tableName: `${props.appName}ChatMessage`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Outputs
    new cdk.CfnOutput(this, 'EquipmentTableName', {
      value: this.equipmentTable.tableName,
      exportName: `${props.appName}EquipmentTableName`,
    });

    new cdk.CfnOutput(this, 'RecordTableName', {
      value: this.recordTable.tableName,
      exportName: `${props.appName}RecordTableName`,
    });

    new cdk.CfnOutput(this, 'ChatSessionTableName', {
      value: this.chatSessionTable.tableName,
      exportName: `${props.appName}ChatSessionTableName`,
    });

    new cdk.CfnOutput(this, 'ChatMessageTableName', {
      value: this.chatMessageTable.tableName,
      exportName: `${props.appName}ChatMessageTableName`,
    });
  }
}
