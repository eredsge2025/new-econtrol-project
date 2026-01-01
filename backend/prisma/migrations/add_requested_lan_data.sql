-- Add requested_lan_data field to users table for temporary storage
-- This field stores LAN center details during registration (PENDING status)
-- and is cleared after approval when the LAN center is created

ALTER TABLE users 
ADD COLUMN requested_lan_data jsonb;

COMMENT ON COLUMN users.requested_lan_data IS 
'Temporary storage for LAN center details (name, address, city, country) during registration. Cleared after approval and LAN creation.';
