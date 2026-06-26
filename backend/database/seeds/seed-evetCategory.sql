INSERT INTO event_category (category_name, category_type, status) VALUES 
-- Competitive Categories
('Technical Hackathon', 'COMPETITIVE', 'ACTIVE'),
('Coding & Debugging', 'COMPETITIVE', 'ACTIVE'),
('Sports & Athletics', 'COMPETITIVE', 'ACTIVE'),
('Gaming & Esports', 'COMPETITIVE', 'ACTIVE'),
('Cultural & Performing Arts', 'COMPETITIVE', 'ACTIVE'),
('Quizzes & Debates', 'COMPETITIVE', 'ACTIVE'),

-- Non-Competitive Categories
('Academic Exam / Test', 'NON-COMPETITIVE', 'ACTIVE'),
('Guest Lecture & Seminar', 'NON-COMPETITIVE', 'ACTIVE'),
('Workshop & Boot camp', 'NON-COMPETITIVE', 'ACTIVE'),
('Entertainment & Standup', 'NON-COMPETITIVE', 'ACTIVE'),
('Social Service & Awareness', 'NON-COMPETITIVE', 'ACTIVE'),
('Exhibition & Project Display', 'NON-COMPETITIVE', 'ACTIVE')
ON CONFLICT (category_name, category_type) DO NOTHING;