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
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          // cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          // cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ],
      ipProtocol: ec2.IpProtocol.DUAL_STACK,  // Dual Stack
      enableDnsHostnames: true,
      enableDnsSupport: true
    }
    )

    // ------ ALB -------
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
      internetFacing: false,
      ipAddressType: elbv2.IpAddressType.DUAL_STACK  // Dual Stack
    })
    this.alb = alb


    alb.connections.allowFromAnyIpv4(ec2.Port.tcp(443), 'Enable HTTPS access on the Application Load Balancer')
    alb.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Enable HTTP access on the Application Load Balancer')


    const userData = ec2.UserData.forLinux({ shebang: '#!/bin/bash' })
    userData.addCommands(
      'yum update -y',
      'yum install -y httpd',
      'systemctl start httpd',
      'echo "Hello World" >> /var/www/html/index.html'
    )

    // EC2インスタンスを作成
    const ec2Instance = new ec2.Instance(this, 'TargetInstance', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64
      }),
      userData: userData,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
      ssmSessionPermissions: true
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      healthCheck: {
        interval: cdk.Duration.seconds(35),
        timeout: cdk.Duration.seconds(30),
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 5
      },
      targetType: elbv2.TargetType.INSTANCE,
      targets: [new targets.InstanceTarget(ec2Instance)],
      vpc: vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80
    })

    new elbv2.ApplicationListener(this, 'Listener', {
      loadBalancer: alb,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup])
    })

    ec2Instance.connections.allowFrom(alb, ec2.Port.tcp(80))

    vpc.addInterfaceEndpoint("SSMEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
    });
    vpc.addInterfaceEndpoint("SSMMessagesEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    });
    vpc.addInterfaceEndpoint("EC2MessagesEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });

  }
}