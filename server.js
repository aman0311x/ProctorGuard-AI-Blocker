const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabaseClient');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    socket.on('join_competition', (contestCode) => {
        socket.join(contestCode);
        console.log(`🌐 Dashboard joined room: ${contestCode}`);
    });
});

app.get('/', (req, res) => { res.send('ProctorGuard Startup Backend Running!'); });

// --------------------------------------------------------
// API 1
// --------------------------------------------------------
app.post('/api/create-competition', async (req, res) => {
    const { name, organizer, secret_key } = req.body;

    const { data, error } = await supabase
        .from('competitions')
        .insert([{ name, organizer, secret_key }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'Competition created', data: data[0] });
});

// --------------------------------------------------------
// API 2
// --------------------------------------------------------
app.post('/api/logs', async (req, res) => {
    const { participant_id, event_type, details, contest_code } = req.body;

    const { data, error } = await supabase
        .from('logs')
        .insert([{ participant_id, event_type, details, competition_key: contest_code }])
        .select();

    if (error) return res.status(400).json({ error: error.message });

    io.to(contest_code).emit('new-log', data[0]);

    res.status(201).json({ message: 'Log saved successfully' });
});

// --------------------------------------------------------
// API 3
// --------------------------------------------------------
app.get('/api/logs', async (req, res) => {
    const { code } = req.query;

    if (!code) return res.status(400).json({ error: "Secret key is required" });

    const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('competition_key', code)
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Startup Backend running on http://localhost:${PORT}`);
});