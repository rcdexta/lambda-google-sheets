# lambda-google-sheets
Lambda function to pull data from Redshift DWH and dump to Google Spreadsheet

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

Run the following command substituting the username and password. Make sure you have the following setup in place on ur machine before executing the script:

* have node 8.10 runtime or higher 
* you have a local tunnel to DWH available on port 5439
* you have the AWS KEY and SECRET available in ~/.aws/credentials

This script will timout after 5 minutes. Increase timeout parameter in local.js if needed! 

```bash
$ SLS_DEBUG=* serverless invoke local --function lambda_sheets
```


### Deployment

To deploy the function to AWS, make sure aws_access_key_id, aws_secret_access_key and region are passed as environment vars to deploy command or configured in ~/.aws/config

```bash
$ serverless deploy
```

The deployment script should exit with status code 0.
