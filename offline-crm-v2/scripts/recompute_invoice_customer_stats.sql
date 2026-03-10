BEGIN TRANSACTION;

UPDATE nc__w6f___tbl_Customers AS c
SET
  total_order_count =
    COALESCE((
      SELECT COUNT(*)
      FROM nc__w6f___tbl_tx_history AS tx
      WHERE tx.tx_type = '출고'
        AND (
          (c.legacy_id IS NOT NULL AND CAST(c.legacy_id AS TEXT) = tx.legacy_book_id)
          OR ((c.legacy_id IS NULL OR trim(CAST(c.legacy_id AS TEXT)) = '') AND tx.customer_name = c.name)
        )
    ), 0)
    + COALESCE((
      SELECT COUNT(*)
      FROM nc__w6f___tbl_Invoices AS inv
      WHERE inv.customer_id = c.id
         OR (inv.customer_id IS NULL AND inv.customer_name = c.name)
    ), 0),
  total_order_amount =
    COALESCE((
      SELECT SUM(tx.amount)
      FROM nc__w6f___tbl_tx_history AS tx
      WHERE tx.tx_type = '출고'
        AND (
          (c.legacy_id IS NOT NULL AND CAST(c.legacy_id AS TEXT) = tx.legacy_book_id)
          OR ((c.legacy_id IS NULL OR trim(CAST(c.legacy_id AS TEXT)) = '') AND tx.customer_name = c.name)
        )
    ), 0)
    + COALESCE((
      SELECT SUM(inv.total_amount)
      FROM nc__w6f___tbl_Invoices AS inv
      WHERE inv.customer_id = c.id
         OR (inv.customer_id IS NULL AND inv.customer_name = c.name)
    ), 0),
  first_order_date = (
    SELECT MIN(order_date)
    FROM (
      SELECT MIN(tx.tx_date) AS order_date
      FROM nc__w6f___tbl_tx_history AS tx
      WHERE tx.tx_type = '출고'
        AND (
          (c.legacy_id IS NOT NULL AND CAST(c.legacy_id AS TEXT) = tx.legacy_book_id)
          OR ((c.legacy_id IS NULL OR trim(CAST(c.legacy_id AS TEXT)) = '') AND tx.customer_name = c.name)
        )
      UNION ALL
      SELECT MIN(inv.invoice_date) AS order_date
      FROM nc__w6f___tbl_Invoices AS inv
      WHERE inv.customer_id = c.id
         OR (inv.customer_id IS NULL AND inv.customer_name = c.name)
    )
    WHERE order_date IS NOT NULL
  ),
  last_order_date = (
    SELECT MAX(order_date)
    FROM (
      SELECT MAX(tx.tx_date) AS order_date
      FROM nc__w6f___tbl_tx_history AS tx
      WHERE tx.tx_type = '출고'
        AND (
          (c.legacy_id IS NOT NULL AND CAST(c.legacy_id AS TEXT) = tx.legacy_book_id)
          OR ((c.legacy_id IS NULL OR trim(CAST(c.legacy_id AS TEXT)) = '') AND tx.customer_name = c.name)
        )
      UNION ALL
      SELECT MAX(inv.invoice_date) AS order_date
      FROM nc__w6f___tbl_Invoices AS inv
      WHERE inv.customer_id = c.id
         OR (inv.customer_id IS NULL AND inv.customer_name = c.name)
    )
    WHERE order_date IS NOT NULL
  )
WHERE c.id IN (
  SELECT DISTINCT customer_id
  FROM nc__w6f___tbl_Invoices
  WHERE customer_id IS NOT NULL
);

COMMIT;
