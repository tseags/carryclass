-- Align CCW Permit Instruction initial price across county rows.
-- LA source row still had $250 while Orange (profile winner) had $295.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '295',
  updated_at = now()
WHERE id = 'd2b84f61-8c80-425e-b893-8e338c08e4bc'
  AND (price_16hr_full IS DISTINCT FROM '295');
