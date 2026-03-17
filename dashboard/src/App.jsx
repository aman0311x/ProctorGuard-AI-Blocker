import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'


const socket = io('https://proctorguard-ai-blocker.onrender.com', { autoConnect: false });

function App() {
  const [logs, setLogs] = useState([])

  const [view, setView] = useState('home') // 'home', 'modal', 'dashboard'
  const [compDetails, setCompDetails] = useState({ name: '', org: '', secretKey: '' })
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchFilteredLogs = async (contestCode) => {
    setLoadingLogs(true);
    try {
      // http://.../api/logs?code=PRO-XXXX
      const response = await fetch(`https://proctorguard-ai-blocker.onrender.com/api/logs?code=${contestCode}`)
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error("Error fetching logs:", error)
    }
    setLoadingLogs(false);
  }

  const startCompetition = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('compName');
    const org = formData.get('orgName');

    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const key = `PRO-${randomHex}`;

    try {
      const response = await fetch('https://proctorguard-ai-blocker.onrender.com/api/create-competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizer: org, secret_key: key })
      });
      const compData = await response.json();
      console.log("Competition created:", compData);

      setCompDetails({ name, org, secretKey: key });
      setView('dashboard');

      fetchFilteredLogs(key);

      socket.connect();
      socket.emit('join_competition', key);

    } catch (error) {
      console.error("Failed to create competition:", error);
      alert("Error creating competition. Backend is running?");
    }
  }

  useEffect(() => {
    socket.on('new-log', (newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs])
    })

    return () => {
      socket.off('new-log');
      socket.disconnect();
    }
  }, [])


  const teamStats = logs.reduce((acc, log) => {
    const parts = log.participant_id.split(' - ');
    const teamName = parts[0] || 'Unknown_Team';
    const memberName = parts[1] || 'Unknown_Member';

    if (!acc[teamName]) {
      acc[teamName] = { id: teamName, totalLogs: 0, blocks: 0, copies: 0, pastes: 0, members: new Set(), teamLogs: [] }
    }

    acc[teamName].totalLogs++;
    acc[teamName].members.add(memberName);
    acc[teamName].teamLogs.push({ ...log, memberName });

    if (log.event_type === 'blocked_site') acc[teamName].blocks++;
    if (log.event_type === 'copy_event') acc[teamName].copies++;
    if (log.event_type === 'paste_event') acc[teamName].pastes++;

    return acc
  }, {})

  const teams = Object.values(teamStats)
  const selectedTeamLogs = selectedTeamId ? teamStats[selectedTeamId].teamLogs : []

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'blocked_site': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">🚨 BLOCKED</span>;
      case 'copy_event': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-600 border border-purple-200">✂️ COPIED</span>;
      case 'paste_event': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200">📋 PASTED</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 border border-blue-200">🔄 TAB SWITCH</span>;
    }
  }

  // --------------------------------------------------------
  // 🏠 VIEWS
  // --------------------------------------------------------

  // 1. Home
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">🛡️ ProctorGuard</h1>
          <p className="text-lg text-gray-600 max-w-lg mx-auto">Ultimate monitoring system for hackathons. Multi-tenant architecture ready for launch.</p>
        </div>
        <button onClick={() => setView('modal')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transform hover:scale-105 transition-all">
          🚀 Create New Competition
        </button>
      </div>
    )
  }

  // 2. Setup Modal
  if (view === 'modal') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-blue-600 p-6 text-white text-center">
            <h2 className="text-2xl font-bold">Competition Setup</h2>
            <p className="text-blue-100 text-sm mt-1">Details will be saved securely in Supabase</p>
          </div>
          <form onSubmit={startCompetition} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Competition Name</label>
              <input name="compName" required type="text" placeholder="e.g. Dhaka Hackathon 2026" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Organizer University/Club</label>
              <input name="orgName" required type="text" placeholder="e.g. BUET" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setView('home')} className="w-1/3 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button type="submit" className="w-2/3 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">Create Competition</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // 3. Main Dashboard
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header with Secret Key */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-600 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{compDetails.name}</h1>
            <p className="text-gray-500">Organized by: <span className="font-semibold text-gray-700">{compDetails.org}</span></p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-center min-w-[250px]">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Share Code with Teams</p>
            <div className="text-2xl font-mono font-black text-indigo-900 tracking-widest">{compDetails.secretKey}</div>
          </div>
        </div>

        {/* Team Cards */}
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          👥 Registered Teams <span className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-full">{teams.length}</span>
          {loadingLogs && <span className="text-sm text-gray-400">Loading old data...</span>}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.map((team) => (
            <div key={team.id} onClick={() => setSelectedTeamId(team.id)} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-blue-500 overflow-hidden transform hover:-translate-y-1 p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-gray-800">{team.id}</h2>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{team.totalLogs}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 truncate">
                <span className="font-bold text-gray-700">{Array.from(team.members).join(', ')}</span>
              </p>
              <div className="space-y-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                <div className="flex justify-between"><span>Blocks:</span><span className={`font-bold ${team.blocks > 0 ? 'text-red-600' : 'text-gray-700'}`}>{team.blocks}</span></div>
                <div className="flex justify-between"><span>Copy-Paste:</span><span className={`font-bold ${(team.copies + team.pastes) > 0 ? 'text-orange-600' : 'text-gray-700'}`}>{team.copies + team.pastes}</span></div>
              </div>
              <button className="w-full bg-blue-50 text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-100 transition">View Team</button>
            </div>
          ))}

          {teams.length === 0 && !loadingLogs && (
            <div className="col-span-full text-center py-16 text-gray-500 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
              <span className="text-4xl mb-3 block">⏳</span>Waiting for teams to connect using code <strong className="text-indigo-600">{compDetails.secretKey}</strong>...
            </div>
          )}
        </div>

        {/* Modal Team Details */}
        {selectedTeamId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={() => setSelectedTeamId(null)}>
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div><h2 className="text-2xl font-bold text-gray-800">Team Activity</h2><p className="text-gray-500 text-sm mt-1">Team: <span className="font-bold text-blue-600">{selectedTeamId}</span></p></div>
                <button onClick={() => setSelectedTeamId(null)} className="bg-gray-200 hover:bg-red-100 text-gray-600 rounded-full w-10 h-10 transition font-bold text-xl">✕</button>
              </div>
              <div className="overflow-y-auto p-8 flex-1">
                <table className="min-w-full text-left">
                  <thead><tr className="bg-gray-800 text-white"><th className="py-3 px-4 rounded-tl-lg">Time</th><th>Member</th><th>Event</th><th className="rounded-tr-lg">Details</th></tr></thead>
                  <tbody>{selectedTeamLogs.map((log, index) => (
                    <tr key={log.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 border-b border-gray-100`}>
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-800">{log.memberName}</td>
                      <td className="py-3 px-4 text-sm">{getEventBadge(log.event_type)}</td>
                      <td className="py-3 px-4 text-sm max-w-md break-words">
                        {log.details.startsWith('http') ? <a href={log.details} target="_blank" rel="noreferrer" className="text-blue-500">{log.details}</a> : <span className="font-mono bg-gray-200 px-2 rounded">{log.details}</span>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App