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

// Socket.io সেটআপ
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] } // এখন যেকোনো ডোমেইন থেকে কানেক্ট হবে
});

// লাইভ কানেকশন হ্যান্ডলিং (আমরা এখন রুম (Room) কনসেপ্ট ইউজ করব)
io.on('connection', (socket) => {
    // অর্গানাইজার যখন ড্যাশবোর্ড ওপেন করবে, সে একটা 'রুম' এ জয়েন করবে যার নাম হবে সিক্রেট কোড
    socket.on('join_competition', (contestCode) => {
        socket.join(contestCode);
        console.log(`🌐 Dashboard joined room: ${contestCode}`);
    });
});

app.get('/', (req, res) => { res.send('ProctorGuard Startup Backend Running!'); });

// --------------------------------------------------------
// API 1: প্রতিযোগিতার তথ্য সেভ করা (ড্যাশবোর্ড থেকে আসবে)
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
// API 2: এক্সটেনশন থেকে ডাটা রিসিভ করা (আপডেট লজিক)
// --------------------------------------------------------
app.post('/api/logs', async (req, res) => {
    const { participant_id, event_type, details, contest_code } = req.body;

    // 🔥 ম্যাজিক: ডাটাবেসে সেভ করার সময় `competition_key` যুক্ত করছি
    const { data, error } = await supabase
        .from('logs')
        .insert([{ participant_id, event_type, details, competition_key: contest_code }])
        .select();

    if (error) return res.status(400).json({ error: error.message });

    // 🔥 ম্যাজিক ২: শুধুমাত্র ওই কোডের ড্যাশবোর্ড রুমেই লাইভ ডেটা পাঠানো হবে (অন্যরা দেখবে না)
    io.to(contest_code).emit('new-log', data[0]);

    res.status(201).json({ message: 'Log saved successfully' });
});

// --------------------------------------------------------
// API 3: ড্যাশবোর্ড লোড হলে শুধু ওই কোডের পুরোনো ডেটা পাঠানো
// --------------------------------------------------------
app.get('/api/logs', async (req, res) => {
    const { code } = req.query; // ড্যাশবোর্ড 'http://.../logs?code=PRO-XXXX' এভাবে রিকোয়েস্ট করবে

    if (!code) return res.status(400).json({ error: "Secret key is required" });

    const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('competition_key', code) // 🔥 ম্যাজিক ফিল্টার: শুধু এই কোডের ডেটা আসবে
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Startup Backend running on http://localhost:${PORT}`);
});