import pool from './config/db';
import bcrypt from 'bcrypt';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // 1. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO UPDATE SET password_hash = $3
       RETURNING id`,
      ['admin', 'admin@itc.edu.kh', adminPassword, 'admin']
    );
    const adminId = adminUser.rows[0].id;
    console.log('✅ Admin user created');

    // 2. Create Departments
    const depts = [
      { name: 'Génie Informatique et Communication', code: 'GIC' },
      { name: 'Génie Electrique et Energétique', code: 'GEE' },
      { name: 'Génie Civil', code: 'GCI' }
    ];

    for (const dept of depts) {
      await pool.query(
        `INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
        [dept.name, dept.code]
      );
    }
    console.log('✅ Departments created');

    // 3. Get GIC Department ID
    const gicResult = await pool.query(`SELECT id FROM departments WHERE code = 'GIC'`);
    const gicId = gicResult.rows[0].id;

    // 4. Create a Student User & Profile
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING
       RETURNING id`,
      ['student1', 'student1@itc.edu.kh', studentPassword, 'student']
    );

    if (studentUser.rows.length > 0) {
      const studentUserId = studentUser.rows[0].id;
      await pool.query(
        `INSERT INTO students (user_id, student_id_card, first_name, last_name, gender, department_id, generation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id_card) DO NOTHING`,
        [studentUserId, 'e20200001', 'Sok', 'Dara', 'Male', gicId, 'Gen 43']
      );
      console.log('✅ Student profile created');
    }

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
