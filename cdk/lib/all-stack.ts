// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as constructs from "constructs";
import { Duration } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

export class AllStack extends cdk.Stack {
  public apiUrl = '';

  constructor(scope: constructs.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    
    const apiFunction = new lambda.Function(this, "apiHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../simple-ssr/api"),
      memorySize: 128,
      timeout: Duration.seconds(5),
      handler: "index.handler"
    });

    const api = new apigw.LambdaRestApi(this, "apiEndpoint", {
      handler: apiFunction,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS
      }
    });

    this.apiUrl = api.url;

    new cdk.CfnOutput(this, "apiurl", { value: api.url });

    const appConfig = {
      apiUrl: api.url,
    };

    const mySiteBucket = new s3.Bucket(this, "ssr-site", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: false,
      //only for demo not to use in production
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    new cdk.CfnOutput(this, "Bucket", { value: mySiteBucket.bucketName });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "ssr-oia"
    );
    mySiteBucket.grantRead(originAccessIdentity);

    new s3deploy.BucketDeployment(this, "Client-side React app", {
      sources: [s3deploy.Source.asset("../simple-ssr/build/"),s3deploy.Source.jsonData('config.json', appConfig)],
      destinationBucket: mySiteBucket
    });

    const ssrFunction = new lambda.Function(this, "ssrHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../simple-ssr/server-build"),
      memorySize: 128,
      timeout: Duration.seconds(5),
      handler: "index.handler"
    });

    const ssrEdgeFunction = new lambda.Function(this, "ssrEdgeHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../simple-ssr/edge-build"),
      memorySize: 128,
      timeout: Duration.seconds(5),
      handler: "index.handler"
    });

    const ssrEdgeFunctionVersion = new lambda.Version(
      this,
      "ssrEdgeHandlerVersion",
      { lambda: ssrEdgeFunction }
    );

    const ssrApi = new apigw.LambdaRestApi(this, "ssrEndpoint", {
      handler: ssrFunction
    });

    new cdk.CfnOutput(this, "SSR API URL", { value: ssrApi.url });

    const apiDomainName = `${ssrApi.restApiId}.execute-api.${this.region}.amazonaws.com`;

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "ssr-cdn",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: mySiteBucket,
              originAccessIdentity: originAccessIdentity
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                lambdaFunctionAssociations: [
                  {
                    eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                    lambdaFunction: ssrEdgeFunctionVersion
                  }
                ]
              }
            ]
          },
          {
            customOriginSource: {
              domainName: apiDomainName,
              originPath: "/prod",
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
            },
            behaviors: [
              {
                pathPattern: "/ssr"
              }
            ]
          }
        ]
      }
    );

    new cdk.CfnOutput(this, "CF URL", {
      value: `https://${distribution.distributionDomainName}`
    });
    new cdk.CfnOutput(this, "Lambda SSR URL", {
      value: `https://${distribution.distributionDomainName}/ssr`
    });
    new cdk.CfnOutput(this, "Lambda@Edge SSR URL", {
      value: `https://${distribution.distributionDomainName}/edgessr`
    });    
  }
}
