CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Courses (
    crn INT NOT NULL UNIQUE PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    semester VARCHAR(10) CHECK (semester IN ('Fall', 'Winter', 'Spring')) NOT NULL,
    status VARCHAR(10) CHECK (status IN ('OPEN', 'CLOSED')) NOT NULL
);

CREATE TABLE Registrations (
    registration_id SERIAL PRIMARY KEY,
    user_id INT,
    crn INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (crn) REFERENCES Courses(crn)
);
