import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY
    }
};
