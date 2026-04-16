const mongoose = require('mongoose');

class Database {
    constructor() {
        this.clientPromise = null;
    }

    async connect() {
        // If already connected, return the client
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection.getClient();
        }

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('CRITICAL: MONGODB_URI is not defined in environment variables!');
            throw new Error('MONGODB_URI is required');
        }

        // If a connection promise is not already in progress, start one
        if (!this.clientPromise) {
            this.clientPromise = mongoose.connect(uri, {
                maxPoolSize: 5,               // M0 allows ~500 total; 5 per instance is safe on Vercel
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }).then(m => {
                console.log('MongoDB Connected via Database class');
                return m.connection.getClient();
            }).catch(err => {
                console.error('MongoDB connection error:', err);
                this.clientPromise = null; // Reset on error so next attempt can try again
                throw err;
            });
        }
        
        return this.clientPromise;
    }
}

// Export as a singleton
module.exports = new Database();
