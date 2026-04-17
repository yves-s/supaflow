-- Supaflow Dashboard Seed Data
-- Run against a Supabase instance that has supaflow_schema.sql applied.
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).
--
-- Usage:
--   psql $DATABASE_URL -f seed.sql
--   OR paste into Supabase SQL Editor
--   OR use supabase MCP: execute_sql

-- ============================================================
-- WORKFLOW RUNS
-- klaviyo-unsubscribe: 001-035
--   completed: 001-030
--   failed:    031-033
--   running:   034
--   pending:   035
-- hubspot-sync: 036-060
--   completed: 036-055
--   failed:    056-059
--   running:   060
-- ============================================================

INSERT INTO workflow_runs (id, workflow_name, trigger_type, trigger_payload, status, started_at, completed_at, duration_ms, error, metadata) VALUES

-- klaviyo-unsubscribe: completed (001-030)
('00000000-0000-4000-a000-000000000001','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user1@example.com","list_id":"kl_001"}','completed',now()-interval'330h',now()-interval'329h58m',112000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000002','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user2@example.com","list_id":"kl_001"}','completed',now()-interval'325h',now()-interval'324h58m',98000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000003','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user3@example.com","list_id":"kl_002"}','completed',now()-interval'320h',now()-interval'319h58m',145000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000004','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user4@example.com","list_id":"kl_002"}','completed',now()-interval'315h',now()-interval'314h57m',180000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000005','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user5@example.com","list_id":"kl_003"}','completed',now()-interval'310h',now()-interval'309h58m',92000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000006','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user6@example.com","list_id":"kl_003"}','completed',now()-interval'305h',now()-interval'304h57m',210000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000007','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user7@example.com","list_id":"kl_001"}','completed',now()-interval'300h',now()-interval'299h58m',134000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000008','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user8@example.com","list_id":"kl_002"}','completed',now()-interval'295h',now()-interval'294h57m',167000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000009','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user9@example.com","list_id":"kl_001"}','completed',now()-interval'290h',now()-interval'289h58m',88000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000010','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user10@example.com","list_id":"kl_003"}','completed',now()-interval'285h',now()-interval'284h57m',201000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000011','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user11@example.com","list_id":"kl_002"}','completed',now()-interval'280h',now()-interval'279h58m',119000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000012','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user12@example.com","list_id":"kl_001"}','completed',now()-interval'275h',now()-interval'274h57m',155000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000013','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user13@example.com","list_id":"kl_003"}','completed',now()-interval'270h',now()-interval'269h58m',243000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000014','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user14@example.com","list_id":"kl_002"}','completed',now()-interval'265h',now()-interval'264h57m',176000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000015','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user15@example.com","list_id":"kl_001"}','completed',now()-interval'260h',now()-interval'259h58m',103000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000016','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user16@example.com","list_id":"kl_003"}','completed',now()-interval'240h',now()-interval'239h57m',198000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000017','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user17@example.com","list_id":"kl_002"}','completed',now()-interval'220h',now()-interval'219h58m',142000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000018','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user18@example.com","list_id":"kl_001"}','completed',now()-interval'200h',now()-interval'199h57m',267000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000019','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user19@example.com","list_id":"kl_003"}','completed',now()-interval'180h',now()-interval'179h58m',89000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000020','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user20@example.com","list_id":"kl_002"}','completed',now()-interval'160h',now()-interval'159h57m',215000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000021','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user21@example.com","list_id":"kl_001"}','completed',now()-interval'140h',now()-interval'139h58m',131000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000022','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user22@example.com","list_id":"kl_003"}','completed',now()-interval'120h',now()-interval'119h57m',174000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000023','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user23@example.com","list_id":"kl_002"}','completed',now()-interval'100h',now()-interval'99h58m',96000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000024','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user24@example.com","list_id":"kl_001"}','completed',now()-interval'80h',now()-interval'79h57m',228000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000025','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user25@example.com","list_id":"kl_003"}','completed',now()-interval'72h',now()-interval'71h58m',153000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000026','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user26@example.com","list_id":"kl_002"}','completed',now()-interval'60h',now()-interval'59h57m',107000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000027','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user27@example.com","list_id":"kl_001"}','completed',now()-interval'48h',now()-interval'47h58m',189000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000028','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user28@example.com","list_id":"kl_003"}','completed',now()-interval'36h',now()-interval'35h57m',234000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000029','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user29@example.com","list_id":"kl_002"}','completed',now()-interval'24h',now()-interval'23h58m',118000,NULL,'{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000030','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user30@example.com","list_id":"kl_001"}','completed',now()-interval'12h',now()-interval'11h57m',162000,NULL,'{"source":"klaviyo","version":"2"}'),

-- klaviyo-unsubscribe: failed (031-033)
('00000000-0000-4000-a000-000000000031','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user31@example.com","list_id":"kl_002"}','failed',now()-interval'250h',now()-interval'249h59m',61000,'HTTP 429: Rate limit exceeded. Retry-After: 60s','{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000032','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user32@example.com","list_id":"kl_003"}','failed',now()-interval'150h',now()-interval'149h59m',45000,'Connection timeout after 30000ms: upstream klaviyo-api.com unreachable','{"source":"klaviyo","version":"2"}'),
('00000000-0000-4000-a000-000000000033','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"bad-email","list_id":"kl_001"}','failed',now()-interval'50h',now()-interval'49h59m',12000,'Validation error: email field is not a valid email address','{"source":"klaviyo","version":"2"}'),

-- klaviyo-unsubscribe: running (034)
('00000000-0000-4000-a000-000000000034','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user34@example.com","list_id":"kl_003"}','running',now()-interval'2m',NULL,NULL,NULL,'{"source":"klaviyo","version":"2"}'),

-- klaviyo-unsubscribe: pending (035)
('00000000-0000-4000-a000-000000000035','klaviyo-unsubscribe','webhook','{"event":"unsubscribe","email":"user35@example.com","list_id":"kl_001"}','pending',now()-interval'30s',NULL,NULL,NULL,'{"source":"klaviyo","version":"2"}'),

-- hubspot-sync: completed (036-055)
('00000000-0000-4000-a000-000000000036','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1001","portal_id":"99001"}','completed',now()-interval'328h',now()-interval'327h57m',189000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000037','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1002","portal_id":"99001"}','completed',now()-interval'322h',now()-interval'321h58m',143000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000038','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1003","portal_id":"99001"}','completed',now()-interval'316h',now()-interval'315h57m',217000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000039','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1004","portal_id":"99001"}','completed',now()-interval'310h',now()-interval'309h58m',96000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000040','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1005","portal_id":"99001"}','completed',now()-interval'304h',now()-interval'303h57m',258000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000041','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1006","portal_id":"99001"}','completed',now()-interval'298h',now()-interval'297h58m',174000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000042','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1007","portal_id":"99001"}','completed',now()-interval'292h',now()-interval'291h57m',131000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000043','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1008","portal_id":"99001"}','completed',now()-interval'286h',now()-interval'285h58m',205000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000044','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1009","portal_id":"99001"}','completed',now()-interval'248h',now()-interval'247h57m',118000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000045','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1010","portal_id":"99001"}','completed',now()-interval'220h',now()-interval'219h58m',267000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000046','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1011","portal_id":"99001"}','completed',now()-interval'196h',now()-interval'195h57m',153000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000047','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1012","portal_id":"99001"}','completed',now()-interval'172h',now()-interval'171h58m',89000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000048','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1013","portal_id":"99001"}','completed',now()-interval'148h',now()-interval'147h57m',241000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000049','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1014","portal_id":"99001"}','completed',now()-interval'124h',now()-interval'123h58m',177000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000050','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1015","portal_id":"99001"}','completed',now()-interval'100h',now()-interval'99h57m',109000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000051','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1016","portal_id":"99001"}','completed',now()-interval'84h',now()-interval'83h58m',198000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000052','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1017","portal_id":"99001"}','completed',now()-interval'68h',now()-interval'67h57m',134000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000053','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_1018","portal_id":"99001"}','completed',now()-interval'52h',now()-interval'51h58m',223000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000054','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1019","portal_id":"99001"}','completed',now()-interval'32h',now()-interval'31h57m',87000,NULL,'{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000055','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1020","portal_id":"99001"}','completed',now()-interval'8h',now()-interval'7h58m',156000,NULL,'{"source":"hubspot","api_version":"v3"}'),

