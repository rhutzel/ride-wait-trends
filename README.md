# Ride Wait Trends

Logs wait times for popular theme park rides a few times per 
day. This is a Serverless Node.js project that deploys as an AWS 
Lambda function and persists to an AWS DynamoDB. It is invoked 
according to a CRON schedule.

The goal is to have enough data collected over time to get a 
good sense of the average wait time for key attractions during 
each week of the year.

## Deployment

* Install the [Serverless](https://serverless.com/) toolkit from 
[Yarn](https://yarnpkg.com/lang/en/docs/install/) 
and the [AWS CLI](https://aws.amazon.com/cli/) from Python's 
[PIP3](https://pip.pypa.io/en/stable/installing/).
* Have AWS credentials stored in `~/.aws/credentials` that are privileged 
enough to provision a CloudFormation stack that includes a DynamoDB 
instance, CloudWatch log and schedule, an S3 bucket, an IAM role, and a 
Lambda function. If the risk is acceptable, it is easiest to give 
this user/group the "AdministratorAccess" policy.

* Deploy the project to a development stage.

`yarn deploy`

* Invoke the `retrieve` Lambda function locally and confirm that a record is added to DynamoDB's `ride-wait-trends-dev` table.

`yarn start`

* Refer to the Serverless toolkit's [AWS documentation](https://serverless.com/framework/docs/providers/aws/) for additional functionality.

