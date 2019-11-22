import { expect, haveResourceLike } from '@aws-cdk/assert';
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/core');
import { Test } from 'nodeunit';
import ecs = require('../../lib');

export = {
  "When creating an Fargate TaskDefinition": {
    "with only required properties set, it correctly sets default properties"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      new ecs.FargateTaskDefinition(stack, 'FargateTaskDef');

      // THEN
      expect(stack).to(haveResourceLike("AWS::ECS::TaskDefinition", {
        Family: "FargateTaskDef",
        NetworkMode: ecs.NetworkMode.AWS_VPC,
        RequiresCompatibilities: ["FARGATE"],
        Cpu: "256",
        Memory: "512",
      }));

      test.done();
    },

    "warn when container cpu is greater than task definition cpu"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        cpu: 1,
      });

      taskDefinition.addContainer("web", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        cpu: 4,
      });
      // THEN
      test.deepEqual(taskDefinition.node.metadata[0].data, 'CPU specified for the container cannot be greater than the CPU for the task definition');
      test.done();
    },

    "warn when total container memory is greater than task definition memory"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        memoryLimitMiB: 100,
      });

      taskDefinition.addContainer("web", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 50,
      });

      taskDefinition.addContainer("frontend", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 51,
      });

      taskDefinition.addContainer("backend", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 1,
      });
      // THEN
      test.deepEqual(taskDefinition.node.metadata[0].data, 'Total memory specified for all containers cannot be greater than the memory for the task definition');
      test.deepEqual(taskDefinition.node.metadata[1].data, 'Total memory specified for all containers cannot be greater than the memory for the task definition');
      test.done();
    },

    "warn when container memory is greater than task definition memory"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        memoryLimitMiB: 1,
      });

      taskDefinition.addContainer("web", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        memoryLimitMiB: 4,
      });
      // THEN
      test.deepEqual(taskDefinition.node.metadata[0].data, 'Memory specified for the container cannot be greater than the memory for the task definition');
      test.done();
    },

    "warn when both container memory and cpu are greater than task definition memory and cpu"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        cpu: 1,
        memoryLimitMiB: 1,
      });

      taskDefinition.addContainer("web", {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
        cpu: 4,
        memoryLimitMiB: 4,
      });
      // THEN
      test.deepEqual(taskDefinition.node.metadata[0].data, 'CPU specified for the container cannot be greater than the CPU for the task definition');
      test.deepEqual(taskDefinition.node.metadata[1].data, 'Memory specified for the container cannot be greater than the memory for the task definition');
      test.done();
    },

    "support lazy cpu and memory values"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();

      new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        cpu: cdk.Lazy.numberValue({produce: () => 128}),
        memoryLimitMiB: cdk.Lazy.numberValue({produce: () => 1024})
      });

      // THEN
      expect(stack).to(haveResourceLike("AWS::ECS::TaskDefinition", {
        Cpu: "128",
        Memory: "1024"
      }));

      test.done();
    },

    "with all properties set"(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef', {
        cpu: 128,
        executionRole: new iam.Role(stack, 'ExecutionRole', {
          path: '/',
          assumedBy: new iam.CompositePrincipal(
            new iam.ServicePrincipal("ecs.amazonaws.com"),
            new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
          )
        }),
        family: "myApp",
        memoryLimitMiB: 1024,
        taskRole: new iam.Role(stack, 'TaskRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        })
      });

      taskDefinition.addVolume({
        host: {
          sourcePath: "/tmp/cache",
        },
        name: "scratch"
      });

      // THEN
      expect(stack).to(haveResourceLike("AWS::ECS::TaskDefinition", {
        Cpu: "128",
        ExecutionRoleArn: {
          "Fn::GetAtt": [
            "ExecutionRole605A040B",
            "Arn"
          ]
        },
        Family: "myApp",
        Memory: "1024",
        NetworkMode: "awsvpc",
        RequiresCompatibilities: [
          ecs.LaunchType.FARGATE
        ],
        TaskRoleArn: {
          "Fn::GetAtt": [
            "TaskRole30FC0FBB",
            "Arn"
          ]
        },
        Volumes: [
          {
            Host: {
              SourcePath: "/tmp/cache"
            },
            Name: "scratch"
          }
        ]
      }));

      test.done();
    },

    'throws when adding placement constraint'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const taskDefinition = new ecs.FargateTaskDefinition(stack, 'FargateTaskDef');

      // THEN
      test.throws(() => {
        taskDefinition.addPlacementConstraint(ecs.PlacementConstraint.memberOf("attribute:ecs.instance-type =~ t2.*"));
      }, /Cannot set placement constraints on tasks that run on Fargate/);

      test.done();
    }
  }
};
