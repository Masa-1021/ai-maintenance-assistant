import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  appName: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  equipmentTable: dynamodb.Table;
  recordTable: dynamodb.Table;
  chatSessionTable: dynamodb.Table;
  chatMessageTable: dynamodb.Table;
  pdfBucket: s3.Bucket;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.appName}Api`,
      description: 'Maintenance Record API',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: `${props.appName}Authorizer`,
    });

    // Common Lambda environment variables
    const commonEnv = {
      EQUIPMENT_TABLE: props.equipmentTable.tableName,
      RECORD_TABLE: props.recordTable.tableName,
      CHAT_SESSION_TABLE: props.chatSessionTable.tableName,
      CHAT_MESSAGE_TABLE: props.chatMessageTable.tableName,
      PDF_BUCKET: props.pdfBucket.bucketName,
      REGION: this.region,
    };

    // Lambda function defaults
    const lambdaDefaults: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    };

    // Equipment Handler
    const equipmentHandler = new nodejs.NodejsFunction(this, 'EquipmentHandler', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../backend/src/handlers/equipment.ts'),
      handler: 'handler',
      functionName: `${props.appName}EquipmentHandler`,
    });
    props.equipmentTable.grantReadWriteData(equipmentHandler);
    props.recordTable.grantReadData(equipmentHandler);

    // Chat Handler
    const chatHandler = new nodejs.NodejsFunction(this, 'ChatHandler', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../backend/src/handlers/chat.ts'),
      handler: 'handler',
      functionName: `${props.appName}ChatHandler`,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });
    props.chatSessionTable.grantReadWriteData(chatHandler);
    props.chatMessageTable.grantReadWriteData(chatHandler);
    props.equipmentTable.grantReadData(chatHandler);
    props.pdfBucket.grantRead(chatHandler);

    // Bedrock permissions for Chat Handler
    chatHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Record Handler
    const recordHandler = new nodejs.NodejsFunction(this, 'RecordHandler', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../backend/src/handlers/record.ts'),
      handler: 'handler',
      functionName: `${props.appName}RecordHandler`,
    });
    props.recordTable.grantReadWriteData(recordHandler);
    props.chatSessionTable.grantReadWriteData(recordHandler);
    props.equipmentTable.grantReadData(recordHandler);

    // File Handler
    const fileHandler = new nodejs.NodejsFunction(this, 'FileHandler', {
      ...lambdaDefaults,
      entry: path.join(__dirname, '../../backend/src/handlers/file.ts'),
      handler: 'handler',
      functionName: `${props.appName}FileHandler`,
    });
    props.pdfBucket.grantReadWrite(fileHandler);

    // API Resources and Methods
    const authOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Equipment endpoints
    const equipment = this.api.root.addResource('equipment');
    equipment.addMethod('GET', new apigateway.LambdaIntegration(equipmentHandler), authOptions);
    equipment.addMethod('POST', new apigateway.LambdaIntegration(equipmentHandler), authOptions);

    const equipmentById = equipment.addResource('{id}');
    equipmentById.addMethod('GET', new apigateway.LambdaIntegration(equipmentHandler), authOptions);
    equipmentById.addMethod('PUT', new apigateway.LambdaIntegration(equipmentHandler), authOptions);
    equipmentById.addMethod('DELETE', new apigateway.LambdaIntegration(equipmentHandler), authOptions);

    // Chat endpoints
    const chat = this.api.root.addResource('chat');
    const sessions = chat.addResource('sessions');
    sessions.addMethod('GET', new apigateway.LambdaIntegration(chatHandler), authOptions);
    sessions.addMethod('POST', new apigateway.LambdaIntegration(chatHandler), authOptions);

    const sessionById = sessions.addResource('{id}');
    sessionById.addMethod('GET', new apigateway.LambdaIntegration(chatHandler), authOptions);
    sessionById.addMethod('DELETE', new apigateway.LambdaIntegration(chatHandler), authOptions);

    const messages = sessionById.addResource('messages');
    messages.addMethod('GET', new apigateway.LambdaIntegration(chatHandler), authOptions);
    messages.addMethod('POST', new apigateway.LambdaIntegration(chatHandler), authOptions);

    // Record endpoints
    const records = this.api.root.addResource('records');
    records.addMethod('GET', new apigateway.LambdaIntegration(recordHandler), authOptions);
    records.addMethod('POST', new apigateway.LambdaIntegration(recordHandler), authOptions);

    const recordExport = records.addResource('export');
    recordExport.addMethod('GET', new apigateway.LambdaIntegration(recordHandler), authOptions);

    const recordById = records.addResource('{id}');
    recordById.addMethod('GET', new apigateway.LambdaIntegration(recordHandler), authOptions);
    recordById.addMethod('PUT', new apigateway.LambdaIntegration(recordHandler), authOptions);
    recordById.addMethod('DELETE', new apigateway.LambdaIntegration(recordHandler), authOptions);

    // File endpoints
    const files = this.api.root.addResource('files');
    const uploadUrl = files.addResource('upload-url');
    uploadUrl.addMethod('POST', new apigateway.LambdaIntegration(fileHandler), authOptions);

    const fileByKey = files.addResource('{key}');
    fileByKey.addMethod('GET', new apigateway.LambdaIntegration(fileHandler), authOptions);

    // Add CORS headers to Gateway Responses (4xx/5xx errors)
    this.api.addGatewayResponse('Default4xxResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('Default5xxResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      exportName: `${props.appName}ApiEndpoint`,
    });
  }
}
