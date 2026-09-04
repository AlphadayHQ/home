-- Athena tables over CloudFront access logs - docs/seo-strategy.md 7.1, Appendix D.
--
-- Run in eu-west-1, against the query result location that
-- infra/cloudfront-log-storage.yaml outputs as AthenaOutputLocation.
--
-- Kept as SQL rather than AWS::Glue::Table YAML on purpose. The load-bearing
-- detail here is a single table property (skip.header.line.count), and
-- restating ~35 columns plus the SerDe in YAML adds a translation layer where
-- exactly that kind of detail drifts silently. These statements are what
-- Athena actually executes.
--
-- Verified working 2026-09-04.

CREATE DATABASE IF NOT EXISTS cf_logs;


-- ---------------------------------------------------------------------------
-- 1. alphaday.com - standard logging (v2), partitioned.
-- ---------------------------------------------------------------------------
--
-- skip.header.line.count = 1.
--
-- This is NOT the 2 that Appendix D's original runbook specified. v2 "plain"
-- output emits one bare column-name row with no leading '#'; legacy logging
-- emitted two '#'-prefixed lines. Setting 2 here discards the first real log
-- line of every file, with no error and no warning. Measured against the first
-- delivered file, which held 7 lines: that would have been a 14% silent loss.
--
-- If OutputFormat in cloudfront-access-logs.yaml ever changes, re-measure this
-- against a real delivered object before trusting any query.

CREATE EXTERNAL TABLE IF NOT EXISTS cf_logs.cf_logs_alphaday (
  `date` DATE, time STRING, location STRING, bytes BIGINT, request_ip STRING,
  method STRING, host STRING, uri STRING, status INT, referrer STRING,
  user_agent STRING, query_string STRING, cookie STRING, result_type STRING,
  request_id STRING, host_header STRING, request_protocol STRING,
  request_bytes BIGINT, time_taken FLOAT, xforwarded_for STRING,
  ssl_protocol STRING, ssl_cipher STRING, response_result_type STRING,
  http_version STRING, fle_status STRING, fle_encrypted_fields INT,
  c_port INT, time_to_first_byte FLOAT, x_edge_detailed_result_type STRING,
  sc_content_type STRING, sc_content_len BIGINT,
  sc_range_start BIGINT, sc_range_end BIGINT
)
PARTITIONED BY (distributionid STRING, year INT, month INT, day INT)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
LOCATION 's3://alphaday-cf-logs-v2/AWSLogs/aws-account-id=402248308880/CloudFront/'
TBLPROPERTIES (
  'skip.header.line.count'='1',
  -- Partition projection: Athena derives partitions from the key path rather
  -- than a metastore, so there is no crawler and no ALTER TABLE ADD PARTITION.
  -- Queries MUST carry year/month/day predicates for this to prune; without
  -- them Athena scans the whole retention window.
  'projection.enabled'='true',
  'projection.distributionid.type'='enum',
  'projection.distributionid.values'='E1QZ56RJ904M5R',
  'projection.year.type'='integer',
  'projection.year.range'='2026,2035',
  'projection.year.digits'='4',
  'projection.month.type'='integer',
  'projection.month.range'='1,12',
  'projection.month.digits'='2',
  'projection.day.type'='integer',
  'projection.day.range'='1,31',
  'projection.day.digits'='2',
  'storage.location.template'='s3://alphaday-cf-logs-v2/AWSLogs/aws-account-id=402248308880/CloudFront/distributionid=${distributionid}/year=${year}/month=${month}/day=${day}'
);


-- ---------------------------------------------------------------------------
-- 2. app.alphaday.com - legacy standard logging, unpartitioned. HISTORICAL.
-- ---------------------------------------------------------------------------
--
-- Read-only baseline: 2023-06-05 onward, ~325k objects, ~1.06 GB. This is the
-- before-picture for 7.1, captured before app.alphaday.com went noindex.
--
-- skip.header.line.count = 2 here, and that is correct - legacy logs open with
-- '#Version:' and '#Fields:'. The difference from table 1 above is the whole
-- point: the header count is a property of the log format, not a convention.
--
-- Unpartitioned by necessity. Legacy logging writes flat keys
-- (E3OO04R68QCILU.2026-08-15-14.1f184ba7.gz) with the date in the FILENAME,
-- not in a directory prefix, so there is nothing for partition projection to
-- match. Every query scans the full ~1 GB, which costs about half a cent. Do
-- not add projection to this table; it will silently return nothing.
--
-- The LOCATION bucket is deliberately NOT managed by cloudfront-log-storage.yaml
-- and must not receive v2 logs: Athena reads a LOCATION recursively, so any new
-- prefix here contaminates this baseline.

