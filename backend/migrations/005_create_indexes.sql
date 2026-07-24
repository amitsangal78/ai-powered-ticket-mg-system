CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));

CREATE INDEX idx_tickets_created_by ON tickets (created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets (assigned_to);
CREATE INDEX idx_tickets_status ON tickets (status);

CREATE INDEX idx_comments_ticket_id ON comments (ticket_id);
CREATE INDEX idx_comments_created_by ON comments (created_by);

CREATE INDEX idx_tickets_title_trgm ON tickets USING gin (title gin_trgm_ops);
CREATE INDEX idx_tickets_description_trgm ON tickets USING gin (description gin_trgm_ops);
