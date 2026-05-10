CREATE OR REPLACE VIEW vw_lecturers_3_plus AS
SELECT 
    u.user_id, 
    u.name AS lecturer_name, 
    COUNT(a.course_id) AS course_count
FROM `User` u
JOIN Lecturer l ON u.user_id = l.user_id
JOIN assigned_to a ON l.user_id = a.user_id
GROUP BY u.user_id, u.name
HAVING course_count >= 3;