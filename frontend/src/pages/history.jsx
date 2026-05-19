import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import { Card, Box, CardContent, Typography, IconButton, Container, Grid, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import RestoreIcon from '@mui/icons-material/Restore';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (err) {
                console.error("Failed to load user history", err);
            }
        }

        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();

        // Add time as well for extra detail in interview
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");

        return `${day}/${month}/${year} at ${hours}:${minutes}`;
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #131b31 0%, #0a0e1a 100%)', py: 4, color: 'white' }}>
            <Container maxWidth="lg">
                {/* Header Section */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        p: 3, 
                        mb: 4, 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.03)', 
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <RestoreIcon sx={{ color: '#ff9839', fontSize: 32 }} />
                        <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: 'white' }}>
                            Meeting History
                        </Typography>
                    </Box>
                    <IconButton 
                        onClick={() => routeTo("/home")} 
                        sx={{ 
                            color: 'white', 
                            background: 'rgba(255,255,255,0.05)', 
                            '&:hover': { background: '#ff9839', color: 'white' } 
                        }}
                    >
                        <HomeIcon />
                    </IconButton>
                </Paper>

                {/* Grid Lists */}
                {meetings.length !== 0 ? (
                    <Grid container spacing={3}>
                        {meetings.map((meeting, i) => (
                            <Grid item xs={12} sm={6} md={4} key={i}>
                                <Card 
                                    variant="outlined" 
                                    sx={{ 
                                        height: '100%',
                                        background: 'rgba(255,255,255,0.02)', 
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                            borderColor: 'rgba(255,152,57,0.3)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="overline" display="block" sx={{ color: '#ff9839', fontWeight: 'bold', letterSpacing: 1.5 }}>
                                            Meeting Call Logs
                                        </Typography>
                                        <Typography variant="h6" component="h2" sx={{ color: 'white', my: 1, fontWeight: 600 }}>
                                            Code: {meeting.meetingCode}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                            Date: {formatDate(meeting.date)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            No past meetings found. Create or join one to see it here!
                        </Typography>
                    </Box>
                )}
            </Container>
        </Box>
    )
}