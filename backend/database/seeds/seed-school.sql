INSERT INTO school (school_name, status) VALUES 
('School of Engineering', 'ACTIVE'),
('School of mathematics and natural sciences', 'ACTIVE'),
('School of commerce', 'ACTIVE'),
('School of Arts and Humanities', 'ACTIVE'),
('School of Law', 'ACTIVE')
ON CONFLICT (school_name) DO NOTHING;