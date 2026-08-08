# EventNet

A comprehensive event management platform for creating, managing, and attending events. EventNet provides a seamless experience for event organizers and attendees with real-time updates, interactive maps, QR code ticketing, and more.

## Project Structure

The project consists of three main parts:

- **Client**: Frontend React application built with Vite
- **Server**: Backend Node.js/Express API
- **Admin**: Admin dashboard for managing the platform

## Technologies Used

### Frontend (Client)
- React 19
- Vite 6
- Tailwind CSS
- Framer Motion for animations
- React Router v7
- Google Maps integration
- Chart.js for analytics
- Socket.io for real-time updates

### Backend (Server)
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for email notifications
- Multer for file uploads
- Socket.io for real-time communication

## Features

- User authentication and profile management
- Create and customize events with various themes
- Interactive venue mapping with Google Maps integration
- Ticket creation and management
- QR code generation for event check-in
- Real-time attendee tracking
- Event analytics and reporting
- Email notifications

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB
- Google Maps API key (for map functionality)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/eventnet.git
   cd eventnet
   ```

2. Install dependencies for all parts
   ```bash
   # Root dependencies
   npm install
   
   # Client dependencies
   cd client
   npm install
   
   # Server dependencies
   cd ../server
   npm install
   
   # Admin dependencies
   cd ../admin
   npm install
   ```

3. Configure environment variables
   - Create a `.env` file in the server directory using the `.env.example` as a template
   - Add your MongoDB connection string
   - Add your JWT secret
   - Configure email service credentials
   - Add Google Maps API key

4. Start the development servers

   ```bash
   # Start the backend server (from the server directory)
   npm run dev
   
   # Start the client app (from the client directory)
   npm run dev
   
   # Start the admin app (from the admin directory)
   npm run dev
   ```

## API Endpoints

- **Authentication**
  - POST `/api/auth/register` - Register a new user
  - POST `/api/auth/login` - User login
  - GET `/api/auth/me` - Get current user

- **Events**
  - GET `/api/events` - Get all events
  - GET `/api/events/:id` - Get specific event
  - POST `/api/events` - Create a new event
  - PUT `/api/events/:id` - Update an event
  - DELETE `/api/events/:id` - Delete an event

- **Tickets**
  - GET `/api/tickets` - Get user tickets
  - POST `/api/tickets/purchase` - Purchase a ticket
  - GET `/api/tickets/validate/:id` - Validate a ticket

## Deployment

The application is set up for easy deployment:

- **Client**: Can be deployed to Netlify, Vercel, or any static hosting
- **Server**: Can be deployed to Heroku, DigitalOcean, or any Node.js hosting
- **Database**: MongoDB Atlas recommended for production

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React Team for the amazing frontend library
- Tailwind CSS for the utility-first CSS framework
- MongoDB for the flexible document database
- Express.js for the backend framework
