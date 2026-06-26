// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../configs/db');

// --- STUDENT REGISTRATION ---
exports.registerStudent = async (req, res) => {
    const { name, email, password, registrationId, schoolId } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Verify if the selected school exists and is active
        const schoolCheck = await client.query(
            'SELECT id FROM school WHERE id = $1 AND is_deleted = false AND status = \'ACTIVE\'',
            [schoolId]
        );
        if (schoolCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Selected school is invalid or inactive.' });
        }

        // 2. Check if email already exists
        const userExist = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Insert into core users table
        const userInsertQuery = `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE')
      RETURNING id, name, email, role;
    `;
        const userResult = await client.query(userInsertQuery, [name, email, passwordHash]);
        const newUser = userResult.rows[0];

        // 5. Insert corresponding student profile entry
        const studentProfileQuery = `
      INSERT INTO student_profile (user_id, registration_id, school_id)
      VALUES ($1, $2, $3);
    `;
        await client.query(studentProfileQuery, [newUser.id, registrationId, schoolId]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Student registered successfully!', user: newUser });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Student Registration Error:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    } finally {
        client.release();
    }
};

// --- STAFF REGISTRATION ---
exports.registerStaff = async (req, res) => {
    const { name, email, password } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Check if email already exists
        const userExist = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insert into core users table
        const userInsertQuery = `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'STAFF', 'ACTIVE')
      RETURNING id, name, email, role;
    `;
        const userResult = await client.query(userInsertQuery, [name, email, passwordHash]);
        const newUser = userResult.rows[0];

        // 4. Insert corresponding staff profile entry
        const staffProfileQuery = `INSERT INTO staff_profile (user_id) VALUES ($1);`;
        await client.query(staffProfileQuery, [newUser.id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Staff registered successfully!', user: newUser });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Staff Registration Error:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    } finally {
        client.release();
    }
};

// --- GLOBAL LOGIN SYSTEM ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userQuery = 'SELECT * FROM users WHERE email = $1 AND is_deleted = false';
        const result = await db.query(userQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Issue signed session web token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal server login error.' });
    }
};


// --- CHANGE PASSWORD ---
exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId; // Populated by authenticateToken middleware

    try {
        // 1. Fetch current user password hash
        const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1 AND is_deleted = false', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = userResult.rows[0];

        // 2. Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        // 3. Hash and update to new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newPasswordHash, userId]);

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Internal server error changing password.' });
    }
};

// --- LOGOUT ---
exports.logout = (req, res) => {
    // Clear frontend session instructions
    res.status(200).json({ message: 'Logged out successfully. Securely clear your client session tokens.' });
};

// Append to backend/src/controllers/authController.js

// --- GET CURRENT LOGGED-IN USER (ME) ---
exports.getMe = async (req, res) => {
    try {
        const userQuery = 'SELECT id, name, email, role, status FROM users WHERE id = $1 AND is_deleted = false';
        const result = await db.query(userQuery, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ Get Me Profile Error:', error);
        res.status(500).json({ message: 'Internal server error fetching user profile.' });
    }
};

// --- GET ALL STAFF MEMBERS ---
exports.getAllStaff = async (req, res) => {
    try {
        const query = `
            SELECT id, name, email FROM users 
            WHERE role = 'STAFF' AND is_deleted = false 
            ORDER BY name ASC
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({ message: 'Internal server error fetching staff members.' });
    }
};

// --- GET STAFF PROFILE (Me) ---
exports.getStaffProfile = async (req, res) => {
    const userId = req.user.userId;
    try {
        const profileQuery = `
            SELECT u.id, u.name, u.email, u.role, u.status, u.created_at AS joined_at,
                   sp.id AS staff_profile_id
            FROM users u
            JOIN staff_profile sp ON u.id = sp.user_id
            WHERE u.id = $1 AND u.is_deleted = false
        `;
        const profileRes = await db.query(profileQuery, [userId]);
        if (profileRes.rows.length === 0) {
            return res.status(404).json({ message: 'Staff profile not found.' });
        }

        // Fetch event stats
        const createdCountRes = await db.query(
            `SELECT COUNT(*) FROM event e
             JOIN staff_profile sp ON e.created_by_staff_id = sp.id
             WHERE sp.user_id = $1 AND e.is_deleted = false`,
            [userId]
        );
        const coordinatingCountRes = await db.query(
            `SELECT COUNT(DISTINCT e.id) FROM event e
             JOIN coordinator_assignment ca ON e.id = ca.event_id
             WHERE ca.user_id = $1 AND ca.is_deleted = false AND e.is_deleted = false`,
            [userId]
        );

        res.status(200).json({
            ...profileRes.rows[0],
            eventsCreated: parseInt(createdCountRes.rows[0].count),
            eventsCoordinating: parseInt(coordinatingCountRes.rows[0].count)
        });
    } catch (error) {
        console.error('Get Staff Profile Error:', error);
        res.status(500).json({ message: 'Error fetching staff profile.' });
    }
};

// --- UPDATE MY NAME ---
exports.updateMyName = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
    }
    try {
        const result = await db.query(
            'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
            [name.trim(), userId]
        );
        res.status(200).json({ message: 'Name updated successfully.', user: result.rows[0] });
    } catch (error) {
        console.error('Update Name Error:', error);
        res.status(500).json({ message: 'Error updating name.' });
    }
};
