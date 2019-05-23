import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import path = require('path');
import ecs = require('../../lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ');

const vpc = new ec2.Vpc(stack, 'MyVpc', {});

const cluster = new ecs.Cluster(stack, 'EcsCluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', { instanceType: new ec2.InstanceType('t2.micro') });

const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef', {
  executionRole: iam.Role.fromRoleArn(stack, 'ExecutionRole', 'arn:aws:iam::xxxxxxxxxxxx51:role/ecsExecutionRole')
});

const container = taskDefinition.addContainer('web', {
  image: new ecs.AssetImage(stack, 'Image', {
    directory: path.join(__dirname, '..', 'demo-image')
  }),
  memoryLimitMiB: 1024
});

container.addPortMappings({
  containerPort: 80,
  protocol: ecs.Protocol.Tcp
});

const service = new ecs.Ec2Service(stack, "Service", {
  cluster,
  taskDefinition,
});

service.addTracing();

app.run();
