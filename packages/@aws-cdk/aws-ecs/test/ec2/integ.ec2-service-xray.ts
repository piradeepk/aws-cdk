import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import ecs = require('../../lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-xray-protocol');

const vpc = new ec2.Vpc(stack, 'MyVpc', {});

const cluster = new ecs.Cluster(stack, 'EcsCluster', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', { instanceType: new ec2.InstanceType('t2.micro') });

const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef', {
  executionRole: iam.Role.fromRoleArn(stack, 'ExecutionRole', 'arn:aws:iam::xxxxxxxxxxxx51:role/ecsExecutionRole')
});

const container = taskDefinition.addContainer('primary', {
  image: ecs.ContainerImage.fromRegistry("xxxxxxxxxxxx51.dkr.ecr.us-west-2.amazonaws.com/scorekeep-api"),
  memoryLimitMiB: 512,
});

container.addPortMappings({
  containerPort: 80,
  protocol: ecs.Protocol.Tcp
});

const service = new ecs.Ec2Service(stack, "Service", {
  cluster,
  desiredCount: 1,
  taskDefinition
});

service.addTracing();

app.run();