-- hubspot-sync: failed (056-059)
('00000000-0000-4000-a000-000000000056','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_2001","portal_id":"99001"}','failed',now()-interval'260h',now()-interval'259h59m',55000,'Connection timeout after 30000ms: upstream api.hubapi.com unreachable','{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000057','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_2002","portal_id":"99001"}','failed',now()-interval'190h',now()-interval'189h59m',38000,'HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached','{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000058','hubspot-sync','webhook','{"event":"contact.created","contact_id":"hs_2003","portal_id":"99001"}','failed',now()-interval'90h',now()-interval'89h59m',29000,'Validation error: contact_id hs_2003 not found in portal 99001','{"source":"hubspot","api_version":"v3"}'),
('00000000-0000-4000-a000-000000000059','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_2004","portal_id":"99001"}','failed',now()-interval'20h',now()-interval'19h59m',67000,'HTTP 503: HubSpot API temporarily unavailable. Maintenance window active','{"source":"hubspot","api_version":"v3"}'),

-- hubspot-sync: running (060)
('00000000-0000-4000-a000-000000000060','hubspot-sync','webhook','{"event":"contact.updated","contact_id":"hs_1021","portal_id":"99001"}','running',now()-interval'3m',NULL,NULL,NULL,'{"source":"hubspot","api_version":"v3"}')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- STEP STATES
-- 3 steps per run = 180 rows total
-- klaviyo steps: validate-payload (0), fetch-subscriber (1), process-unsubscribe (2)
-- hubspot steps: validate-payload (0), sync-contact (1), update-lists (2)
--
-- Step UUID pattern: 11111111-1111-4111-a111-{run_seq}{step_seq}
--   run_seq = 6-digit run number, step_seq = 2-digit step (00,01,02)
-- ============================================================

INSERT INTO step_states (id, run_id, step_name, status, input, output, attempt, error, started_at, completed_at, duration_ms, "order") VALUES

-- ---- klaviyo-unsubscribe completed runs (001-030): all 3 steps completed ----

