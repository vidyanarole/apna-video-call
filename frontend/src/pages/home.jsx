import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    const { addToUserHistory } = useContext(AuthContext);

    // Dynamic Google-Meet-style room code generator
    const generateRandomRoomCode = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz";
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        return `${part1}-${part2}-${part3}`;
    };

    const handleCreateMeeting = async () => {
        console.log("[FRONTEND DEBUG] New Meeting button clicked");
        const newCode = generateRandomRoomCode();
        console.log("[FRONTEND DEBUG] Spawning instant meeting code:", newCode);
        
        // Populate local state in case they stay, but navigate immediately
        setMeetingCode(newCode);

        try {
            console.log("[FRONTEND DEBUG] Dispatching addToUserHistory for new instant meeting...");
            await addToUserHistory(newCode);
            console.log("[FRONTEND DEBUG] New meeting successfully saved to history!");
        } catch (error) {
            console.warn(
                "[FRONTEND WARNING] Failed to record call session in history database. " +
                "Proceeding to navigate to call regardless. Details:", 
                error.response?.data || error.message
            );
        }

        console.log(`[FRONTEND DEBUG] Instantly navigating to call room: /${newCode}`);
        navigate(`/${newCode}`);
    };
    
    let handleJoinVideoCall = async () => {
        const cleanCode = (meetingCode || "").trim();
        
        console.log("[FRONTEND DEBUG] handleJoinVideoCall triggered");
        console.log("-> Meeting Code input:", cleanCode);
        console.log("-> Local Session Token:", localStorage.getItem("token"));

        if (!cleanCode) {
            alert("Please enter or generate a valid, non-empty meeting code to join the call.");
            return;
        }

        try {
            console.log("[FRONTEND DEBUG] Dispatching addToUserHistory API request...");
            const response = await addToUserHistory(cleanCode);
            console.log("[FRONTEND DEBUG] API Success:", response?.data || response);
        } catch (error) {
            console.warn(
                "[FRONTEND WARNING] Failed to record call session in history database. " +
                "Proceeding to join video meeting regardless. Error details:", 
                error.response?.data || error.message
            );
        }

        // Navigate to the video call screen under all circumstances
        navigate(`/${cleanCode}`);
    }

    return (
        <>

            <div className="navBar">

                <div style={{ display: "flex", alignItems: "center" }}>

                    <h2>Apna Video Call</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <IconButton onClick={
                        () => {
                            navigate("/history")
                        }
                    }>
                        <RestoreIcon />
                    </IconButton>
                    <p style={{ marginRight: "20px" }}>History</p>

                    <Button onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/auth")
                    }}>
                        Logout
                    </Button>
                </div>


            </div>


            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Providing Quality Video Call Just Like Quality Education</h2>

                        <div style={{ display: 'flex', gap: "10px", alignItems: "center", marginTop: "20px" }}>
                            <Button onClick={handleCreateMeeting} variant='outlined' color='primary' style={{ height: '56px' }}>
                                New Meeting
                            </Button>
                            
                            <TextField 
                                value={meetingCode}
                                onChange={e => setMeetingCode(e.target.value)} 
                                id="outlined-basic" 
                                label="Meeting Code" 
                                variant="outlined" 
                                style={{ flexGrow: 1 }}
                                slotProps={{
                                    input: { style: { color: 'white' } }
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&:hover fieldset': { borderColor: '#ff9839' },
                                        '&.Mui-focused fieldset': { borderColor: '#ff9839' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff9839' },
                                }}
                            />
                            
                            <Button onClick={handleJoinVideoCall} variant='contained' style={{ height: '56px' }}>
                                Join
                            </Button>

                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>
        </>
    )
}


export default withAuth(HomeComponent)