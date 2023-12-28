#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkshopGlobalacceleratorStack } from '../lib/workshop_globalaccelerator-stack';

const app = new cdk.App();
new WorkshopGlobalacceleratorStack(app, 'WorkshopGlobalacceleratorStack', {
  env: {
    region: 'us-east-1'
  }
});