-- CEP (Brazilian postal code). Kept generically as address_zip so it fits
-- other countries later. Important for geolocation of the tenant's address.
alter table public.companies add column address_zip text;
