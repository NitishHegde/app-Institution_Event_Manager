DO $$
DECLARE
    new_user_id UUID;
    admin_email VARCHAR := 'jack@gmail.com';
BEGIN
    -- Check if the admin already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = admin_email) THEN
        
        -- 1. Insert into users table (Password: BlackPearl123)
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES (
            'Jack Sparrow', 
            admin_email, 
            crypt('root', gen_salt('bf', 10)), 
            'ADMIN', 
            'ACTIVE'
        )
        RETURNING id INTO new_user_id;

        -- 2. Insert into admin_profile table
        
        INSERT INTO admin_profile (user_id) 
        VALUES (new_user_id);

        RAISE NOTICE 'Admin account created successfully! Email: jack@blackpearl.com / Password: BlackPearl123';
    ELSE
        RAISE NOTICE 'Admin user already exists.';
    END IF;
END $$;