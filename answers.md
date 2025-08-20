1. Timezone Conflicts: How would you handle timezone conflicts between participants in an appointment?
- Check working hours (9 AM - 5 PM) for ALL participants before creating appointments
- Convert meeting time to each participant's local timezone
- Reject the appointment if it's outside working hours for anyone
- Show participant timezones when creating appointments so users can choose better times
Example: If someone in New York schedules 2 PM, but that's 4 AM in Tokyo, the system rejects it because 4 AM is outside working hours.

2. Database Optimization: How can you optimize database queries to efficiently fetch user-specific appointments?
Current optimizations:
- Use JOIN queries to get all data in one request instead of multiple requests
- Filter appointments by logged-in user to only get relevant data
- Index foreign keys for faster lookups by creating a "lookup-table"
For production:
- Add database indexes on frequently searched columns
- Use pagination for large lists (show 10 appointments per page)
- Cache frequently accessed data

3. Additional Features: If this application were to become a real product, what additional features would you implement? Why?
Essential features:
- Email/WA/SMS notifications - remind users about upcoming meetings
- Edit/delete appointments - users need to modify their schedules
- Calendar integration - sync with Google Calendar, Outlook
- Mobile app - people schedule meetings on their phones
Why these matter:
- Email/WA/SMS Email notifications prevent missed meetings
- Edit or Delete appointments to make sure 
- Integration with existing calendars, such as Apple's iOS calendar or Google Calendar reduces double-booking
- Mobile access is essential for modern users

4. Session Management: How would you manage user sessions securely while keeping them lightweight?
Current approach:
- JWT tokens expire after 1 hour
- Store user ID and username only
- Save token in browser storage
To make it more secure:
- Use cookies instead of localStorage
- Add refresh tokens so users don't get logged out suddenly
- Limit login attempts to prevent password guessing
To keep it lightweight:
- Store minimal data in tokens (just user ID)
- Use short token expiry (15 minutes) 
- Don't save session data on the server