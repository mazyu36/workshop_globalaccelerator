import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2_targets as targets } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export interface BackendConstructProps {

}

export class BackendConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer
  constructor(scope: Construct, id: string, props: BackendConstructProps) {
    super(scope, id);

    // ------ VPC -------
    const vpc = new ec2.Vpc(this, 'Vpc', {
      natGateways: 0,
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('10.135.0.0/16'),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    }
    )

    // ------ Lambda -------
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      description: 'This Lambda function simply returns the AWS region and its name.',
      handler: 'index.lambda_handler',
      code: lambda.Code.fromAsset('./lib/lambda/')
    })


    // ------ ALB -------
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      internetFacing: true,

    })
    this.alb = alb

    alb.connections.allowFromAnyIpv4(ec2.Port.tcp(443), 'Enable HTTPS access on the Application Load Balancer')
    alb.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Enable HTTP access on the Application Load Balancer')


    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'LambdaTargetGroup', {
      healthCheck: {
        interval: cdk.Duration.seconds(35),
        timeout: cdk.Duration.seconds(30),
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 5
      },
      targetType: elbv2.TargetType.LAMBDA,
      targets: [new targets.LambdaTarget(lambdaFunction)]
    })

    new elbv2.ApplicationListener(this, 'Listener', {
      loadBalancer: alb,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup])
    })







  }
}