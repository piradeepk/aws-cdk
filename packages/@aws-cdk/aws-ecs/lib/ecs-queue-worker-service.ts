import cw = require('@aws-cdk/aws-cloudwatch');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');
import { ICluster } from './cluster';
import { ContainerImage } from './container-image';
import { Ec2Service } from './ec2/ec2-service';
import { Ec2TaskDefinition } from './ec2/ec2-task-definition';
import { AwsLogDriver } from './log-drivers/aws-log-driver';

/**
 * Properties to define an ECS service
 */
export interface Ec2QueueWorkerServiceProps {
  /**
   * Cluster where service will be deployed
   */
  readonly cluster: ICluster;

  /**
   * The image to start.
   */
  readonly image: ContainerImage;

  /**
   * The CMD value to pass to the container. A string with commands delimited by commas.
   *
   * @default none
   */
  readonly command?: string;

  /**
   * The minimum number of CPU units to reserve for the container.
   *
   * @default none
   */
  readonly cpu?: number;

  /**
   * Number of desired copies of running tasks
   *
   * @default 1
   */
  readonly desiredCount?: number;

  /**
   * The environment variables to pass to the container.
   *
   * @default true
   */
  readonly enableLogging?: boolean;

  /**
   * The environment variables to pass to the container.
   *
   * @default none
   */
  readonly environment?: { [key: string]: string };

  /**
   * The hard limit (in MiB) of memory to present to the container.
   *
   * If your container attempts to exceed the allocated memory, the container
   * is terminated.
   *
   * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
   */
  readonly memoryLimitMiB?: number;

  /**
   * The soft limit (in MiB) of memory to reserve for the container.
   *
   * When system memory is under contention, Docker attempts to keep the
   * container memory within the limit. If the container requires more memory,
   * it can consume up to the value specified by the Memory property or all of
   * the available memory on the container instance—whichever comes first.
   *
   * At least one of memoryLimitMiB and memoryReservationMiB is required for non-Fargate services.
   */
  readonly memoryReservationMiB?: number;

  /**
   * A name for the queue.
   *
   * If specified and this is a FIFO queue, must end in the string '.fifo'.
   *
   * @default CloudFormation-generated name
   */
  readonly queueName?: string;
}

/**
 * Base class for load-balanced Fargate and ECS service
 */
export abstract class Ec2QueueWorkerService extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: Ec2QueueWorkerServiceProps) {
    super(scope, id);

    const logging = props.enableLogging !== undefined ? props.enableLogging : true;

    // Create a Task Definition for the container to start, also creates a log driver
    const taskDefinition = new Ec2TaskDefinition(this, 'QueueWorkerTaskDef');
    taskDefinition.addContainer('QueueWorkerContainer', {
      image: props.image,
      memoryLimitMiB: props.memoryLimitMiB,
      memoryReservationMiB: props.memoryReservationMiB,
      cpu: props.cpu,
      command: props.command !== undefined ? cdk.Fn.split(",", props.command) : undefined,
      environment: props.environment,
      logging: logging ? this.createAwsLogDriver(this.node.id) : undefined
    });

    const ecsService = new Ec2Service(this, "Service", {
      cluster: props.cluster,
      desiredCount: props.desiredCount || 1,
      taskDefinition,
    });

    // Create the worker sqs queue
    const sqsQueue = new sqs.Queue(this, 'ecs-worker-queue', {
      queueName: props.queueName,
    });

    // Setup AutoScaling policy
    const scaling = ecsService.autoScaleTaskCount({ maxCapacity: 2 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldownSec: 60,
      scaleOutCooldownSec: 60
    });

    const scalingMetric = sqsQueue.metricNumberOfMessagesSent;
    scaling.scaleOnMetric(sqsQueue.metricApproximateNumberOfMessagesNotVisible)

    

    new cdk.CfnOutput(this, 'SQSQueue', { value: sqsQueue.queueName });
    new cdk.CfnOutput(this, 'SQSQueueArn', { value: sqsQueue.queueArn });
  }

  private createAwsLogDriver(prefix: string): AwsLogDriver {
    return new AwsLogDriver(this, 'ScheduledTaskLogging', { streamPrefix: prefix });
  }
}
