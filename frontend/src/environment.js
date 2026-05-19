// Dynamic environment variable configuration
const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }

    // Automatically detect local development host vs production deployment host
    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.");

    return isLocalhost
        ? "http://localhost:8000"
        : "https://apna-video-call-2-qwqd.onrender.com"; // Your production Render backend URL
};

const server = getBackendUrl();

export default server;