import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import ecs = require('../../lib');

import path = require('path');

const app = new cdk.App();

class EventStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.VpcNetwork(this, 'Vpc', { maxAZs: 1 });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });
    cluster.addCapacity('DefaultAutoScalingGroup', {
      instanceType: new ec2.InstanceType('t2.micro')
    });

    /// !show
    new ecs.ScheduledEc2Task(this, 'ScheduledTaskExample', {
      cluster,
      image: ecs.ContainerImage.fromAsset(this, 'EventImage', {
        directory: path.resolve(__dirname, "..", 'eventhandler-image')
      }),
      desiredTaskCount: 2,
      memoryLimitMiB: 512,
      cpu: 1,
      environment: { name: 'TRIGGER', value: 'CloudWatch Events' },
      scheduleExpression: 'rate(1 minute)'
    });
    /// !hide
  }
}

new EventStack(app, 'aws-ecs-integ-ecs');
app.run();
