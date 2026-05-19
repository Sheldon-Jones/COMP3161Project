-- ============================================================
-- COMP3161_Final_Proj — Report Views
-- ============================================================

USE comp3161_final_proj;

-- ─── 1. All courses with 50 or more students ─────────────────
CREATE OR REPLACE VIEW vw_courses_50_plus AS
SELECT 
    c.course_id,
    c.course_name,
    COUNT(a.user_id) AS student_count
FROM course c
JOIN assigned_to a ON c.course_id = a.course_id
GROUP BY c.course_id, c.course_name
HAVING student_count >= 50;

-- ─── 2. All students enrolled in 5 or more courses ───────────
CREATE OR REPLACE VIEW vw_students_5_plus AS
SELECT 
    u.user_id,
    u.name,
    COUNT(a.course_id) AS course_count
FROM user u
JOIN assigned_to a ON u.user_id = a.user_id
GROUP BY u.user_id, u.name
HAVING course_count >= 5;

-- ─── 3. All lecturers teaching 3 or more courses ─────────────
CREATE OR REPLACE VIEW vw_lecturers_3_plus AS
SELECT 
    u.user_id,
    u.name,
    COUNT(m.course_id) AS course_count
FROM user u
JOIN maintains m ON u.user_id = m.user_id
GROUP BY u.user_id, u.name
HAVING course_count >= 3;

-- ─── 4. Top 10 most enrolled courses ─────────────────────────
CREATE OR REPLACE VIEW vw_top_10_enrolled AS
SELECT 
    c.course_id,
    c.course_name,
    COUNT(a.user_id) AS student_count
FROM course c
JOIN assigned_to a ON c.course_id = a.course_id
GROUP BY c.course_id, c.course_name
ORDER BY student_count DESC
LIMIT 10;

-- ─── 5. Top 10 students by overall average ───────────────────
CREATE OR REPLACE VIEW vw_top_10_students AS
SELECT 
    u.user_id,
    u.name,
    ROUND(AVG(s.grade), 2) AS overall_average,
    COUNT(s.submission_id) AS total_submissions
FROM user u
JOIN submission s ON u.user_id = s.user_id
WHERE s.grade IS NOT NULL
GROUP BY u.user_id, u.name
ORDER BY overall_average DESC
LIMIT 10;

-- ─── Verify all views were created ───────────────────────────
SHOW FULL TABLES WHERE table_type = 'VIEW';