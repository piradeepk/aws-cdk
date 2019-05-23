import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import path = require('path');
import ecs = require('../../lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ');

const vpc = new ec2.Vpc(stack, 'Vpc', { maxAZs: 2 });

const cluster = new ecs.Cluster(stack, 'FargateCluster', { vpc });

const taskDefinition = new ecs.FargateTaskDefinition(stack, 'TaskDef', {
  memoryMiB: '1GB',
  cpu: '512',
  executionRole: iam.Role.fromRoleArn(stack, 'ExecutionRole', 'arn:aws:iam::xxxxxxxxxxxx51:role/ecsExecutionRole')
});

const container = taskDefinition.addContainer('web', {
  image: new ecs.AssetImage(stack, 'Image', {
    directory: path.join(__dirname, '..', 'demo-image')
  })
});

container.addPortMappings({
  containerPort: 80,
  protocol: ecs.Protocol.Tcp
});

const service = new ecs.FargateService(stack, "Service", {
  cluster,
  taskDefinition,
});

service.addTracing();

app.run();
