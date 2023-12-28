import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendConstruct } from './construct/backend';
import { EdgeConstruct } from './construct/edge';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class WorkshopGlobalacceleratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backend = new BackendConstruct(this, 'BackendConstruct', {})

    new EdgeConstruct(this, 'EdgeConstruct', {
      alb: backend.alb
    })

  }
}
