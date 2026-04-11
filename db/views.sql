-- =============================================================================
-- COMP3161 Final Project – SQL Views for Reports
-- Run this script AFTER creating the database schema.
--
-- IMPORTANT: The original schema defines `password VARCHAR(50)`.
-- bcrypt hashes are 60 characters. Run the ALTER below before inserting users.
-- =============================================================================

USE COMP3161_Final_Proj;

-- Fix password column length to accommodate bcrypt hashes
ALTER TABLE `User` MODIFY COLUMN password VARCHAR(255) NOT NULL;


-- -----------------------------------------------------------------------------
-- View 1: All courses that have 50 or more students
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW CoursesWith50PlusStudents AS
SELECT
    c.course_id,
    c.course_name,
    c.description,
    COUNT(at.user_id) AS student_count
FROM Course c
JOIN Assigned_To at ON c.course_id = at.course_id
GROUP BY c.course_id, c.course_name, c.description
HAVING COUNT(at.user_id) >= 50;


-- -----------------------------------------------------------------------------
-- View 2: All students enrolled in 5 or more courses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW StudentsWith5PlusCourses AS
SELECT
    u.user_id,
    u.name,
    u.email,
    COUNT(at.course_id) AS course_count
FROM `User` u
JOIN Student s     ON u.user_id  = s.user_id
JOIN Assigned_To at ON s.user_id = at.user_id
GROUP BY u.user_id, u.name, u.email
HAVING COUNT(at.course_id) >= 5;


-- -----------------------------------------------------------------------------
-- View 3: All lecturers teaching 3 or more courses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW LecturersWith3PlusCourses AS
SELECT
    u.user_id,
    u.name,
    u.email,
    l.department,
    COUNT(m.course_id) AS course_count
FROM `User` u
JOIN Lecturer l ON u.user_id  = l.user_id
JOIN Maintains m ON l.user_id = m.user_id
GROUP BY u.user_id, u.name, u.email, l.department
HAVING COUNT(m.course_id) >= 3;


-- -----------------------------------------------------------------------------
-- View 4: The 10 most enrolled courses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW Top10EnrolledCourses AS
SELECT
    c.course_id,
    c.course_name,
    c.description,
    COUNT(at.user_id) AS enrollment_count
FROM Course c
LEFT JOIN Assigned_To at ON c.course_id = at.course_id
GROUP BY c.course_id, c.course_name, c.description
ORDER BY enrollment_count DESC
LIMIT 10;


-- -----------------------------------------------------------------------------
-- View 5: Top 10 students with the highest overall grade averages
-- Average = mean of (grade / max_marks * 100) across all graded submissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW Top10StudentAverages AS
SELECT
    u.user_id,
    u.name,
    u.email,
    ROUND(AVG(sub.grade / a.max_marks * 100), 2) AS overall_average,
    COUNT(sub.submission_id)                       AS graded_submissions
FROM `User` u
JOIN Student s    ON u.user_id           = s.user_id
JOIN Submission sub ON s.user_id         = sub.user_id
JOIN Assignment a   ON sub.assignment_id = a.assignment_id
WHERE sub.grade IS NOT NULL
GROUP BY u.user_id, u.name, u.email
ORDER BY overall_average DESC
LIMIT 10;