-- run 001
('11111111-1111-4111-a111-000000010000','00000000-0000-4000-a000-000000000001','validate-payload','completed','{"email":"user1@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'329h59m',now()-interval'329h59m'+interval'310ms',310,0),
('11111111-1111-4111-a111-000000010001','00000000-0000-4000-a000-000000000001','fetch-subscriber','completed','{"email":"user1@example.com"}','{"subscriber_id":"sub_001","status":"subscribed"}',1,NULL,now()-interval'329h59m'+interval'310ms',now()-interval'329h59m'+interval'760ms',450,1),
('11111111-1111-4111-a111-000000010002','00000000-0000-4000-a000-000000000001','process-unsubscribe','completed','{"subscriber_id":"sub_001","list_id":"kl_001"}','{"unsubscribed":true,"timestamp":"2024-01-01T00:00:00Z"}',1,NULL,now()-interval'329h59m'+interval'760ms',now()-interval'329h58m',1120000,2),

-- run 002
('11111111-1111-4111-a111-000000020000','00000000-0000-4000-a000-000000000002','validate-payload','completed','{"email":"user2@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'324h59m',now()-interval'324h59m'+interval'280ms',280,0),
('11111111-1111-4111-a111-000000020001','00000000-0000-4000-a000-000000000002','fetch-subscriber','completed','{"email":"user2@example.com"}','{"subscriber_id":"sub_002","status":"subscribed"}',1,NULL,now()-interval'324h59m'+interval'280ms',now()-interval'324h59m'+interval'680ms',400,1),
('11111111-1111-4111-a111-000000020002','00000000-0000-4000-a000-000000000002','process-unsubscribe','completed','{"subscriber_id":"sub_002","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'324h59m'+interval'680ms',now()-interval'324h58m',980000,2),

-- run 003
('11111111-1111-4111-a111-000000030000','00000000-0000-4000-a000-000000000003','validate-payload','completed','{"email":"user3@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'319h59m',now()-interval'319h59m'+interval'350ms',350,0),
('11111111-1111-4111-a111-000000030001','00000000-0000-4000-a000-000000000003','fetch-subscriber','completed','{"email":"user3@example.com"}','{"subscriber_id":"sub_003","status":"subscribed"}',1,NULL,now()-interval'319h59m'+interval'350ms',now()-interval'319h59m'+interval'850ms',500,1),
('11111111-1111-4111-a111-000000030002','00000000-0000-4000-a000-000000000003','process-unsubscribe','completed','{"subscriber_id":"sub_003","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'319h59m'+interval'850ms',now()-interval'319h58m',1200000,2),

-- run 004
('11111111-1111-4111-a111-000000040000','00000000-0000-4000-a000-000000000004','validate-payload','completed','{"email":"user4@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'314h59m',now()-interval'314h59m'+interval'420ms',420,0),
('11111111-1111-4111-a111-000000040001','00000000-0000-4000-a000-000000000004','fetch-subscriber','completed','{"email":"user4@example.com"}','{"subscriber_id":"sub_004","status":"subscribed"}',1,NULL,now()-interval'314h59m'+interval'420ms',now()-interval'314h59m'+interval'870ms',450,1),
('11111111-1111-4111-a111-000000040002','00000000-0000-4000-a000-000000000004','process-unsubscribe','completed','{"subscriber_id":"sub_004","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'314h59m'+interval'870ms',now()-interval'314h57m',1100000,2),

-- run 005
('11111111-1111-4111-a111-000000050000','00000000-0000-4000-a000-000000000005','validate-payload','completed','{"email":"user5@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'309h59m',now()-interval'309h59m'+interval'210ms',210,0),
('11111111-1111-4111-a111-000000050001','00000000-0000-4000-a000-000000000005','fetch-subscriber','completed','{"email":"user5@example.com"}','{"subscriber_id":"sub_005","status":"subscribed"}',1,NULL,now()-interval'309h59m'+interval'210ms',now()-interval'309h59m'+interval'560ms',350,1),
('11111111-1111-4111-a111-000000050002','00000000-0000-4000-a000-000000000005','process-unsubscribe','completed','{"subscriber_id":"sub_005","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'309h59m'+interval'560ms',now()-interval'309h58m',880000,2),

-- run 006
('11111111-1111-4111-a111-000000060000','00000000-0000-4000-a000-000000000006','validate-payload','completed','{"email":"user6@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'304h59m',now()-interval'304h59m'+interval'380ms',380,0),
('11111111-1111-4111-a111-000000060001','00000000-0000-4000-a000-000000000006','fetch-subscriber','completed','{"email":"user6@example.com"}','{"subscriber_id":"sub_006","status":"subscribed"}',1,NULL,now()-interval'304h59m'+interval'380ms',now()-interval'304h59m'+interval'930ms',550,1),
('11111111-1111-4111-a111-000000060002','00000000-0000-4000-a000-000000000006','process-unsubscribe','completed','{"subscriber_id":"sub_006","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'304h59m'+interval'930ms',now()-interval'304h57m',1130000,2),

-- run 007
('11111111-1111-4111-a111-000000070000','00000000-0000-4000-a000-000000000007','validate-payload','completed','{"email":"user7@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'299h59m',now()-interval'299h59m'+interval'300ms',300,0),
('11111111-1111-4111-a111-000000070001','00000000-0000-4000-a000-000000000007','fetch-subscriber','completed','{"email":"user7@example.com"}','{"subscriber_id":"sub_007","status":"subscribed"}',1,NULL,now()-interval'299h59m'+interval'300ms',now()-interval'299h59m'+interval'730ms',430,1),
('11111111-1111-4111-a111-000000070002','00000000-0000-4000-a000-000000000007','process-unsubscribe','completed','{"subscriber_id":"sub_007","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'299h59m'+interval'730ms',now()-interval'299h58m',940000,2),

-- run 008
('11111111-1111-4111-a111-000000080000','00000000-0000-4000-a000-000000000008','validate-payload','completed','{"email":"user8@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'294h59m',now()-interval'294h59m'+interval'360ms',360,0),
('11111111-1111-4111-a111-000000080001','00000000-0000-4000-a000-000000000008','fetch-subscriber','completed','{"email":"user8@example.com"}','{"subscriber_id":"sub_008","status":"subscribed"}',1,NULL,now()-interval'294h59m'+interval'360ms',now()-interval'294h59m'+interval'860ms',500,1),
('11111111-1111-4111-a111-000000080002','00000000-0000-4000-a000-000000000008','process-unsubscribe','completed','{"subscriber_id":"sub_008","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'294h59m'+interval'860ms',now()-interval'294h57m',1030000,2),

-- run 009
('11111111-1111-4111-a111-000000090000','00000000-0000-4000-a000-000000000009','validate-payload','completed','{"email":"user9@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'289h59m',now()-interval'289h59m'+interval'190ms',190,0),
('11111111-1111-4111-a111-000000090001','00000000-0000-4000-a000-000000000009','fetch-subscriber','completed','{"email":"user9@example.com"}','{"subscriber_id":"sub_009","status":"subscribed"}',1,NULL,now()-interval'289h59m'+interval'190ms',now()-interval'289h59m'+interval'510ms',320,1),
('11111111-1111-4111-a111-000000090002','00000000-0000-4000-a000-000000000009','process-unsubscribe','completed','{"subscriber_id":"sub_009","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'289h59m'+interval'510ms',now()-interval'289h58m',820000,2),

-- run 010
('11111111-1111-4111-a111-000000100000','00000000-0000-4000-a000-000000000010','validate-payload','completed','{"email":"user10@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'284h59m',now()-interval'284h59m'+interval'440ms',440,0),
('11111111-1111-4111-a111-000000100001','00000000-0000-4000-a000-000000000010','fetch-subscriber','completed','{"email":"user10@example.com"}','{"subscriber_id":"sub_010","status":"subscribed"}',1,NULL,now()-interval'284h59m'+interval'440ms',now()-interval'284h59m'+interval'1010ms',570,1),
('11111111-1111-4111-a111-000000100002','00000000-0000-4000-a000-000000000010','process-unsubscribe','completed','{"subscriber_id":"sub_010","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'284h59m'+interval'1010ms',now()-interval'284h57m',1190000,2),

-- run 011
('11111111-1111-4111-a111-000000110000','00000000-0000-4000-a000-000000000011','validate-payload','completed','{"email":"user11@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'279h59m',now()-interval'279h59m'+interval'270ms',270,0),
('11111111-1111-4111-a111-000000110001','00000000-0000-4000-a000-000000000011','fetch-subscriber','completed','{"email":"user11@example.com"}','{"subscriber_id":"sub_011","status":"subscribed"}',1,NULL,now()-interval'279h59m'+interval'270ms',now()-interval'279h59m'+interval'660ms',390,1),
('11111111-1111-4111-a111-000000110002','00000000-0000-4000-a000-000000000011','process-unsubscribe','completed','{"subscriber_id":"sub_011","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'279h59m'+interval'660ms',now()-interval'279h58m',840000,2),

-- run 012
('11111111-1111-4111-a111-000000120000','00000000-0000-4000-a000-000000000012','validate-payload','completed','{"email":"user12@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'274h59m',now()-interval'274h59m'+interval'330ms',330,0),
('11111111-1111-4111-a111-000000120001','00000000-0000-4000-a000-000000000012','fetch-subscriber','completed','{"email":"user12@example.com"}','{"subscriber_id":"sub_012","status":"subscribed"}',1,NULL,now()-interval'274h59m'+interval'330ms',now()-interval'274h59m'+interval'790ms',460,1),
('11111111-1111-4111-a111-000000120002','00000000-0000-4000-a000-000000000012','process-unsubscribe','completed','{"subscriber_id":"sub_012","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'274h59m'+interval'790ms',now()-interval'274h57m',960000,2),

-- run 013
('11111111-1111-4111-a111-000000130000','00000000-0000-4000-a000-000000000013','validate-payload','completed','{"email":"user13@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'269h59m',now()-interval'269h59m'+interval'410ms',410,0),
('11111111-1111-4111-a111-000000130001','00000000-0000-4000-a000-000000000013','fetch-subscriber','completed','{"email":"user13@example.com"}','{"subscriber_id":"sub_013","status":"subscribed"}',1,NULL,now()-interval'269h59m'+interval'410ms',now()-interval'269h59m'+interval'990ms',580,1),
('11111111-1111-4111-a111-000000130002','00000000-0000-4000-a000-000000000013','process-unsubscribe','completed','{"subscriber_id":"sub_013","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'269h59m'+interval'990ms',now()-interval'269h58m',1190000,2),

-- run 014
('11111111-1111-4111-a111-000000140000','00000000-0000-4000-a000-000000000014','validate-payload','completed','{"email":"user14@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'264h59m',now()-interval'264h59m'+interval'290ms',290,0),
('11111111-1111-4111-a111-000000140001','00000000-0000-4000-a000-000000000014','fetch-subscriber','completed','{"email":"user14@example.com"}','{"subscriber_id":"sub_014","status":"subscribed"}',1,NULL,now()-interval'264h59m'+interval'290ms',now()-interval'264h59m'+interval'710ms',420,1),
('11111111-1111-4111-a111-000000140002','00000000-0000-4000-a000-000000000014','process-unsubscribe','completed','{"subscriber_id":"sub_014","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'264h59m'+interval'710ms',now()-interval'264h57m',1090000,2),

-- run 015
('11111111-1111-4111-a111-000000150000','00000000-0000-4000-a000-000000000015','validate-payload','completed','{"email":"user15@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'259h59m',now()-interval'259h59m'+interval'240ms',240,0),
('11111111-1111-4111-a111-000000150001','00000000-0000-4000-a000-000000000015','fetch-subscriber','completed','{"email":"user15@example.com"}','{"subscriber_id":"sub_015","status":"subscribed"}',1,NULL,now()-interval'259h59m'+interval'240ms',now()-interval'259h59m'+interval'620ms',380,1),
('11111111-1111-4111-a111-000000150002','00000000-0000-4000-a000-000000000015','process-unsubscribe','completed','{"subscriber_id":"sub_015","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'259h59m'+interval'620ms',now()-interval'259h58m',810000,2),

-- run 016
('11111111-1111-4111-a111-000000160000','00000000-0000-4000-a000-000000000016','validate-payload','completed','{"email":"user16@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'239h59m',now()-interval'239h59m'+interval'460ms',460,0),
('11111111-1111-4111-a111-000000160001','00000000-0000-4000-a000-000000000016','fetch-subscriber','completed','{"email":"user16@example.com"}','{"subscriber_id":"sub_016","status":"subscribed"}',1,NULL,now()-interval'239h59m'+interval'460ms',now()-interval'239h59m'+interval'1040ms',580,1),
('11111111-1111-4111-a111-000000160002','00000000-0000-4000-a000-000000000016','process-unsubscribe','completed','{"subscriber_id":"sub_016","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'239h59m'+interval'1040ms',now()-interval'239h57m',1160000,2),

-- run 017
('11111111-1111-4111-a111-000000170000','00000000-0000-4000-a000-000000000017','validate-payload','completed','{"email":"user17@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'219h59m',now()-interval'219h59m'+interval'310ms',310,0),
('11111111-1111-4111-a111-000000170001','00000000-0000-4000-a000-000000000017','fetch-subscriber','completed','{"email":"user17@example.com"}','{"subscriber_id":"sub_017","status":"subscribed"}',1,NULL,now()-interval'219h59m'+interval'310ms',now()-interval'219h59m'+interval'750ms',440,1),
('11111111-1111-4111-a111-000000170002','00000000-0000-4000-a000-000000000017','process-unsubscribe','completed','{"subscriber_id":"sub_017","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'219h59m'+interval'750ms',now()-interval'219h58m',1000000,2),

-- run 018
('11111111-1111-4111-a111-000000180000','00000000-0000-4000-a000-000000000018','validate-payload','completed','{"email":"user18@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'199h59m',now()-interval'199h59m'+interval'520ms',520,0),
('11111111-1111-4111-a111-000000180001','00000000-0000-4000-a000-000000000018','fetch-subscriber','completed','{"email":"user18@example.com"}','{"subscriber_id":"sub_018","status":"subscribed"}',1,NULL,now()-interval'199h59m'+interval'520ms',now()-interval'199h59m'+interval'1120ms',600,1),
('11111111-1111-4111-a111-000000180002','00000000-0000-4000-a000-000000000018','process-unsubscribe','completed','{"subscriber_id":"sub_018","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'199h59m'+interval'1120ms',now()-interval'199h57m',1200000,2),

-- run 019
('11111111-1111-4111-a111-000000190000','00000000-0000-4000-a000-000000000019','validate-payload','completed','{"email":"user19@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'179h59m',now()-interval'179h59m'+interval'200ms',200,0),
('11111111-1111-4111-a111-000000190001','00000000-0000-4000-a000-000000000019','fetch-subscriber','completed','{"email":"user19@example.com"}','{"subscriber_id":"sub_019","status":"subscribed"}',1,NULL,now()-interval'179h59m'+interval'200ms',now()-interval'179h59m'+interval'540ms',340,1),
('11111111-1111-4111-a111-000000190002','00000000-0000-4000-a000-000000000019','process-unsubscribe','completed','{"subscriber_id":"sub_019","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'179h59m'+interval'540ms',now()-interval'179h58m',780000,2),

-- run 020
('11111111-1111-4111-a111-000000200000','00000000-0000-4000-a000-000000000020','validate-payload','completed','{"email":"user20@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'159h59m',now()-interval'159h59m'+interval'390ms',390,0),
('11111111-1111-4111-a111-000000200001','00000000-0000-4000-a000-000000000020','fetch-subscriber','completed','{"email":"user20@example.com"}','{"subscriber_id":"sub_020","status":"subscribed"}',1,NULL,now()-interval'159h59m'+interval'390ms',now()-interval'159h59m'+interval'900ms',510,1),
('11111111-1111-4111-a111-000000200002','00000000-0000-4000-a000-000000000020','process-unsubscribe','completed','{"subscriber_id":"sub_020","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'159h59m'+interval'900ms',now()-interval'159h57m',1060000,2),

-- run 021
('11111111-1111-4111-a111-000000210000','00000000-0000-4000-a000-000000000021','validate-payload','completed','{"email":"user21@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'139h59m',now()-interval'139h59m'+interval'260ms',260,0),
('11111111-1111-4111-a111-000000210001','00000000-0000-4000-a000-000000000021','fetch-subscriber','completed','{"email":"user21@example.com"}','{"subscriber_id":"sub_021","status":"subscribed"}',1,NULL,now()-interval'139h59m'+interval'260ms',now()-interval'139h59m'+interval'670ms',410,1),
('11111111-1111-4111-a111-000000210002','00000000-0000-4000-a000-000000000021','process-unsubscribe','completed','{"subscriber_id":"sub_021","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'139h59m'+interval'670ms',now()-interval'139h58m',860000,2),

-- run 022
('11111111-1111-4111-a111-000000220000','00000000-0000-4000-a000-000000000022','validate-payload','completed','{"email":"user22@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'119h59m',now()-interval'119h59m'+interval'480ms',480,0),
('11111111-1111-4111-a111-000000220001','00000000-0000-4000-a000-000000000022','fetch-subscriber','completed','{"email":"user22@example.com"}','{"subscriber_id":"sub_022","status":"subscribed"}',1,NULL,now()-interval'119h59m'+interval'480ms',now()-interval'119h59m'+interval'1060ms',580,1),
('11111111-1111-4111-a111-000000220002','00000000-0000-4000-a000-000000000022','process-unsubscribe','completed','{"subscriber_id":"sub_022","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'119h59m'+interval'1060ms',now()-interval'119h57m',1080000,2),

-- run 023
('11111111-1111-4111-a111-000000230000','00000000-0000-4000-a000-000000000023','validate-payload','completed','{"email":"user23@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'99h59m',now()-interval'99h59m'+interval'220ms',220,0),
('11111111-1111-4111-a111-000000230001','00000000-0000-4000-a000-000000000023','fetch-subscriber','completed','{"email":"user23@example.com"}','{"subscriber_id":"sub_023","status":"subscribed"}',1,NULL,now()-interval'99h59m'+interval'220ms',now()-interval'99h59m'+interval'600ms',380,1),
('11111111-1111-4111-a111-000000230002','00000000-0000-4000-a000-000000000023','process-unsubscribe','completed','{"subscriber_id":"sub_023","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'99h59m'+interval'600ms',now()-interval'99h58m',900000,2),

-- run 024
('11111111-1111-4111-a111-000000240000','00000000-0000-4000-a000-000000000024','validate-payload','completed','{"email":"user24@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'79h59m',now()-interval'79h59m'+interval'500ms',500,0),
('11111111-1111-4111-a111-000000240001','00000000-0000-4000-a000-000000000024','fetch-subscriber','completed','{"email":"user24@example.com"}','{"subscriber_id":"sub_024","status":"subscribed"}',1,NULL,now()-interval'79h59m'+interval'500ms',now()-interval'79h59m'+interval'1100ms',600,1),
('11111111-1111-4111-a111-000000240002','00000000-0000-4000-a000-000000000024','process-unsubscribe','completed','{"subscriber_id":"sub_024","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'79h59m'+interval'1100ms',now()-interval'79h57m',1180000,2),

-- run 025
('11111111-1111-4111-a111-000000250000','00000000-0000-4000-a000-000000000025','validate-payload','completed','{"email":"user25@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'71h59m',now()-interval'71h59m'+interval'340ms',340,0),
('11111111-1111-4111-a111-000000250001','00000000-0000-4000-a000-000000000025','fetch-subscriber','completed','{"email":"user25@example.com"}','{"subscriber_id":"sub_025","status":"subscribed"}',1,NULL,now()-interval'71h59m'+interval'340ms',now()-interval'71h59m'+interval'820ms',480,1),
('11111111-1111-4111-a111-000000250002','00000000-0000-4000-a000-000000000025','process-unsubscribe','completed','{"subscriber_id":"sub_025","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'71h59m'+interval'820ms',now()-interval'71h58m',1050000,2),

-- run 026
('11111111-1111-4111-a111-000000260000','00000000-0000-4000-a000-000000000026','validate-payload','completed','{"email":"user26@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'59h59m',now()-interval'59h59m'+interval'250ms',250,0),
('11111111-1111-4111-a111-000000260001','00000000-0000-4000-a000-000000000026','fetch-subscriber','completed','{"email":"user26@example.com"}','{"subscriber_id":"sub_026","status":"subscribed"}',1,NULL,now()-interval'59h59m'+interval'250ms',now()-interval'59h59m'+interval'640ms',390,1),
('11111111-1111-4111-a111-000000260002','00000000-0000-4000-a000-000000000026','process-unsubscribe','completed','{"subscriber_id":"sub_026","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'59h59m'+interval'640ms',now()-interval'59h57m',930000,2),

-- run 027
('11111111-1111-4111-a111-000000270000','00000000-0000-4000-a000-000000000027','validate-payload','completed','{"email":"user27@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'47h59m',now()-interval'47h59m'+interval'430ms',430,0),
('11111111-1111-4111-a111-000000270001','00000000-0000-4000-a000-000000000027','fetch-subscriber','completed','{"email":"user27@example.com"}','{"subscriber_id":"sub_027","status":"subscribed"}',1,NULL,now()-interval'47h59m'+interval'430ms',now()-interval'47h59m'+interval'970ms',540,1),
('11111111-1111-4111-a111-000000270002','00000000-0000-4000-a000-000000000027','process-unsubscribe','completed','{"subscriber_id":"sub_027","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'47h59m'+interval'970ms',now()-interval'47h58m',1140000,2),

-- run 028
('11111111-1111-4111-a111-000000280000','00000000-0000-4000-a000-000000000028','validate-payload','completed','{"email":"user28@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'35h59m',now()-interval'35h59m'+interval'370ms',370,0),
('11111111-1111-4111-a111-000000280001','00000000-0000-4000-a000-000000000028','fetch-subscriber','completed','{"email":"user28@example.com"}','{"subscriber_id":"sub_028","status":"subscribed"}',1,NULL,now()-interval'35h59m'+interval'370ms',now()-interval'35h59m'+interval'880ms',510,1),
('11111111-1111-4111-a111-000000280002','00000000-0000-4000-a000-000000000028','process-unsubscribe','completed','{"subscriber_id":"sub_028","list_id":"kl_003"}','{"unsubscribed":true}',1,NULL,now()-interval'35h59m'+interval'880ms',now()-interval'35h57m',1090000,2),

-- run 029
('11111111-1111-4111-a111-000000290000','00000000-0000-4000-a000-000000000029','validate-payload','completed','{"email":"user29@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'23h59m',now()-interval'23h59m'+interval'280ms',280,0),
('11111111-1111-4111-a111-000000290001','00000000-0000-4000-a000-000000000029','fetch-subscriber','completed','{"email":"user29@example.com"}','{"subscriber_id":"sub_029","status":"subscribed"}',1,NULL,now()-interval'23h59m'+interval'280ms',now()-interval'23h59m'+interval'700ms',420,1),
('11111111-1111-4111-a111-000000290002','00000000-0000-4000-a000-000000000029','process-unsubscribe','completed','{"subscriber_id":"sub_029","list_id":"kl_002"}','{"unsubscribed":true}',1,NULL,now()-interval'23h59m'+interval'700ms',now()-interval'23h58m',1000000,2),

-- run 030
('11111111-1111-4111-a111-000000300000','00000000-0000-4000-a000-000000000030','validate-payload','completed','{"email":"user30@example.com","list_id":"kl_001"}','{"valid":true}',1,NULL,now()-interval'11h59m',now()-interval'11h59m'+interval'320ms',320,0),
('11111111-1111-4111-a111-000000300001','00000000-0000-4000-a000-000000000030','fetch-subscriber','completed','{"email":"user30@example.com"}','{"subscriber_id":"sub_030","status":"subscribed"}',1,NULL,now()-interval'11h59m'+interval'320ms',now()-interval'11h59m'+interval'780ms',460,1),
('11111111-1111-4111-a111-000000300002','00000000-0000-4000-a000-000000000030','process-unsubscribe','completed','{"subscriber_id":"sub_030","list_id":"kl_001"}','{"unsubscribed":true}',1,NULL,now()-interval'11h59m'+interval'780ms',now()-interval'11h57m',1010000,2),

-- ---- klaviyo-unsubscribe failed runs (031-033) ----
-- run 031: rate limit — validate OK, fetch OK, process-unsubscribe FAILED
('11111111-1111-4111-a111-000000310000','00000000-0000-4000-a000-000000000031','validate-payload','completed','{"email":"user31@example.com","list_id":"kl_002"}','{"valid":true}',1,NULL,now()-interval'249h59m',now()-interval'249h59m'+interval'300ms',300,0),
('11111111-1111-4111-a111-000000310001','00000000-0000-4000-a000-000000000031','fetch-subscriber','completed','{"email":"user31@example.com"}','{"subscriber_id":"sub_031","status":"subscribed"}',1,NULL,now()-interval'249h59m'+interval'300ms',now()-interval'249h59m'+interval'720ms',420,1),
('11111111-1111-4111-a111-000000310002','00000000-0000-4000-a000-000000000031','process-unsubscribe','failed','{"subscriber_id":"sub_031","list_id":"kl_002"}',NULL,3,'HTTP 429: Rate limit exceeded. Retry-After: 60s',now()-interval'249h59m'+interval'720ms',now()-interval'249h59m'+interval'61720ms',61000,2),

-- run 032: connection timeout — validate OK, fetch FAILED
('11111111-1111-4111-a111-000000320000','00000000-0000-4000-a000-000000000032','validate-payload','completed','{"email":"user32@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'149h59m',now()-interval'149h59m'+interval'260ms',260,0),
('11111111-1111-4111-a111-000000320001','00000000-0000-4000-a000-000000000032','fetch-subscriber','failed','{"email":"user32@example.com"}',NULL,2,'Connection timeout after 30000ms: upstream klaviyo-api.com unreachable',now()-interval'149h59m'+interval'260ms',now()-interval'149h59m'+interval'30260ms',30000,1),
('11111111-1111-4111-a111-000000320002','00000000-0000-4000-a000-000000000032','process-unsubscribe','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- run 033: validation error — validate FAILED immediately
('11111111-1111-4111-a111-000000330000','00000000-0000-4000-a000-000000000033','validate-payload','failed','{"email":"bad-email","list_id":"kl_001"}',NULL,1,'Validation error: email field is not a valid email address',now()-interval'49h59m',now()-interval'49h59m'+interval'120ms',120,0),
('11111111-1111-4111-a111-000000330001','00000000-0000-4000-a000-000000000033','fetch-subscriber','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,1),
('11111111-1111-4111-a111-000000330002','00000000-0000-4000-a000-000000000033','process-unsubscribe','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- ---- klaviyo-unsubscribe running (034) ----
('11111111-1111-4111-a111-000000340000','00000000-0000-4000-a000-000000000034','validate-payload','completed','{"email":"user34@example.com","list_id":"kl_003"}','{"valid":true}',1,NULL,now()-interval'2m',now()-interval'2m'+interval'310ms',310,0),
('11111111-1111-4111-a111-000000340001','00000000-0000-4000-a000-000000000034','fetch-subscriber','running','{"email":"user34@example.com"}',NULL,1,NULL,now()-interval'2m'+interval'310ms',NULL,NULL,1),
('11111111-1111-4111-a111-000000340002','00000000-0000-4000-a000-000000000034','process-unsubscribe','pending',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- ---- klaviyo-unsubscribe pending (035) ----
('11111111-1111-4111-a111-000000350000','00000000-0000-4000-a000-000000000035','validate-payload','pending',NULL,NULL,1,NULL,NULL,NULL,NULL,0),
('11111111-1111-4111-a111-000000350001','00000000-0000-4000-a000-000000000035','fetch-subscriber','pending',NULL,NULL,1,NULL,NULL,NULL,NULL,1),
('11111111-1111-4111-a111-000000350002','00000000-0000-4000-a000-000000000035','process-unsubscribe','pending',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- ---- hubspot-sync completed runs (036-055): all 3 steps completed ----

-- run 036
('11111111-1111-4111-a111-000000360000','00000000-0000-4000-a000-000000000036','validate-payload','completed','{"contact_id":"hs_1001","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'327h59m',now()-interval'327h59m'+interval'350ms',350,0),
('11111111-1111-4111-a111-000000360001','00000000-0000-4000-a000-000000000036','sync-contact','completed','{"contact_id":"hs_1001"}','{"synced":true,"crm_id":"crm_1001"}',1,NULL,now()-interval'327h59m'+interval'350ms',now()-interval'327h59m'+interval'950ms',600,1),
('11111111-1111-4111-a111-000000360002','00000000-0000-4000-a000-000000000036','update-lists','completed','{"crm_id":"crm_1001","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'327h59m'+interval'950ms',now()-interval'327h57m',1100000,2),

-- run 037
('11111111-1111-4111-a111-000000370000','00000000-0000-4000-a000-000000000037','validate-payload','completed','{"contact_id":"hs_1002","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'321h59m',now()-interval'321h59m'+interval'280ms',280,0),
('11111111-1111-4111-a111-000000370001','00000000-0000-4000-a000-000000000037','sync-contact','completed','{"contact_id":"hs_1002"}','{"synced":true,"crm_id":"crm_1002"}',1,NULL,now()-interval'321h59m'+interval'280ms',now()-interval'321h59m'+interval'810ms',530,1),
('11111111-1111-4111-a111-000000370002','00000000-0000-4000-a000-000000000037','update-lists','completed','{"crm_id":"crm_1002","lists":["mkt_b"]}','{"updated":true}',1,NULL,now()-interval'321h59m'+interval'810ms',now()-interval'321h58m',940000,2),

-- run 038
('11111111-1111-4111-a111-000000380000','00000000-0000-4000-a000-000000000038','validate-payload','completed','{"contact_id":"hs_1003","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'315h59m',now()-interval'315h59m'+interval'410ms',410,0),
('11111111-1111-4111-a111-000000380001','00000000-0000-4000-a000-000000000038','sync-contact','completed','{"contact_id":"hs_1003"}','{"synced":true,"crm_id":"crm_1003"}',1,NULL,now()-interval'315h59m'+interval'410ms',now()-interval'315h59m'+interval'1070ms',660,1),
('11111111-1111-4111-a111-000000380002','00000000-0000-4000-a000-000000000038','update-lists','completed','{"crm_id":"crm_1003","lists":["mkt_a","mkt_c"]}','{"updated":true}',1,NULL,now()-interval'315h59m'+interval'1070ms',now()-interval'315h57m',1150000,2),

-- run 039
('11111111-1111-4111-a111-000000390000','00000000-0000-4000-a000-000000000039','validate-payload','completed','{"contact_id":"hs_1004","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'309h59m',now()-interval'309h59m'+interval'220ms',220,0),
('11111111-1111-4111-a111-000000390001','00000000-0000-4000-a000-000000000039','sync-contact','completed','{"contact_id":"hs_1004"}','{"synced":true,"crm_id":"crm_1004"}',1,NULL,now()-interval'309h59m'+interval'220ms',now()-interval'309h59m'+interval'640ms',420,1),
('11111111-1111-4111-a111-000000390002','00000000-0000-4000-a000-000000000039','update-lists','completed','{"crm_id":"crm_1004","lists":["mkt_b"]}','{"updated":true}',1,NULL,now()-interval'309h59m'+interval'640ms',now()-interval'309h58m',860000,2),

-- run 040
('11111111-1111-4111-a111-000000400000','00000000-0000-4000-a000-000000000040','validate-payload','completed','{"contact_id":"hs_1005","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'303h59m',now()-interval'303h59m'+interval'490ms',490,0),
('11111111-1111-4111-a111-000000400001','00000000-0000-4000-a000-000000000040','sync-contact','completed','{"contact_id":"hs_1005"}','{"synced":true,"crm_id":"crm_1005"}',1,NULL,now()-interval'303h59m'+interval'490ms',now()-interval'303h59m'+interval'1160ms',670,1),
('11111111-1111-4111-a111-000000400002','00000000-0000-4000-a000-000000000040','update-lists','completed','{"crm_id":"crm_1005","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'303h59m'+interval'1160ms',now()-interval'303h57m',1200000,2),

-- run 041
('11111111-1111-4111-a111-000000410000','00000000-0000-4000-a000-000000000041','validate-payload','completed','{"contact_id":"hs_1006","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'297h59m',now()-interval'297h59m'+interval'330ms',330,0),
('11111111-1111-4111-a111-000000410001','00000000-0000-4000-a000-000000000041','sync-contact','completed','{"contact_id":"hs_1006"}','{"synced":true,"crm_id":"crm_1006"}',1,NULL,now()-interval'297h59m'+interval'330ms',now()-interval'297h59m'+interval'890ms',560,1),
('11111111-1111-4111-a111-000000410002','00000000-0000-4000-a000-000000000041','update-lists','completed','{"crm_id":"crm_1006","lists":["mkt_c"]}','{"updated":true}',1,NULL,now()-interval'297h59m'+interval'890ms',now()-interval'297h58m',990000,2),

-- run 042
('11111111-1111-4111-a111-000000420000','00000000-0000-4000-a000-000000000042','validate-payload','completed','{"contact_id":"hs_1007","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'291h59m',now()-interval'291h59m'+interval'240ms',240,0),
('11111111-1111-4111-a111-000000420001','00000000-0000-4000-a000-000000000042','sync-contact','completed','{"contact_id":"hs_1007"}','{"synced":true,"crm_id":"crm_1007"}',1,NULL,now()-interval'291h59m'+interval'240ms',now()-interval'291h59m'+interval'720ms',480,1),
('11111111-1111-4111-a111-000000420002','00000000-0000-4000-a000-000000000042','update-lists','completed','{"crm_id":"crm_1007","lists":["mkt_a","mkt_b"]}','{"updated":true}',1,NULL,now()-interval'291h59m'+interval'720ms',now()-interval'291h57m',860000,2),

-- run 043
('11111111-1111-4111-a111-000000430000','00000000-0000-4000-a000-000000000043','validate-payload','completed','{"contact_id":"hs_1008","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'285h59m',now()-interval'285h59m'+interval'460ms',460,0),
('11111111-1111-4111-a111-000000430001','00000000-0000-4000-a000-000000000043','sync-contact','completed','{"contact_id":"hs_1008"}','{"synced":true,"crm_id":"crm_1008"}',1,NULL,now()-interval'285h59m'+interval'460ms',now()-interval'285h59m'+interval'1100ms',640,1),
('11111111-1111-4111-a111-000000430002','00000000-0000-4000-a000-000000000043','update-lists','completed','{"crm_id":"crm_1008","lists":["mkt_b"]}','{"updated":true}',1,NULL,now()-interval'285h59m'+interval'1100ms',now()-interval'285h58m',1050000,2),

-- run 044
('11111111-1111-4111-a111-000000440000','00000000-0000-4000-a000-000000000044','validate-payload','completed','{"contact_id":"hs_1009","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'247h59m',now()-interval'247h59m'+interval'300ms',300,0),
('11111111-1111-4111-a111-000000440001','00000000-0000-4000-a000-000000000044','sync-contact','completed','{"contact_id":"hs_1009"}','{"synced":true,"crm_id":"crm_1009"}',1,NULL,now()-interval'247h59m'+interval'300ms',now()-interval'247h59m'+interval'820ms',520,1),
('11111111-1111-4111-a111-000000440002','00000000-0000-4000-a000-000000000044','update-lists','completed','{"crm_id":"crm_1009","lists":["mkt_c"]}','{"updated":true}',1,NULL,now()-interval'247h59m'+interval'820ms',now()-interval'247h57m',900000,2),

-- run 045
('11111111-1111-4111-a111-000000450000','00000000-0000-4000-a000-000000000045','validate-payload','completed','{"contact_id":"hs_1010","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'219h59m',now()-interval'219h59m'+interval'530ms',530,0),
('11111111-1111-4111-a111-000000450001','00000000-0000-4000-a000-000000000045','sync-contact','completed','{"contact_id":"hs_1010"}','{"synced":true,"crm_id":"crm_1010"}',1,NULL,now()-interval'219h59m'+interval'530ms',now()-interval'219h59m'+interval'1190ms',660,1),
('11111111-1111-4111-a111-000000450002','00000000-0000-4000-a000-000000000045','update-lists','completed','{"crm_id":"crm_1010","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'219h59m'+interval'1190ms',now()-interval'219h58m',1080000,2),

-- run 046
('11111111-1111-4111-a111-000000460000','00000000-0000-4000-a000-000000000046','validate-payload','completed','{"contact_id":"hs_1011","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'195h59m',now()-interval'195h59m'+interval'270ms',270,0),
('11111111-1111-4111-a111-000000460001','00000000-0000-4000-a000-000000000046','sync-contact','completed','{"contact_id":"hs_1011"}','{"synced":true,"crm_id":"crm_1011"}',1,NULL,now()-interval'195h59m'+interval'270ms',now()-interval'195h59m'+interval'750ms',480,1),
('11111111-1111-4111-a111-000000460002','00000000-0000-4000-a000-000000000046','update-lists','completed','{"crm_id":"crm_1011","lists":["mkt_b","mkt_c"]}','{"updated":true}',1,NULL,now()-interval'195h59m'+interval'750ms',now()-interval'195h57m',1000000,2),

-- run 047
('11111111-1111-4111-a111-000000470000','00000000-0000-4000-a000-000000000047','validate-payload','completed','{"contact_id":"hs_1012","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'171h59m',now()-interval'171h59m'+interval'200ms',200,0),
('11111111-1111-4111-a111-000000470001','00000000-0000-4000-a000-000000000047','sync-contact','completed','{"contact_id":"hs_1012"}','{"synced":true,"crm_id":"crm_1012"}',1,NULL,now()-interval'171h59m'+interval'200ms',now()-interval'171h59m'+interval'600ms',400,1),
('11111111-1111-4111-a111-000000470002','00000000-0000-4000-a000-000000000047','update-lists','completed','{"crm_id":"crm_1012","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'171h59m'+interval'600ms',now()-interval'171h58m',780000,2),

-- run 048
('11111111-1111-4111-a111-000000480000','00000000-0000-4000-a000-000000000048','validate-payload','completed','{"contact_id":"hs_1013","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'147h59m',now()-interval'147h59m'+interval'440ms',440,0),
('11111111-1111-4111-a111-000000480001','00000000-0000-4000-a000-000000000048','sync-contact','completed','{"contact_id":"hs_1013"}','{"synced":true,"crm_id":"crm_1013"}',1,NULL,now()-interval'147h59m'+interval'440ms',now()-interval'147h59m'+interval'1060ms',620,1),
('11111111-1111-4111-a111-000000480002','00000000-0000-4000-a000-000000000048','update-lists','completed','{"crm_id":"crm_1013","lists":["mkt_c"]}','{"updated":true}',1,NULL,now()-interval'147h59m'+interval'1060ms',now()-interval'147h57m',1180000,2),

-- run 049
('11111111-1111-4111-a111-000000490000','00000000-0000-4000-a000-000000000049','validate-payload','completed','{"contact_id":"hs_1014","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'123h59m',now()-interval'123h59m'+interval'310ms',310,0),
('11111111-1111-4111-a111-000000490001','00000000-0000-4000-a000-000000000049','sync-contact','completed','{"contact_id":"hs_1014"}','{"synced":true,"crm_id":"crm_1014"}',1,NULL,now()-interval'123h59m'+interval'310ms',now()-interval'123h59m'+interval'870ms',560,1),
('11111111-1111-4111-a111-000000490002','00000000-0000-4000-a000-000000000049','update-lists','completed','{"crm_id":"crm_1014","lists":["mkt_b"]}','{"updated":true}',1,NULL,now()-interval'123h59m'+interval'870ms',now()-interval'123h58m',1060000,2),

-- run 050
('11111111-1111-4111-a111-000000500000','00000000-0000-4000-a000-000000000050','validate-payload','completed','{"contact_id":"hs_1015","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'99h59m',now()-interval'99h59m'+interval'230ms',230,0),
('11111111-1111-4111-a111-000000500001','00000000-0000-4000-a000-000000000050','sync-contact','completed','{"contact_id":"hs_1015"}','{"synced":true,"crm_id":"crm_1015"}',1,NULL,now()-interval'99h59m'+interval'230ms',now()-interval'99h59m'+interval'680ms',450,1),
('11111111-1111-4111-a111-000000500002','00000000-0000-4000-a000-000000000050','update-lists','completed','{"crm_id":"crm_1015","lists":["mkt_a","mkt_b"]}','{"updated":true}',1,NULL,now()-interval'99h59m'+interval'680ms',now()-interval'99h57m',870000,2),

-- run 051
('11111111-1111-4111-a111-000000510000','00000000-0000-4000-a000-000000000051','validate-payload','completed','{"contact_id":"hs_1016","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'83h59m',now()-interval'83h59m'+interval'380ms',380,0),
('11111111-1111-4111-a111-000000510001','00000000-0000-4000-a000-000000000051','sync-contact','completed','{"contact_id":"hs_1016"}','{"synced":true,"crm_id":"crm_1016"}',1,NULL,now()-interval'83h59m'+interval'380ms',now()-interval'83h59m'+interval'980ms',600,1),
('11111111-1111-4111-a111-000000510002','00000000-0000-4000-a000-000000000051','update-lists','completed','{"crm_id":"crm_1016","lists":["mkt_c"]}','{"updated":true}',1,NULL,now()-interval'83h59m'+interval'980ms',now()-interval'83h58m',1040000,2),

-- run 052
('11111111-1111-4111-a111-000000520000','00000000-0000-4000-a000-000000000052','validate-payload','completed','{"contact_id":"hs_1017","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'67h59m',now()-interval'67h59m'+interval'290ms',290,0),
('11111111-1111-4111-a111-000000520001','00000000-0000-4000-a000-000000000052','sync-contact','completed','{"contact_id":"hs_1017"}','{"synced":true,"crm_id":"crm_1017"}',1,NULL,now()-interval'67h59m'+interval'290ms',now()-interval'67h59m'+interval'790ms',500,1),
('11111111-1111-4111-a111-000000520002','00000000-0000-4000-a000-000000000052','update-lists','completed','{"crm_id":"crm_1017","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'67h59m'+interval'790ms',now()-interval'67h57m',920000,2),

-- run 053
('11111111-1111-4111-a111-000000530000','00000000-0000-4000-a000-000000000053','validate-payload','completed','{"contact_id":"hs_1018","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'51h59m',now()-interval'51h59m'+interval'470ms',470,0),
('11111111-1111-4111-a111-000000530001','00000000-0000-4000-a000-000000000053','sync-contact','completed','{"contact_id":"hs_1018"}','{"synced":true,"crm_id":"crm_1018"}',1,NULL,now()-interval'51h59m'+interval'470ms',now()-interval'51h59m'+interval'1140ms',670,1),
('11111111-1111-4111-a111-000000530002','00000000-0000-4000-a000-000000000053','update-lists','completed','{"crm_id":"crm_1018","lists":["mkt_b","mkt_c"]}','{"updated":true}',1,NULL,now()-interval'51h59m'+interval'1140ms',now()-interval'51h58m',1080000,2),

-- run 054
('11111111-1111-4111-a111-000000540000','00000000-0000-4000-a000-000000000054','validate-payload','completed','{"contact_id":"hs_1019","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'31h59m',now()-interval'31h59m'+interval'210ms',210,0),
('11111111-1111-4111-a111-000000540001','00000000-0000-4000-a000-000000000054','sync-contact','completed','{"contact_id":"hs_1019"}','{"synced":true,"crm_id":"crm_1019"}',1,NULL,now()-interval'31h59m'+interval'210ms',now()-interval'31h59m'+interval'590ms',380,1),
('11111111-1111-4111-a111-000000540002','00000000-0000-4000-a000-000000000054','update-lists','completed','{"crm_id":"crm_1019","lists":["mkt_a"]}','{"updated":true}',1,NULL,now()-interval'31h59m'+interval'590ms',now()-interval'31h57m',830000,2),

-- run 055
('11111111-1111-4111-a111-000000550000','00000000-0000-4000-a000-000000000055','validate-payload','completed','{"contact_id":"hs_1020","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'7h59m',now()-interval'7h59m'+interval'360ms',360,0),
('11111111-1111-4111-a111-000000550001','00000000-0000-4000-a000-000000000055','sync-contact','completed','{"contact_id":"hs_1020"}','{"synced":true,"crm_id":"crm_1020"}',1,NULL,now()-interval'7h59m'+interval'360ms',now()-interval'7h59m'+interval'920ms',560,1),
('11111111-1111-4111-a111-000000550002','00000000-0000-4000-a000-000000000055','update-lists','completed','{"crm_id":"crm_1020","lists":["mkt_b"]}','{"updated":true}',1,NULL,now()-interval'7h59m'+interval'920ms',now()-interval'7h58m',1010000,2),

-- ---- hubspot-sync failed runs (056-059) ----
-- run 056: connection timeout — validate OK, sync-contact FAILED
('11111111-1111-4111-a111-000000560000','00000000-0000-4000-a000-000000000056','validate-payload','completed','{"contact_id":"hs_2001","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'259h59m',now()-interval'259h59m'+interval'290ms',290,0),
('11111111-1111-4111-a111-000000560001','00000000-0000-4000-a000-000000000056','sync-contact','failed','{"contact_id":"hs_2001"}',NULL,2,'Connection timeout after 30000ms: upstream api.hubapi.com unreachable',now()-interval'259h59m'+interval'290ms',now()-interval'259h59m'+interval'30290ms',30000,1),
('11111111-1111-4111-a111-000000560002','00000000-0000-4000-a000-000000000056','update-lists','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- run 057: rate limit — validate OK, sync-contact OK, update-lists FAILED
('11111111-1111-4111-a111-000000570000','00000000-0000-4000-a000-000000000057','validate-payload','completed','{"contact_id":"hs_2002","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'189h59m',now()-interval'189h59m'+interval'310ms',310,0),
('11111111-1111-4111-a111-000000570001','00000000-0000-4000-a000-000000000057','sync-contact','completed','{"contact_id":"hs_2002"}','{"synced":true,"crm_id":"crm_2002"}',1,NULL,now()-interval'189h59m'+interval'310ms',now()-interval'189h59m'+interval'790ms',480,1),
('11111111-1111-4111-a111-000000570002','00000000-0000-4000-a000-000000000057','update-lists','failed','{"crm_id":"crm_2002","lists":["mkt_a"]}',NULL,3,'HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached',now()-interval'189h59m'+interval'790ms',now()-interval'189h59m'+interval'38790ms',38000,2),

-- run 058: validation error — validate FAILED
('11111111-1111-4111-a111-000000580000','00000000-0000-4000-a000-000000000058','validate-payload','failed','{"contact_id":"hs_2003","portal_id":"99001"}',NULL,1,'Validation error: contact_id hs_2003 not found in portal 99001',now()-interval'89h59m',now()-interval'89h59m'+interval'140ms',140,0),
('11111111-1111-4111-a111-000000580001','00000000-0000-4000-a000-000000000058','sync-contact','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,1),
('11111111-1111-4111-a111-000000580002','00000000-0000-4000-a000-000000000058','update-lists','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- run 059: 503 service unavailable — validate OK, sync-contact FAILED
('11111111-1111-4111-a111-000000590000','00000000-0000-4000-a000-000000000059','validate-payload','completed','{"contact_id":"hs_2004","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'19h59m',now()-interval'19h59m'+interval'330ms',330,0),
('11111111-1111-4111-a111-000000590001','00000000-0000-4000-a000-000000000059','sync-contact','failed','{"contact_id":"hs_2004"}',NULL,2,'HTTP 503: HubSpot API temporarily unavailable. Maintenance window active',now()-interval'19h59m'+interval'330ms',now()-interval'19h59m'+interval'67330ms',67000,1),
('11111111-1111-4111-a111-000000590002','00000000-0000-4000-a000-000000000059','update-lists','skipped',NULL,NULL,1,NULL,NULL,NULL,NULL,2),

-- ---- hubspot-sync running (060) ----
('11111111-1111-4111-a111-000000600000','00000000-0000-4000-a000-000000000060','validate-payload','completed','{"contact_id":"hs_1021","portal_id":"99001"}','{"valid":true}',1,NULL,now()-interval'3m',now()-interval'3m'+interval'340ms',340,0),
('11111111-1111-4111-a111-000000600001','00000000-0000-4000-a000-000000000060','sync-contact','running','{"contact_id":"hs_1021"}',NULL,1,NULL,now()-interval'3m'+interval'340ms',NULL,NULL,1),
('11111111-1111-4111-a111-000000600002','00000000-0000-4000-a000-000000000060','update-lists','pending',NULL,NULL,1,NULL,NULL,NULL,NULL,2)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- DEAD LETTER QUEUE
-- 25 entries: 20 unresolved, 5 resolved
-- Mix of both workflows, spread over last 30 days
-- Some entries are older than 7 days (critical for DLQ-issues-visibility fix)
-- ============================================================

INSERT INTO dead_letter_queue (id, run_id, workflow_name, step_name, input, error, attempts, created_at, resolved_at, resolved_by) VALUES

-- Unresolved entries (20) — resolved_at IS NULL
-- klaviyo-unsubscribe entries (12 unresolved)
('22222222-2222-4222-a222-000000000001','00000000-0000-4000-a000-000000000031','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_031","list_id":"kl_002"}','HTTP 429: Rate limit exceeded. Retry-After: 60s',3,now()-interval'250h',NULL,NULL),
('22222222-2222-4222-a222-000000000002','00000000-0000-4000-a000-000000000032','klaviyo-unsubscribe','fetch-subscriber','{"email":"user32@example.com"}','Connection timeout after 30000ms: upstream klaviyo-api.com unreachable',2,now()-interval'150h',NULL,NULL),
('22222222-2222-4222-a222-000000000003','00000000-0000-4000-a000-000000000033','klaviyo-unsubscribe','validate-payload','{"email":"bad-email","list_id":"kl_001"}','Validation error: email field is not a valid email address',1,now()-interval'50h',NULL,NULL),
('22222222-2222-4222-a222-000000000004','00000000-0000-4000-a000-000000000005','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_005x","list_id":"kl_003"}','HTTP 429: Rate limit exceeded. Retry-After: 60s',4,now()-interval'400h',NULL,NULL),
('22222222-2222-4222-a222-000000000005','00000000-0000-4000-a000-000000000009','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_009x","list_id":"kl_001"}','HTTP 429: Rate limit exceeded. Retry-After: 120s',5,now()-interval'380h',NULL,NULL),
('22222222-2222-4222-a222-000000000006','00000000-0000-4000-a000-000000000013','klaviyo-unsubscribe','fetch-subscriber','{"email":"user13x@example.com"}','Connection timeout after 30000ms: upstream klaviyo-api.com unreachable',2,now()-interval'350h',NULL,NULL),
('22222222-2222-4222-a222-000000000007','00000000-0000-4000-a000-000000000017','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_017x","list_id":"kl_002"}','HTTP 429: Rate limit exceeded. Retry-After: 60s',3,now()-interval'300h',NULL,NULL),
('22222222-2222-4222-a222-000000000008','00000000-0000-4000-a000-000000000020','klaviyo-unsubscribe','fetch-subscriber','{"email":"user20x@example.com"}','Connection timeout after 30000ms: upstream klaviyo-api.com unreachable',1,now()-interval'200h',NULL,NULL),
('22222222-2222-4222-a222-000000000009','00000000-0000-4000-a000-000000000023','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_023x","list_id":"kl_002"}','HTTP 429: Rate limit exceeded. Retry-After: 60s',2,now()-interval'120h',NULL,NULL),
('22222222-2222-4222-a222-000000000010','00000000-0000-4000-a000-000000000026','klaviyo-unsubscribe','validate-payload','{"email":"bad-email-26","list_id":"kl_002"}','Validation error: email field is not a valid email address',1,now()-interval'80h',NULL,NULL),
('22222222-2222-4222-a222-000000000011','00000000-0000-4000-a000-000000000028','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_028x","list_id":"kl_003"}','HTTP 429: Rate limit exceeded. Retry-After: 120s',4,now()-interval'40h',NULL,NULL),
('22222222-2222-4222-a222-000000000012','00000000-0000-4000-a000-000000000030','klaviyo-unsubscribe','fetch-subscriber','{"email":"user30x@example.com"}','Connection timeout after 30000ms: upstream klaviyo-api.com unreachable',2,now()-interval'15h',NULL,NULL),

-- hubspot-sync entries (8 unresolved)
('22222222-2222-4222-a222-000000000013','00000000-0000-4000-a000-000000000056','hubspot-sync','sync-contact','{"contact_id":"hs_2001"}','Connection timeout after 30000ms: upstream api.hubapi.com unreachable',2,now()-interval'260h',NULL,NULL),
('22222222-2222-4222-a222-000000000014','00000000-0000-4000-a000-000000000057','hubspot-sync','update-lists','{"crm_id":"crm_2002","lists":["mkt_a"]}','HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached',3,now()-interval'190h',NULL,NULL),
('22222222-2222-4222-a222-000000000015','00000000-0000-4000-a000-000000000058','hubspot-sync','validate-payload','{"contact_id":"hs_2003","portal_id":"99001"}','Validation error: contact_id hs_2003 not found in portal 99001',1,now()-interval'90h',NULL,NULL),
('22222222-2222-4222-a222-000000000016','00000000-0000-4000-a000-000000000059','hubspot-sync','sync-contact','{"contact_id":"hs_2004"}','HTTP 503: HubSpot API temporarily unavailable. Maintenance window active',2,now()-interval'20h',NULL,NULL),
('22222222-2222-4222-a222-000000000017','00000000-0000-4000-a000-000000000039','hubspot-sync','sync-contact','{"contact_id":"hs_1004x"}','Connection timeout after 30000ms: upstream api.hubapi.com unreachable',3,now()-interval'420h',NULL,NULL),
('22222222-2222-4222-a222-000000000018','00000000-0000-4000-a000-000000000042','hubspot-sync','update-lists','{"crm_id":"crm_1007x","lists":["mkt_a"]}','HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached',2,now()-interval'360h',NULL,NULL),
('22222222-2222-4222-a222-000000000019','00000000-0000-4000-a000-000000000046','hubspot-sync','sync-contact','{"contact_id":"hs_1011x"}','HTTP 503: HubSpot API temporarily unavailable. Maintenance window active',1,now()-interval'220h',NULL,NULL),
('22222222-2222-4222-a222-000000000020','00000000-0000-4000-a000-000000000051','hubspot-sync','update-lists','{"crm_id":"crm_1016x","lists":["mkt_c"]}','HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached',4,now()-interval'100h',NULL,NULL),

-- Resolved entries (5) — resolved_at IS NOT NULL, resolved_by = 'manual'
('22222222-2222-4222-a222-000000000021','00000000-0000-4000-a000-000000000003','klaviyo-unsubscribe','fetch-subscriber','{"email":"user3x@example.com"}','Validation error: email field is not a valid email address',1,now()-interval'600h',now()-interval'550h','manual'),
('22222222-2222-4222-a222-000000000022','00000000-0000-4000-a000-000000000007','klaviyo-unsubscribe','process-unsubscribe','{"subscriber_id":"sub_007x","list_id":"kl_001"}','HTTP 429: Rate limit exceeded. Retry-After: 60s',2,now()-interval'520h',now()-interval'480h','manual'),
('22222222-2222-4222-a222-000000000023','00000000-0000-4000-a000-000000000036','hubspot-sync','sync-contact','{"contact_id":"hs_1001x"}','Connection timeout after 30000ms: upstream api.hubapi.com unreachable',3,now()-interval'650h',now()-interval'600h','manual'),
('22222222-2222-4222-a222-000000000024','00000000-0000-4000-a000-000000000040','hubspot-sync','update-lists','{"crm_id":"crm_1005x","lists":["mkt_a"]}','HTTP 429: Rate limit exceeded. Daily limit of 250000 API calls reached',5,now()-interval'480h',now()-interval'420h','manual'),
('22222222-2222-4222-a222-000000000025','00000000-0000-4000-a000-000000000044','hubspot-sync','sync-contact','{"contact_id":"hs_1009x"}','HTTP 503: HubSpot API temporarily unavailable. Maintenance window active',2,now()-interval'400h',now()-interval'360h','manual')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SUPAFLOW ISSUES
-- 3 entries: 1 unresolved, 1 ignored, 1 resolved
-- ============================================================

INSERT INTO supaflow_issues (id, workflow_name, step_name, error_pattern, status, created_at, updated_at) VALUES

('33333333-3333-4333-a333-000000000001','klaviyo-unsubscribe','process-unsubscribe','HTTP 429: Rate limit exceeded','unresolved',now()-interval'400h',now()-interval'15h'),
('33333333-3333-4333-a333-000000000002','hubspot-sync','sync-contact','Connection timeout after 30000ms','ignored',now()-interval'420h',now()-interval'380h'),
('33333333-3333-4333-a333-000000000003','klaviyo-unsubscribe','fetch-subscriber','Validation error: email field is not a valid email address','resolved',now()-interval'600h',now()-interval'480h')

ON CONFLICT (id) DO NOTHING;
