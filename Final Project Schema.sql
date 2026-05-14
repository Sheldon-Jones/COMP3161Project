CREATE DATABASE COMP3161_Final_Proj;
USE COMP3161_Final_Proj;

CREATE TABLE User (
	user_id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(50) NOT NULL,
	email VARCHAR(50) NOT NULL,
	password VARCHAR(50) NOT NULL, 
	user_type ENUM('Admin','Lecturer','Student') NOT NULL
);

CREATE TABLE Admin (
	user_id INT PRIMARY KEY,
	FOREIGN KEY(user_id) REFERENCES User(user_id)
		ON DELETE CASCADE
);

CREATE TABLE Student (
	user_id INT PRIMARY KEY,
    date_enrolled DATE NOT NULL,
    FOREIGN KEY(user_ID) REFERENCES User(user_id)
		ON DELETE CASCADE
);

CREATE TABLE Lecturer (
	user_id INT PRIMARY KEY,
    department VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
		ON DELETE CASCADE
);

CREATE TABLE Course (
	course_id VARCHAR(50) PRIMARY KEY NOT NULL UNIQUE, 
    course_name VARCHAR(50) NOT NULL, 
    description TEXT
);

CREATE TABLE Assigned_To (
	user_id INT, 
    course_id VARCHAR(50), 
    enrollment_date DATE NOT NULL,
	PRIMARY KEY (user_id, course_id),
   
    FOREIGN KEY (user_id) REFERENCES Student(user_id)
		ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES Course(course_id)
		ON DELETE CASCADE
 );
 
 CREATE TABLE Maintains (
	user_id INT NOT NULL, 
    course_id VARCHAR(50) NOT NULL,
    PRIMARY KEY(user_id, course_id),
	
    FOREIGN KEY (user_id) REFERENCES Lecturer (user_id)
		ON DELETE CASCADE,
   
    FOREIGN KEY (course_id) REFERENCES Course (course_id) 
		ON DELETE CASCADE
 );
 
CREATE TABLE Section (
	course_id VARCHAR(50) NOT NULL,
	section_num INT NOT NULL,
    title VARCHAR (50) NOT NULL, 
    sec_order INT,
    PRIMARY KEY(section_num, course_id),
    FOREIGN KEY(course_id) REFERENCES Course(course_id)
		ON DELETE CASCADE
);

CREATE TABLE Section_Item (
	 item_id INT AUTO_INCREMENT PRIMARY KEY , 
	 course_id VarChar(50),
     section_num INT,
     title VARCHAR (50),
     type VARCHAR(50),
     content TEXT,
	 FOREIGN KEY (course_id, section_num)
     REFERENCES Section (course_id, section_num)
		ON DELETE CASCADE
);

CREATE TABLE Discussion_Forum(
	forum_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(50), 
    title VARCHAR (100) NOT NULL,
    description TEXT,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
		ON DELETE CASCADE
);

CREATE TABLE Discussion_Thread(
	thread_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id VARCHAR(50),
    forum_id INT,
    user_id INT, 
    parent_thread_id INT NULL,
    title VARCHAR(50),
    content TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
   
   FOREIGN KEY (forum_id) REFERENCES Discussion_Forum(forum_id)
		ON DELETE CASCADE,
        
	FOREIGN KEY (user_id) REFERENCES User(user_id) 
		ON DELETE CASCADE,
    
    FOREIGN KEY (parent_thread_id) REFERENCES Discussion_Thread(thread_id)
		ON DELETE CASCADE
);

CREATE TABLE Calendar_Event (
	event_id INT AUTO_INCREMENT PRIMARY KEY,
	course_id VARCHAR(50), 
    title VARCHAR(50),
    description TEXT, 
    event_date DATE, 
    event_type VARCHAR (50),
	FOREIGN KEY (course_id) REFERENCES Course(course_id)
		ON DELETE CASCADE
);

CREATE TABLE Assignment (
	assignment_id INT AUTO_INCREMENT PRIMARY KEY, 
    course_id VARCHAR(50), 
    title VARCHAR(50), 
    description TEXT, 
    due_date DATE, 
    max_marks INT,
    
	FOREIGN KEY (course_id) REFERENCES Course(course_id) 
		ON DELETE CASCADE
); 

CREATE TABLE Submission (
	submission_id INT AUTO_INCREMENT PRIMARY KEY, 
	user_id INT, 
	assignment_id INT, 
    submission_text TEXT,
	submission_date DATETIME DEFAULT CURRENT_TIMESTAMP, 
	grade INT,
    
    FOREIGN KEY(user_id) REFERENCES Student(user_id) 
		ON DELETE CASCADE,
    
    FOREIGN KEY(assignment_id) REFERENCES Assignment(assignment_id) 
		ON DELETE CASCADE
);

