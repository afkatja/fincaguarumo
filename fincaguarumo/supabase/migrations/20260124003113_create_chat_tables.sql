-- Create the Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP NOT NULL,
  guest_name TEXT NOT NULL,
  source TEXT NOT NULL,
  uid TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create the Availability table
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_available BOOLEAN NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the ChatSessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  language TEXT
);

-- Create the ChatMessages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);