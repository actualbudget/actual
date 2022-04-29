
CREATE TABLE poop
  (id INT PRIMARY KEY,
   name TEXT);

CREATE TABLE person
  (id INT PRIMARY KEY,
   name TEXT,
   poops INT,
   FOREIGN KEY(poops) REFERENCES poop(id));

INSERT INTO poop (id, name) VALUES (1, 'monday');
INSERT INTO person (id, name, poops) VALUES (1, 'james', 1);
