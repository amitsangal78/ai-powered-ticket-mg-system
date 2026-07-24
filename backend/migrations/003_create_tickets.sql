CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  assigned_to UUID NULL REFERENCES users (id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (
    status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled')
  ),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT title_length CHECK (char_length(title) <= 200),
  CONSTRAINT description_length CHECK (char_length(description) <= 5000)
);
