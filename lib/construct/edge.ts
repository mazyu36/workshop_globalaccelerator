import { Construct } from 'constructs';
import { aws_globalaccelerator as globalaccelerator } from 'aws-cdk-lib';
import { aws_globalaccelerator_endpoints as ga_endpoints } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';


export interface EdgeConstructProps {
  alb: elbv2.ApplicationLoadBalancer
}

export class EdgeConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EdgeConstructProps) {
    super(scope, id);

    // アクセラレータを作成
    const accelerator = new globalaccelerator.Accelerator(this, 'Accelerator', {
      ipAddressType: globalaccelerator.IpAddressType.DUAL_STACK  // Dual Stack
    })

    // リスナーを作成
    const listener = new globalaccelerator.Listener(this, 'Listener', {
      accelerator: accelerator,
      portRanges: [{ fromPort: 80 }],
      clientAffinity: globalaccelerator.ClientAffinity.NONE,
      protocol: globalaccelerator.ConnectionProtocol.TCP
    })

    // リスナーにALBのエンドポイントグループを追加
    listener.addEndpointGroup('AlbEndpointGroup', {
      endpoints: [
        new ga_endpoints.ApplicationLoadBalancerEndpoint(props.alb, {
          weight: 128,
          preserveClientIp: true
        }
        )
      ],
    })

  }
}