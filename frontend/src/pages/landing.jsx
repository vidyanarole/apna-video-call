import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "../App.css";

// Dynamic Google-Meet-style room code generator
const generateRandomRoomCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let part1 = "";
    let part2 = "";
    let part3 = "";
    for (let i = 0; i < 3; i++) {
        part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 4; i++) {
        part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 3; i++) {
        part3 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${part1}-${part2}-${part3}`;
};

export default function LandingPage() {
    const router = useNavigate();

    const handleGuestJoin = () => {
        const randomCode = generateRandomRoomCode();
        router(`/${randomCode}`);
    };

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>
                <div className='navlist'>
                    <p onClick={handleGuestJoin} className="navLink">Join as Guest</p>
                    <p onClick={() => router("/auth")} className="navLink">Register</p>
                    <div onClick={() => router("/auth")} role='button' className="navLoginBtn">
                        <p style={{ margin: 0 }}>Login</p>
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="heroTextSection">
                    <h1>
                        <span style={{ color: "#FF9839", fontWeight: 'bold' }}>Connect</span> with your loved ones
                    </h1>
                    <p className="subHeroText">
                        Bridge the physical gaps with Apna Video Call. Enjoy high-quality, zero-latency WebRTC video and screen sharing with a single click.
                    </p>
                    <div role='button' className="getStartedBtn">
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div className="heroImageSection">
                    <img src="/mobile.png" alt="Apna Video Call Demo Mockup" className="heroMockup" />
                </div>
            </div>
        </div>
    );
}