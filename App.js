import React, { useState, useEffect } from 'react';


// Utility function to get data from local storage
const getLocalStorageItem = (key, defaultValue) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error("Error parsing localStorage item:", key, error);
        return defaultValue;
    }
};

// Utility function to set data to local storage
const setLocalStorageItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("Error setting localStorage item:", key, error);
    }
};

// Main App component for the Leave Approval System
function App() {
    const [currentUser, setCurrentUser] = useState(getLocalStorageItem('currentUser', null));
    const [users, setUsers] = useState(getLocalStorageItem('users', []));
    const [leaves, setLeaves] = useState(getLocalStorageItem('leaves', []));

    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authRole, setAuthRole] = useState('student');
    const [isRegistering, setIsRegistering] = useState(false);

    const [reason, setReason] = useState('sick');
    const [otherReason, setOtherReason] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [numberOfDays, setNumberOfDays] = useState(0);
    const [teacherToApprove, setTeacherToApprove] = useState('');

    const teachers = users.filter(user => user.role === 'teacher').map(user => user.username);

    // --- Persistence with localStorage ---
    useEffect(() => {
        setLocalStorageItem('currentUser', currentUser);
    }, [currentUser]);

    useEffect(() => {
        setLocalStorageItem('users', users);
    }, [users]);

    useEffect(() => {
        setLocalStorageItem('leaves', leaves);
    }, [leaves]);

    // --- Calculate Leave Days ---
    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setNumberOfDays(diffDays > 0 ? diffDays : 0);
        } else {
            setNumberOfDays(0);
        }
    }, [startDate, endDate]);

    // --- Authentication Logic ---
    const handleRegister = () => {
        if (!authUsername || !authPassword || !authRole) {
            showMessageBox('Registration Error', 'Please enter username, password, and select a role.');
            return;
        }

        if (users.some(user => user.username.toLowerCase() === authUsername.toLowerCase())) {
            showMessageBox('Registration Error', 'Username already exists. Please choose a different one.');
            return;
        }

        const newUser = { username: authUsername, password: authPassword, role: authRole };
        setUsers([...users, newUser]);
        showMessageBox('Success', `User "${authUsername}" registered as a ${authRole}. You can now log in.`);
        setAuthUsername('');
        setAuthPassword('');
        setAuthRole('student');
        setIsRegistering(false);
    };

    const handleLogin = () => {
        if (!authUsername || !authPassword) {
            showMessageBox('Login Error', 'Please enter both username and password.');
            return;
        }

        const foundUser = users.find(
            user => user.username.toLowerCase() === authUsername.toLowerCase() && user.password === authPassword
        );

        if (foundUser) {
            setCurrentUser(foundUser);
            showMessageBox('Success', `Logged in as ${foundUser.username} (${foundUser.role}).`);
            setAuthUsername('');
            setAuthPassword('');
        } else {
            showMessageBox('Login Error', 'Invalid username or password.');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setReason('sick');
        setOtherReason('');
        setStartDate('');
        setEndDate('');
        setNumberOfDays(0);
        setTeacherToApprove('');
        showMessageBox('Logged Out', 'You have been successfully logged out.');
    };

    // --- Leave Management Logic ---
    const requestLeave = () => {
        const finalReason = reason === 'other' ? otherReason.trim() : reason;

        if (!finalReason || !startDate || !endDate || (currentUser.role === 'student' && !teacherToApprove)) {
            showMessageBox('Leave Request Error', 'Please fill in all required leave request fields.');
            return;
        }
        if (reason === 'other' && !otherReason.trim()) {
            showMessageBox('Leave Request Error', 'Please specify the "Other Reason".');
            return;
        }
        if (numberOfDays <= 0) {
            showMessageBox('Leave Request Error', 'End date must be on or after the start date.');
            return;
        }

        const newLeaveId = Date.now().toString();

        const newLeave = {
            id: newLeaveId,
            userName: currentUser.username,
            userRole: currentUser.role,
            reason: finalReason,
            startDate: startDate,
            endDate: endDate,
            numberOfDays: numberOfDays,
            status: 'Pending',
            teacherApproved: currentUser.role === 'teacher' ? true : false,
            adminApproved: false,
            requestedToTeacher: currentUser.role === 'student' ? teacherToApprove : null,
        };

        setLeaves([...leaves, newLeave]);

        setReason('sick');
        setOtherReason('');
        setStartDate('');
        setEndDate('');
        setNumberOfDays(0);
        setTeacherToApprove('');
        showMessageBox('Success', 'Leave request submitted successfully!');
    };

    const updateLeaveStatus = (leaveId, action, approverRole) => {
        setLeaves(prevLeaves =>
            prevLeaves.map(leave => {
                if (leave.id === leaveId) {
                    let updatedLeave = { ...leave };

                    if (approverRole === 'teacher') {
                        updatedLeave.teacherApproved = action === 'approve';
                        if (action === 'approve') {
                            updatedLeave.status = 'Approved by Teacher';
                        } else {
                            updatedLeave.status = 'Rejected by Teacher';
                            updatedLeave.adminApproved = false;
                        }
                    } else if (approverRole === 'admin') {
                        updatedLeave.adminApproved = action === 'approve';
                        if (action === 'approve') {
                            updatedLeave.status = 'Approved by Admin';
                        } else {
                            updatedLeave.status = 'Rejected by Admin';
                        }
                    }
                    return updatedLeave;
                }
                return leave;
            })
        );
        showMessageBox('Status Updated', `Leave request ${action === 'approve' ? 'approved' : 'rejected'}.`);
    };

    // --- Custom Message Box Logic (instead of alert) ---
    const [messageBox, setMessageBox] = useState({ visible: false, title: '', message: '' });

    const showMessageBox = (title, message) => {
        setMessageBox({ visible: true, title, message });
    };

    const hideMessageBox = () => {
        setMessageBox({ visible: false, title: '', message: '' });
    };

    // --- UI Rendering ---

    return (
        // Added immersive ID for potential external styling targeting
        <div id="leave-app-improved-css" className="min-h-screen bg-gray-100 font-sans antialiased text-gray-800">
            {/* Tailwind CSS CDN and Google Fonts for Inter */}
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulseBlue {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
                .animate-slideInUp { animation: slideInUp 0.6s ease-out; }
                .animate-pulse-blue { animation: pulseBlue 2s infinite; }

                /* Custom scrollbar for better aesthetics */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                `}
            </style>

            {/* Login/Registration Section */}
            {!currentUser && (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 p-4 animate-fadeIn">
                    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-500 ease-in-out scale-95 hover:scale-100 ring-4 ring-blue-300 ring-opacity-50">
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-center text-gray-900 mb-6 tracking-tight">
                            {isRegistering ? 'Sign Up' : 'Welcome Back'}
                        </h2>
                        <p className="text-center text-gray-600 text-lg sm:text-xl mb-8">
                            {isRegistering
                                ? 'Create your account to manage leaves.'
                                : 'Log in to your Leave Portal.'
                            }
                        </p>
                        <div className="mb-5">
                            <label htmlFor="authUsername" className="block text-gray-700 font-semibold mb-2 text-sm">Username:</label>
                            <input
                                type="text"
                                id="authUsername"
                                placeholder="Enter username"
                                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition duration-300 text-lg"
                                value={authUsername}
                                onChange={(e) => setAuthUsername(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') { isRegistering ? handleRegister() : handleLogin(); } }}
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="authPassword" className="block text-gray-700 font-semibold mb-2 text-sm">Password:</label>
                            <input
                                type="password"
                                id="authPassword"
                                placeholder="Enter password"
                                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition duration-300 text-lg"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') { isRegistering ? handleRegister() : handleLogin(); } }}
                            />
                        </div>
                        {isRegistering && (
                            <div className="mb-8">
                                <label htmlFor="authRole" className="block text-gray-700 font-semibold mb-2 text-sm">Select Role:</label>
                                <select
                                    id="authRole"
                                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition duration-300 text-lg"
                                    value={authRole}
                                    onChange={(e) => setAuthRole(e.target.value)}
                                >
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        )}
                        <button
                            onClick={isRegistering ? handleRegister : handleLogin}
                            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-75 transition duration-300 transform hover:-translate-y-1 animate-pulse-blue"
                        >
                            {isRegistering ? 'Register Account' : 'Log In'}
                        </button>
                        <button
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setAuthUsername('');
                                setAuthPassword('');
                            }}
                            className="w-full text-blue-700 font-semibold py-3 mt-4 rounded-xl hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300"
                        >
                            {isRegistering ? 'Already have an account? Login' : 'New user? Register'}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Dashboard Section */}
            {currentUser && (
                <div className="min-h-screen flex flex-col">
                    {/* Header */}
                    <header className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white p-6 md:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-center rounded-b-3xl">
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 sm:mb-0">Leave Portal</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-xl font-medium">Welcome, <span className="font-semibold">{currentUser.username} (<span className="capitalize">{currentUser.role}</span>)</span></span>
                            <button
                                onClick={handleLogout}
                                className="bg-white text-blue-700 font-semibold px-5 py-2 rounded-full shadow-md hover:bg-gray-100 transition duration-300 transform hover:scale-105"
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    <main className="p-6 md:p-10 flex-grow">
                        {/* Leave Request Form (Visible to Student and Teacher) */}
                        {(currentUser.role === 'student' || currentUser.role === 'teacher') && (
                            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10 border border-blue-100 animate-slideInUp">
                                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-200 pb-3">Request New Leave</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label htmlFor="reasonSelect" className="block text-gray-700 font-semibold mb-2">Reason:</label>
                                        <select
                                            id="reasonSelect"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        >
                                            <option value="sick">Sick Leave</option>
                                            <option value="casual">Casual Leave</option>
                                            <option value="vacation">Vacation</option>
                                            <option value="other">Other Reason</option>
                                        </select>
                                    </div>
                                    {reason === 'other' && (
                                        <div>
                                            <label htmlFor="otherReason" className="block text-gray-700 font-semibold mb-2">Specify Other Reason:</label>
                                            <input
                                                type="text"
                                                id="otherReason"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                                value={otherReason}
                                                onChange={(e) => setOtherReason(e.target.value)}
                                                placeholder="e.g., Family emergency, Conference"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="startDate" className="block text-gray-700 font-semibold mb-2">Start Date:</label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="endDate" className="block text-gray-700 font-semibold mb-2">End Date:</label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 lg:col-span-1">
                                        <label className="block text-gray-700 font-semibold mb-2">Number of Days:</label>
                                        <p className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium text-lg">
                                            {numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}
                                        </p>
                                    </div>
                                    {currentUser.role === 'student' && (
                                        <div>
                                            <label htmlFor="teacherToApprove" className="block text-gray-700 font-semibold mb-2">
                                                Request Approval From Teacher:
                                            </label>
                                            <select
                                                id="teacherToApprove"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                                                value={teacherToApprove}
                                                onChange={(e) => setTeacherToApprove(e.target.value)}
                                            >
                                                <option value="">Select Teacher</option>
                                                {teachers.map((t, index) => (
                                                    <option key={index} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={requestLeave}
                                    className="mt-8 bg-green-600 text-white font-bold px-8 py-3 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-105"
                                >
                                    Submit Leave Request
                                </button>
                            </section>
                        )}

                        {/* My Leave Requests (Visible to Student and Teacher) */}
                        {(currentUser.role === 'student' || currentUser.role === 'teacher') && (
                            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10 border border-blue-100 animate-slideInUp">
                                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-200 pb-3">My Leave Requests</h2>
                                {leaves.filter(l => l.userName === currentUser.username).length === 0 ? (
                                    <p className="text-gray-600 italic">You have no leave requests yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                                            <thead className="bg-blue-50 border-b border-blue-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Dates</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Days</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Status</th>
                                                    {currentUser.role === 'student' && (
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Teacher Approval</th>
                                                    )}
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Admin Approval</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {leaves
                                                    .filter(l => l.userName === currentUser.username)
                                                    .map(leave => (
                                                        <tr key={leave.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{leave.reason}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.startDate} to {leave.endDate}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.numberOfDays}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                                    ${leave.status.includes('Pending') ? 'bg-yellow-100 text-yellow-800' : ''}
                                                                    ${leave.status.includes('Approved by Teacher') ? 'bg-indigo-100 text-indigo-800' : ''}
                                                                    ${leave.status.includes('Approved by Admin') ? 'bg-green-100 text-green-800' : ''}
                                                                    ${leave.status.includes('Rejected') ? 'bg-red-100 text-red-800' : ''}
                                                                `}>
                                                                    {leave.status}
                                                                </span>
                                                            </td>
                                                            {currentUser.role === 'student' && (
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                    {leave.teacherApproved ? <span className="text-green-600 font-semibold">Approved</span> : <span className="text-red-600 font-semibold">Pending/Rejected</span>}
                                                                    {leave.requestedToTeacher && ` (${leave.requestedToTeacher})`}
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {leave.adminApproved ? <span className="text-green-600 font-semibold">Approved</span> : <span className="text-red-600 font-semibold">Pending/Rejected</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Leaves for Teacher Approval (Visible to Teacher) */}
                        {currentUser.role === 'teacher' && (
                            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10 border border-blue-100 animate-slideInUp">
                                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-200 pb-3">Student Leaves for My Approval</h2>
                                {leaves.filter(l => l.userRole === 'student' && l.status.includes('Pending') && l.requestedToTeacher === currentUser.username).length === 0 ? (
                                    <p className="text-gray-600 italic">No student leaves pending your approval.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                                            <thead className="bg-blue-50 border-b border-blue-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Student</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Days</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Dates</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {leaves
                                                    .filter(l => l.userRole === 'student' && l.status.includes('Pending') && l.requestedToTeacher === currentUser.username)
                                                    .map(leave => (
                                                        <tr key={leave.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.userName}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{leave.reason}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.numberOfDays}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.startDate} to {leave.endDate}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <button
                                                                    onClick={() => updateLeaveStatus(leave.id, 'approve', 'teacher')}
                                                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 mr-2 transition duration-200 text-sm"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => updateLeaveStatus(leave.id, 'reject', 'teacher')}
                                                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-200 text-sm"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Leaves for Admin Approval (Visible to Admin) */}
                        {currentUser.role === 'admin' && (
                            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10 border border-blue-100 animate-slideInUp">
                                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-200 pb-3">Leaves for Admin Approval</h2>
                                {leaves.filter(l => l.status.includes('Approved by Teacher') || (l.userRole === 'teacher' && l.status.includes('Pending'))).length === 0 ? (
                                    <p className="text-gray-600 italic">No leaves pending admin approval.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                                            <thead className="bg-blue-50 border-b border-blue-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">User</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Role</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Days</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Dates</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Teacher Approval</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {leaves
                                                    .filter(l => l.status.includes('Approved by Teacher') || (l.userRole === 'teacher' && l.status.includes('Pending')))
                                                    .map(leave => (
                                                        <tr key={leave.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.userName}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{leave.userRole}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{leave.reason}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.numberOfDays}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{leave.startDate} to {leave.endDate}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {leave.userRole === 'student' ? (leave.teacherApproved ? <span className="text-green-600 font-semibold">Approved ({leave.requestedToTeacher})</span> : <span className="text-red-600 font-semibold">Pending/Rejected</span>) : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <button
                                                                    onClick={() => updateLeaveStatus(leave.id, 'approve', 'admin')}
                                                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 mr-2 transition duration-200 text-sm"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => updateLeaveStatus(leave.id, 'reject', 'admin')}
                                                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-200 text-sm"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>
            )}

            {/* Custom Message Box */}
            {messageBox.visible && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white p-8 rounded-2xl shadow-3xl max-w-sm w-full text-center transform scale-95 animate-slideInUp border-t-4 border-blue-500">
                        <h3 className="text-3xl font-bold mb-4 text-gray-900">{messageBox.title}</h3>
                        <p className="text-gray-700 mb-6 text-lg">{messageBox.message}</p>
                        <button
                            onClick={hideMessageBox}
                            className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-105"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;