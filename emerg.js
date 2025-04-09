import React, { useEffect } from 'react';

const YourComponent = () => {
    useEffect(() => {
        const showEmergencyPopup = () => {
            const userConfirmed = window.confirm("Do you want to use the emergency SOS feature?");
            if (userConfirmed) {
                alert("Emergency services will be contacted.");
            }
        };

        // Attach the event listener to the button
        const emergencyButton = document.getElementById('emergency-btn');
        if (emergencyButton) {
            emergencyButton.addEventListener('click', showEmergencyPopup);
        }

        // Cleanup the event listener on component unmount
        return () => {
            if (emergencyButton) {
                emergencyButton.removeEventListener('click', showEmergencyPopup);
            }
        };
    }, []);

    return (
        <nav className="navbar">
            <div className="nav-content">
                <div className="logo">XPLORARE.</div>
                <div className="nav-links">
                    <a href="#">Home</a>
                    <a href="#">Destinations</a>
                    <a href="#">Activities</a>
                    <a href="#">About</a>
                    <a href="#">Contact</a>
                </div>
                <div className="auth-buttons">
                    <a href="profile.html" className="profile-btn">Profile</a>
                    <a href="settings.html" className="settings-btn">Settings</a>
                </div>
                <button id="emergency-btn" className="emergency-btn">SOS</button>
            </div>
        </nav>
    );
};

export default YourComponent;