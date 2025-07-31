import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Terms.css';

function Terms() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Go back to registration form, Step 3, with form data
    navigate('/register/landowner', {
      state: { step: 3, formData: location.state?.formData }
    });
  };

  return (
    <div className="terms-container">
      <div className="terms-content">
        <h2>Terms and Conditions</h2>
        <p>
          Welcome to Peter Parker Parking! By using our app, you agree to follow these rules:
        </p>
        <ul>
          <li>Give us correct information when signing up.</li>
          <li>Use parking spaces nicely and follow local laws.</li>
          <li>Don’t share your account with others.</li>
          <li>Contact us if you have any problems.</li>
        </ul>
        <p>We might change these rules later, so check back sometimes!</p>
        <button onClick={handleBack} className="back-link">
          Back to Registration
        </button>
      </div>
    </div>
  );
}

export default Terms;