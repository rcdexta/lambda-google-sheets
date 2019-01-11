# lambda-google-sheets
Lambda function to pull data from Postgres database and dump to Google Spreadsheet

More context in this [blog post](https://blog.bitsrc.io/serverless-function-to-sync-data-from-a-database-to-google-spreadsheet-c71af04a1a34)

### Installation

Clone the repository and run 

```bash
$ npm install
$ npm install -g serverless
```

Make sure the environment variables as present in `pgClient.js` are populated correctly. 

### Configuration

Review the contents of `config.json` to add the source of importing data.

### Testing Locally

Make sure you have the following setup in place on ur machine before executing the script:

* have node 8.10 runtime or higher 
* you have a local tunnel to DWH available on port 5439
* you have the AWS KEY and SECRET available in ~/.aws/credentials

```bash
$ SLS_DEBUG=* serverless invoke local --function lambda_sheets
```


### Deployment

To deploy the function to AWS, make sure aws_access_key_id, aws_secret_access_key and region are passed as environment vars to deploy command or configured in ~/.aws/config

```bash
$ serverless deploy
```

The deployment script should exit with status code 0.
