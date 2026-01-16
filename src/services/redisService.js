const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : ''}${REDIS_HOST}:${REDIS_PORT}`;

const client = createClient({
    url: REDIS_URL
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client Connected'));

let isConnected = false;
let useMemoryFallback = false;
const memoryStore = new Map();
const memoryHistory = [];

async function connect() {
    if (isConnected || useMemoryFallback) return;
    try {
        await client.connect();
        isConnected = true;
        console.log('✅ Redis connected');
    } catch (err) {
        console.warn('⚠️ Redis connection failed, falling back to in-memory store.');
        useMemoryFallback = true;
    }
}

async function setJob(jobId, data, expirySeconds = 3600) {
    if (useMemoryFallback) {
        memoryStore.set(`job:${jobId}`, JSON.stringify(data));
        return;
    }
    await connect();
    if (useMemoryFallback) return setJob(jobId, data, expirySeconds);
    const payload = JSON.stringify(data);
    await client.set(`job:${jobId}`, payload, {
        EX: expirySeconds
    });
}

async function getJob(jobId) {
    if (useMemoryFallback) {
        const data = memoryStore.get(`job:${jobId}`);
        return data ? JSON.parse(data) : null;
    }
    await connect();
    if (useMemoryFallback) return getJob(jobId);
    const data = await client.get(`job:${jobId}`);
    return data ? JSON.parse(data) : null;
}

async function addToHistory(jobData) {
    if (useMemoryFallback) {
        memoryHistory.unshift(jobData);
        if (memoryHistory.length > 100) memoryHistory.pop();
        return;
    }
    await connect();
    if (useMemoryFallback) return addToHistory(jobData);
    await client.lPush('job_history', JSON.stringify(jobData));
    await client.lTrim('job_history', 0, 99);
}

async function getHistory(limit = 50) {
    if (useMemoryFallback) {
        return memoryHistory.slice(0, limit);
    }
    await connect();
    if (useMemoryFallback) return getHistory(limit);
    const data = await client.lRange('job_history', 0, limit - 1);
    return data.map(item => JSON.parse(item));
}

async function getStats() {
    if (useMemoryFallback) {
        return {
            total: memoryHistory.length,
            completed: memoryHistory.filter(h => h.status === 'completed').length,
            failed: memoryHistory.filter(h => h.status === 'failed').length,
            active: memoryStore.size
        };
    }
    await connect();
    if (useMemoryFallback) return getStats();
    const history = await getHistory(100);
    const stats = {
        total: history.length,
        completed: history.filter(h => h.status === 'completed').length,
        failed: history.filter(h => h.status === 'failed').length,
        active: 0 
    };
    return stats;
}

module.exports = {
    setJob,
    getJob,
    addToHistory,
    getHistory,
    getStats,
    client
};
