# HealthSync AI App Backend

A robust backend service for the HealthSync AI application, providing health data management, AI-powered insights, and secure user authentication.

## System Requirements

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- OpenAI API key (for AI features)
- npm or yarn package manager

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/NeelDevenShah/healthsync-ai-app-backend
   cd healthsync-ai-app-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or with yarn
   yarn install
   ```

## Configuration

1. Create a `.env` file in the root directory with the following variables:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/healthsync
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key
   NODE_ENV=development
   ```

2. Adjust the MongoDB connection string, JWT secret, and OpenAI API key according to your setup.

## Running the Application

### Development Mode

```bash
npm run dev
# or with yarn
yarn dev
```

### Production Mode

```bash
npm run build
npm start
# or with yarn
yarn build
yarn start
```

## API Documentation

The API endpoints are organized into the following categories:

- **Auth**: User registration, login, and authentication
- **Users**: User profile management
- **Health Data**: Storage and retrieval of health metrics
- **AI Insights**: AI-powered health recommendations and insights

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require authentication via JWT token. Include the token in your request headers:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Testing

Run the test suite with:

```bash
npm test
# or with yarn
yarn test
```

## Docker Support

Build and run with Docker:

```bash
docker build -t healthsync-backend .
docker run -p 3000:3000 --env-file .env healthsync-backend
```

## Troubleshooting

- **Connection Issues**: Ensure MongoDB is running and the connection string is correct
- **Authentication Errors**: Verify JWT_SECRET is properly set
- **AI Feature Failures**: Check that your OpenAI API key is valid and has sufficient credits

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request
