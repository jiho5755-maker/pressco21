BEGIN TRANSACTION;

WITH latest AS (
  SELECT
    row_id,
    created_at,
    details,
    row_number() OVER (PARTITION BY row_id ORDER BY created_at DESC, id DESC) AS rn
  FROM nc_audit_v2
  WHERE fk_model_id = 'ml81i9mcuw0pjzk'
    AND op_type = 'DATA_DELETE'
)
INSERT INTO nc__w6f___tbl_Invoices (
  id,
  created_at,
  updated_at,
  nc_order,
  invoice_no,
  customer_id,
  customer_name,
  invoice_date,
  supply_amount,
  tax_amount,
  total_amount,
  memo,
  status,
  pdf_url,
  paid_amount,
  previous_balance,
  current_balance,
  payment_status
)
SELECT
  CAST(row_id AS INTEGER),
  created_at,
  created_at,
  CAST(json_extract(details, '$.data.nc_order') AS REAL),
  json_extract(details, '$.data.invoice_no'),
  CAST(json_extract(details, '$.data.customer_id') AS INTEGER),
  json_extract(details, '$.data.customer_name'),
  json_extract(details, '$.data.invoice_date'),
  COALESCE(CAST(json_extract(details, '$.data.supply_amount') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.tax_amount') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.total_amount') AS REAL), 0),
  json_extract(details, '$.data.memo'),
  json_extract(details, '$.data.status'),
  json_extract(details, '$.data.pdf_url'),
  COALESCE(CAST(json_extract(details, '$.data.paid_amount') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.previous_balance') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.current_balance') AS REAL), 0),
  json_extract(details, '$.data.payment_status')
FROM latest
WHERE rn = 1;

WITH latest AS (
  SELECT
    row_id,
    created_at,
    details,
    row_number() OVER (PARTITION BY row_id ORDER BY created_at DESC, id DESC) AS rn
  FROM nc_audit_v2
  WHERE fk_model_id = 'mxwgdlj56p9joxo'
    AND op_type = 'DATA_DELETE'
)
INSERT INTO nc__w6f___tbl_InvoiceItems (
  id,
  created_at,
  updated_at,
  invoice_id,
  product_code,
  product_name,
  unit,
  quantity,
  unit_price,
  supply_amount,
  tax_amount,
  total_amount
)
SELECT
  CAST(row_id AS INTEGER),
  created_at,
  created_at,
  CAST(json_extract(details, '$.data.invoice_id') AS INTEGER),
  json_extract(details, '$.data.product_code'),
  json_extract(details, '$.data.product_name'),
  json_extract(details, '$.data.unit'),
  COALESCE(CAST(json_extract(details, '$.data.quantity') AS INTEGER), 0),
  COALESCE(CAST(json_extract(details, '$.data.unit_price') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.supply_amount') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.tax_amount') AS REAL), 0),
  COALESCE(CAST(json_extract(details, '$.data.total_amount') AS REAL), 0)
FROM latest
WHERE rn = 1;

COMMIT;
