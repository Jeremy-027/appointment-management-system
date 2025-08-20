// server.js

//import
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { DateTime } = require('luxon');
const path = require('path');

//setup
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secret-key';
app.use(cors());
app.use(express.json());

//database with sqlite
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
  //table user
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    preferred_timezone TEXT NOT NULL DEFAULT 'UTC'
  )`);

  //table appointments
  db.run(`CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY(creator_id) REFERENCES users(id)
  )`);

  //table participant for appointments
  db.run(`CREATE TABLE appointment_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY(appointment_id) REFERENCES appointments(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  //sample users
  const users = [
    { name: 'John Jones', username: 'john', timezone: 'America/New_York' },
    { name: 'Jane Jeane', username: 'jane', timezone: 'Europe/London' },
    { name: 'Tom Cruise', username: 'tom', timezone: 'Asia/Tokyo' },
    { name: 'Laufey Lin', username: 'laufey', timezone: 'Australia/Sydney' },
    { name: 'Jeremy Jhonson', username: 'jeremy', timezone: 'Asia/Jakarta' },
    { name: 'James Jordan', username: 'james', timezone: 'Asia/Jakarta' },
    { name: 'Albert Einstein', username: 'albert', timezone: 'America/New_York' },
    { name: 'Jenson Huang', username: 'jenson', timezone: 'Asia/Jakarta' }
  ];

  const stmt = db.prepare('INSERT INTO users (name, username, preferred_timezone) VALUES (?, ?, ?)');
  users.forEach(user => {
    stmt.run(user.name, user.username, user.timezone);
  });
  stmt.finalize();
});

//verify jwt
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

//check time
const isWithinWorkingHours = async (startTime, endTime, participantIds) => {
  return new Promise((resolve, reject) => {
    const placeholders = participantIds.map(() => '?').join(',');
    db.all(
      `SELECT preferred_timezone FROM users WHERE id IN (${placeholders})`,
      participantIds,
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const start = DateTime.fromISO(startTime);
        const end = DateTime.fromISO(endTime);

        for (const row of rows) {
          const userStart = start.setZone(row.preferred_timezone);
          const userEnd = end.setZone(row.preferred_timezone);
          
          if (userStart.hour < 9 || userStart.hour >= 17 || 
              userEnd.hour < 9 || userEnd.hour > 17) {
            resolve(false);
            return;
          }
        }
        
        resolve(true);
      }
    );
  });
};

//api route
//login
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        preferred_timezone: user.preferred_timezone
      }
    });
  });
});

//get logged in data
app.get('/api/users/me', verifyToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      preferred_timezone: user.preferred_timezone
    });
  });
});

//get users
app.get('/api/users', verifyToken, (req, res) => {
  db.all('SELECT id, name, username, preferred_timezone FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(users);
  });
});

//make appointment
app.post('/api/appointments', verifyToken, async (req, res) => {
  const { title, start_time, end_time, participants } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ message: 'Title, start time, and end time are required' });
  }

  try {
    const allParticipants = [req.user.id, ...(participants || [])];
    const validTime = await isWithinWorkingHours(start_time, end_time, allParticipants);

    if (!validTime) {
      return res.status(400).json({ 
        message: 'Appointment time must be within working hours (09:00-17:00) for all participants' 
      });
    }

    db.run(
      'INSERT INTO appointments (title, creator_id, start_time, end_time) VALUES (?, ?, ?, ?)',
      [title, req.user.id, start_time, end_time],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error creating appointment' });
        }

        const appointmentId = this.lastID;

        //add people to appointments
        const stmt = db.prepare('INSERT INTO appointment_participants (appointment_id, user_id) VALUES (?, ?)');
        allParticipants.forEach(userId => {
          stmt.run(appointmentId, userId);
        });
        stmt.finalize();

        res.status(201).json({ 
          id: appointmentId, 
          title, 
          creator_id: req.user.id, 
          start_time, 
          end_time 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

//get user appointments
app.get('/api/appointments', verifyToken, (req, res) => {
  const query = `
    SELECT DISTINCT a.*, u.name as creator_name
    FROM appointments a
    JOIN users u ON a.creator_id = u.id
    JOIN appointment_participants ap ON a.id = ap.appointment_id
    WHERE ap.user_id = ?
    ORDER BY a.start_time
  `;

  db.all(query, [req.user.id], (err, appointments) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    //convert to timezone
    db.get('SELECT preferred_timezone FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }

      const convertedAppointments = appointments.map(apt => ({
        ...apt,
        start_time_local: DateTime.fromISO(apt.start_time).setZone(user.preferred_timezone).toISO(),
        end_time_local: DateTime.fromISO(apt.end_time).setZone(user.preferred_timezone).toISO()
      }));

      res.json(convertedAppointments);
    });
  });
});

//if production or in web
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});