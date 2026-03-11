-- 004_auth_roles.sql
-- Dodaje role korisnicima i tablica za praćenje sesija

CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'client');

ALTER TABLE users
    ADD COLUMN role user_role NOT NULL DEFAULT 'client';

-- Pregled: admin vidi sve, moderator može moderirati, client = charter kompanija
COMMENT ON COLUMN users.role IS 'admin = pun pristup, moderator = upravljanje korisnicima, client = charter kompanija';
COMMENT ON COLUMN users.company_name IS 'Naziv charter kompanije (za klijente)';
