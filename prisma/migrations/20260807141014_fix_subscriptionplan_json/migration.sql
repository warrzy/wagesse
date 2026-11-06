UPDATE `SubscriptionPlan`
SET `benefits` = JSON_ARRAY()
WHERE `benefits` IS NULL OR JSON_VALID(`benefits`) = 0;

UPDATE `SubscriptionPlan`
SET `features` = JSON_ARRAY()
WHERE `features` IS NULL OR JSON_VALID(`features`) = 0;