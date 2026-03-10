BEGIN TRANSACTION;

UPDATE nc__w6f___tbl_tx_history
SET customer_name = (
  SELECT c.name
  FROM nc__w6f___tbl_Customers AS c
  WHERE CAST(c.legacy_id AS TEXT) = nc__w6f___tbl_tx_history.legacy_book_id
    AND ifnull(trim(c.name), '') <> ''
  ORDER BY c.id DESC
  LIMIT 1
)
WHERE ifnull(trim(customer_name), '') = ''
  AND EXISTS (
    SELECT 1
    FROM nc__w6f___tbl_Customers AS c
    WHERE CAST(c.legacy_id AS TEXT) = nc__w6f___tbl_tx_history.legacy_book_id
      AND ifnull(trim(c.name), '') <> ''
  );

COMMIT;