CREATE EXTERNAL TABLE IF NOT EXISTS cf_logs.cf_logs_app_history (
  `date` DATE, time STRING, location STRING, bytes BIGINT, request_ip STRING,
  method STRING, host STRING, uri STRING, status INT, referrer STRING,
  user_agent STRING, query_string STRING, cookie STRING, result_type STRING,
  request_id STRING, host_header STRING, request_protocol STRING,
  request_bytes BIGINT, time_taken FLOAT, xforwarded_for STRING,
  ssl_protocol STRING, ssl_cipher STRING, response_result_type STRING,
  http_version STRING, fle_status STRING, fle_encrypted_fields INT,
  c_port INT, time_to_first_byte FLOAT, x_edge_detailed_result_type STRING,
  sc_content_type STRING, sc_content_len BIGINT,
  sc_range_start BIGINT, sc_range_end BIGINT
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
LOCATION 's3://alphaday-cloudfront-logs/'
TBLPROPERTIES ('skip.header.line.count'='2');


-- ---------------------------------------------------------------------------
-- 3. The thesis query - 7.1.
-- ---------------------------------------------------------------------------
--
-- Fetches, errors and bytes per model crawler. Swap cf_logs_alphaday for
-- cf_logs_app_history to query the historical baseline (and drop the
-- year/month predicate, which that table does not have).
--
-- The user-agent field is URL-encoded in CloudFront logs, so it must be
-- decoded before matching.

/*
SELECT
  CASE
    WHEN ua LIKE '%GPTBot%'            THEN 'GPTBot'
    WHEN ua LIKE '%OAI-SearchBot%'     THEN 'OAI-SearchBot'
    WHEN ua LIKE '%ChatGPT-User%'      THEN 'ChatGPT-User'
    WHEN ua LIKE '%ClaudeBot%'         THEN 'ClaudeBot'
    WHEN ua LIKE '%Claude-User%'       THEN 'Claude-User'
    WHEN ua LIKE '%anthropic-ai%'      THEN 'anthropic-ai'
    WHEN ua LIKE '%PerplexityBot%'     THEN 'PerplexityBot'
    WHEN ua LIKE '%Perplexity-User%'   THEN 'Perplexity-User'
    WHEN ua LIKE '%CCBot%'             THEN 'CCBot'
    WHEN ua LIKE '%Google-Extended%'   THEN 'Google-Extended'
    WHEN ua LIKE '%Applebot-Extended%' THEN 'Applebot-Extended'
    WHEN ua LIKE '%meta-externalagent%' OR ua LIKE '%Meta-ExternalFetcher%'
                                       THEN 'Meta-External'
    WHEN ua LIKE '%Googlebot%'         THEN 'Googlebot'
    WHEN ua LIKE '%bingbot%' OR ua LIKE '%Bingbot%' THEN 'Bingbot'
    ELSE 'other'
  END AS crawler,
  COUNT(*) AS fetches,
  COUNT_IF(status >= 400) AS errors,
  COUNT(DISTINCT uri) AS distinct_uris,
  ROUND(SUM(bytes) / 1048576.0, 1) AS mb,
  ROUND(AVG(time_to_first_byte), 3) AS avg_ttfb
FROM (SELECT *, url_decode(user_agent) AS ua FROM cf_logs.cf_logs_alphaday
      WHERE year = 2026 AND month = 9)
WHERE crawler <> 'other'
GROUP BY 1 ORDER BY fetches DESC;
*/

-- Follow-ups worth keeping as saved queries:
--
--   Are the 6 artifacts actually being fetched?
--     ... WHERE uri IN ('/llms.txt','/llms-full.txt','/openapi.json','/robots.txt')
--     grouped by crawler. If 6 shipped and nothing fetches it, that is the answer.
--
--   Which URLs has Googlebot actually crawled?
--     SELECT DISTINCT uri ... filtered to Googlebot. This is the
--     crawled-and-indexed precondition the 4.3 pruning job depends on, and the
--     reason 7.1 pays for itself twice.
