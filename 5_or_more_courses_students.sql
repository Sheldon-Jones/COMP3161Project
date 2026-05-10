CREATE OR REPLACE VIEW vw_students_5_plus AS
SELECT 
    u.user_id, 
    u.name AS student_name, 
    COUNT(a.course_id) AS course_count
FROM `User` u
JOIN assigned_to a ON u.user_id = a.user_id
GROUP BY u.user_id, u.name
HAVING course_count >= 5;