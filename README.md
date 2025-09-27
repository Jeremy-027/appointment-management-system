Setup Instructions
Required Software
- Node.js
- npm

Installation
1. Clone the repository or download the files

2. Install backend dependencies (make sure terminal is in \appointment-management-system\):
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

Running the Application
1. Start both backend and frontend in development mode:
```bash
npm run dev
```

2. Access the application at `http://localhost:3000`
here are some sample users : 
- john (America/New_York)
- jane (Europe/London) 
- tom (Asia/Tokyo)
- laufey (Australia/Sydney)
- jeremy (Asia/Jakarta)
- james (Asia/Jakarta)
- jenson (Asia/Jakarta)
- albert (America/New_York)

API Endpoints
1. Authentication
- `POST /api/auth/login` - Login with username
2. Users
- `GET /api/users/me` - Get current user data
- `GET /api/users` - Get all users
3. Appointments
- `POST /api/appointments` - Create new appointment
- `GET /api/appointments` - Get user's appointments

Working Hours Validation
The system ensures all appointments are scheduled within working hours (09:00-17:00) for all participants in their respective timezones. If any participant's timezone would place the meeting outside working hours, the appointment creation will be rejected.

Session Management
- JWT tokens expire after 1 hour
- Tokens are stored in localStorage
- Automatic logout on token expiry
