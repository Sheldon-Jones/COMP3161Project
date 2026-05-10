CREATE OR REPLACE VIEW vw_courses_50_plus AS
SELECT 
    c.course_id, 
    c.course_name, 
    COUNT(a.user_id) AS student_count
FROM course c
JOIN assigned_to a ON c.course_id = a.course_id
GROUP BY c.course_id, c.course_name
HAVING student_count >= 50;


SELECT * FROM vw_courses_50_plus;