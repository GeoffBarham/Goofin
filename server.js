const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const db = new sqlite3.Database(':memory:');

app.use(cors());
app.use(express.json());

// Initialize the database
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS assignments (bedNumber INTEGER PRIMARY KEY, name TEXT)');
});

// Upload the .txt file and save names to the database
app.post('/upload', upload.single('file'), (req, res) => {
  const fileContent = fs.readFileSync(req.file.path, 'utf8');
  const names = fileContent.split('\n').map((line) => {
    const [firstName, lastName] = line.trim().split(' ');
    return { firstName, lastName };
  });

  db.serialize(() => {
    db.run('DELETE FROM names');
    const stmt = db.prepare('INSERT INTO names (firstName, lastName) VALUES (?, ?)');
    names.forEach((name) => {
      stmt.run(name.firstName, name.lastName);
    });
    stmt.finalize();
  });

  res.status(200).send('Names uploaded and saved.');
});

// Get the list of names
app.get('/names', (req, res) => {
  db.all('SELECT firstName, lastName FROM names', [], (err, rows) => {
    if (err) {
      res.status(500).send('Error fetching names.');
    } else {
      res.json(rows);
    }
  });
});

// Save bed assignments
app.post('/assign', (req, res) => {
  const { bedNumber, name } = req.body;
  db.run(
    'INSERT INTO assignments (bedNumber, name) VALUES (?, ?) ON CONFLICT(bedNumber) DO UPDATE SET name = ?',
    [bedNumber, name, name],
    (err) => {
      if (err) {
        res.status(500).send('Error saving assignment.');
      } else {
        res.status(200).send('Assignment saved.');
      }
    }
  );
});

// Get assignments
app.get('/assignments', (req, res) => {
  db.all('SELECT * FROM assignments', [], (err, rows) => {
    if (err) {
      res.status(500).send('Error fetching assignments.');
    } else {
      res.json(rows);
    }
  });
});

// Get the port from the environment or use a default (3000)
const PORT = process.env.PORT || 3000;

// Start the server on the correct port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
