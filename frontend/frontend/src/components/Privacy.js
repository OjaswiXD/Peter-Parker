import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Privacy.css';

function Privacy() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Go back to registration form, Step 3, with form data
    navigate('/register/landowner', {
      state: { step: 3, formData: location.state?.formData }
    });
  };

  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <h2>Privacy Policy</h2>
        <p>
          At Peter Parker Parking, we care about your privacy. Here’s what we do:
        </p>
        <ul>
          <li>We only collect info we need, like your name and email.</li>
          <li>We use your info to make the app better and book parking.</li>
          <li>We don’t share your info unless you say it’s okay or it’s required by law.</li>
          <li>We keep your info safe with strong security.</li>
        </ul>
        <p>Contact us if you have questions about your privacy!</p>
        <button onClick={handleBack} className="back-link">
          Back to Registration
        </button>
      </div>
    </div>
  );
}

export default Privacy;