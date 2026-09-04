# infra

CloudFront access logging for `alphaday.com`, backing
[docs/seo-strategy.md](../docs/seo-strategy.md) §7.1 and Appendix D.

## Deploy order

Two stacks, two regions, and the order matters. **CloudFormation is
single-region**, but the CloudWatch Logs delivery API only accepts CloudFront
sources in `us-east-1`, while the buckets are in `eu-west-1`. That is why this
cannot be one stack.

```bash
# 1. Buckets (eu-west-1). The delivery stack references the log bucket by name
#    and will fail if it does not exist.
aws cloudformation deploy \
  --region eu-west-1 \
  --stack-name alphaday-cf-log-storage \
  --template-file infra/cloudfront-log-storage.yaml

# 2. Delivery (us-east-1).
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name alphaday-cf-access-logs \
  --template-file infra/cloudfront-access-logs.yaml

# 3. Athena tables. Set the query result location to the storage stack's
#    AthenaOutputLocation output, then run:
#    infra/athena/cf-logs-tables.sql
```

Verify: `aws logs describe-deliveries --region us-east-1`, then check that
objects appear under the `LogPrefix` stack output. First delivery took about
three minutes in practice, not the hour the AWS docs suggest.

## Files

| File | What |
| --- | --- |
| `cloudfront-log-storage.yaml` | eu-west-1. Log bucket (180-day expiry, `Retain`) and Athena results bucket (30-day expiry). |
| `cloudfront-access-logs.yaml` | us-east-1. The three v2 delivery resources. |
| `athena/cf-logs-tables.sql` | Both Athena tables plus the crawler query. Kept as SQL, not `AWS::Glue::Table` — see the note in the file. |

## Things that will bite you

- **`OutputFormat` and `skip.header.line.count` are coupled.** v2 `plain` emits
  one bare header line; legacy logging emitted two `#`-prefixed lines. Get this
  wrong and Athena silently discards real log rows from every file, with no
  error. Re-measure against a delivered object if the format ever changes.
- **Use the lowercase `{distributionid}` path variable.** The uppercase
  `{DistributionId}` emits a `DistributionId=` segment that Glue and Athena will
  not match, breaking partition projection.
- **Do not point v2 delivery at `alphaday-cloudfront-logs`.** That bucket holds
  the legacy `app.alphaday.com` history, and the Athena table over it uses the
  bucket root as `LOCATION`, which Athena reads recursively. Any new prefix
  there contaminates the pre-`noindex` crawler baseline.
- **`OutputFormat` cannot be changed in place.** Delete the delivery and
  destination and recreate them.
- **AWS leaves an orphaned bucket-policy statement behind** when a delivery is
  deleted. It is scoped to the dead delivery-source ARN, so it grants nothing,
  but it accumulates across delete/recreate cycles. AWS manages this policy
  outside the stack, so CloudFormation will neither create nor clean it up.
  Check `get-bucket-policy` after any recreate.
