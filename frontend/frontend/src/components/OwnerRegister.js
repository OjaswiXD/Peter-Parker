import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './OwnerRegister.css';

function OwnerRegister() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirm_password: '',
    registration_type: '',
    car_slots: '',
    bike_slots: '',
    bike_cost: '',
    car_cost: '',
    full_time: false,
    start_time: '',
    end_time: '',
    full_name: '',
    contact_address: '',
    phone_number: '',
    id_type: '',
    id_number: '',
    photo: null,
    id_document: null
  });
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.step) {
        setStep(location.state.step);
      }
      if (location.state.formData) {
        setFormData(location.state.formData);
      }
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setMessage('Passwords do not match');
      return;
    }
    const data = new FormData();
    data.append('first_name', formData.full_name);
    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('role', 'landowner');
    data.append('registration_type', formData.registration_type);
    data.append('car_slots', formData.car_slots);
    data.append('bike_slots', formData.bike_slots);
    data.append('bike_cost', formData.bike_cost);
    data.append('car_cost', formData.car_cost);
    data.append('full_time', formData.full_time);
    data.append('start_time', formData.start_time);
    data.append('end_time', formData.end_time);
    data.append('full_name', formData.full_name);
    data.append('contact_address', formData.contact_address);
    data.append('phone_number', formData.phone_number);
    data.append('id_type', formData.id_type);
    data.append('id_number', formData.id_number);
    if (formData.photo) data.append('photo', formData.photo);
    if (formData.id_document) data.append('id_document', formData.id_document);

    try {
      const response = await axios.post('http://localhost:5000/api/register', data);
      setMessage(response.data.message);
      setStep(4);
    } catch (error) {
      setMessage(error.response.data.message);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div
      className="wrapper"
      style={{
        background: `url('http://localhost:3000/Web.png') no-repeat center center fixed`,
        backgroundSize: 'cover'
      }}
    >
      <div className="header">
        <ul>
          <li className={step === 1 ? 'active form_1_progressbar' : 'form_1_progressbar'}>
            <div><p>1</p></div>
          </li>
          <li className={step === 2 ? 'active form_2_progressbar' : 'form_2_progressbar'}>
            <div><p>2</p></div>
          </li>
          <li className={step === 3 ? 'active form_3_progressbar' : 'form_3_progressbar'}>
            <div><p>3</p></div>
          </li>
        </ul>
      </div>
      <div className="form_wrap">
        {step === 1 && (
          <div className="form_1 data_info">
            <h2>Personal Info</h2>
            <form>
              <div className="form_container">
                <div className="input_wrap">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    name="username"
                    className="input"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="confirm_password">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    className="input"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </form>
          </div>
        )}
        {step === 2 && (
          <div className="form_2 data_info">
            <h2>Parking Information</h2>
            <form>
              <div className="form_container">
                <div className="input_wrap">
                  <label htmlFor="registration_type">Registration Type</label>
                  <select
                    name="registration_type"
                    className="select"
                    value={formData.registration_type}
                    onChange={handleChange}
                    required
                  >
                    <option disabled value="">Select Your Registration Type:</option>
                    <option>Person</option>
                    <option>Organization</option>
                  </select>
                </div>
                <div className="input_wrap">
                  <label htmlFor="car_slots">Available Car Slots:</label>
                  <input
                    type="number"
                    name="car_slots"
                    className="input"
                    value={formData.car_slots}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="bike_slots">Available Bike Slots:</label>
                  <input
                    type="number"
                    name="bike_slots"
                    className="input"
                    value={formData.bike_slots}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="bike_cost">Hourly Bike Parking Cost</label>
                  <input
                    type="number"
                    name="bike_cost"
                    className="input"
                    value={formData.bike_cost}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="car_cost">Hourly Car Parking Cost</label>
                  <input
                    type="number"
                    name="car_cost"
                    className="input"
                    value={formData.car_cost}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap same_line">
                  <input
                    type="checkbox"
                    id="fullTime"
                    name="full_time"
                    checked={formData.full_time}
                    onChange={handleChange}
                  />
                  <label htmlFor="fullTime">24 Hour availability</label>
                </div>
                {!formData.full_time && (
                  <>
                    <div className="input_wrap">
                      <label htmlFor="start_time">Start Time</label>
                      <input
                        type="time"
                        name="start_time"
                        className="input"
                        value={formData.start_time}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="input_wrap">
                      <label htmlFor="end_time">End Time</label>
                      <input
                        type="time"
                        name="end_time"
                        className="input"
                        value={formData.end_time}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        )}
        {step === 3 && (
          <div className="form_3 data_info">
            <h2>Owner's KYC</h2>
            <form onSubmit={handleSubmit}>
              <div className="form_container">
                <div className="input_wrap">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    className="input"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="contact_address">Contact Address</label>
                  <input
                    type="text"
                    name="contact_address"
                    className="input"
                    value={formData.contact_address}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    className="input"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="id_type">Identification Type</label>
                  <select
                    name="id_type"
                    className="select"
                    value={formData.id_type}
                    onChange={handleChange}
                    required
                  >
                    <option disabled value="">Select Your Id Type:</option>
                    <option>Citizenship</option>
                    <option>Passport</option>
                    <option>National ID</option>
                    <option>Driving licence</option>
                  </select>
                </div>
                <div className="input_wrap">
                  <label htmlFor="id_number">Identification Number</label>
                  <input
                    type="text"
                    name="id_number"
                    className="input"
                    value={formData.id_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="photo">Upload Photo</label>
                  <input
                    type="file"
                    name="photo"
                    className="input"
                    onChange={handleChange}
                    accept="image/*"
                    required
                  />
                </div>
                <div className="input_wrap">
                  <label htmlFor="id_document">Upload ID Document</label>
                  <input
                    type="file"
                    name="id_document"
                    className="input"
                    onChange={handleChange}
                    accept="image/*,application/pdf"
                    required
                  />
                </div>
                <div className="input_wrap same_line">
                  <input type="checkbox" name="terms" required />
                  <label>
                    I agree to the{' '}
                    <Link
                      to="/terms"
                      className="link-button"
                      state={{ step: 3, formData }}
                    >
                      terms and conditions
                    </Link>.
                  </label>
                </div>
                <div className="input_wrap same_line">
                  <input type="checkbox" name="privacy" required />
                  <label>
                    I agree to the{' '}
                    <Link
                      to="/privacy"
                      className="link-button"
                      state={{ step: 3, formData }}
                    >
                      privacy policy
                    </Link>.
                  </label>
                </div>
              </div>
            </form>
          </div>
        )}
        {step === 4 && (
          <div className="success_wrap">
            <p>{message || 'You have successfully completed the process.'}</p>
            <a href="/login">Proceed to Login</a>
          </div>
        )}
      </div>
      <div className="btns_wrap">
        {step === 1 && (
          <div className="common_btns form_1_btns">
            <button type="button" className="btn_next" onClick={nextStep}>
              Next <span className="icon">→</span>
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="common_btns form_2_btns">
            <button type="button" className="btn_back" onClick={prevStep}>
              <span className="icon">←</span> Back
            </button>
            <button type="button" className="btn_next" onClick={nextStep}>
              Next <span className="icon">→</span>
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="common_btns form_3_btns">
            <button type="button" className="btn_back" onClick={prevStep}>
              <span className="icon">←</span> Back
            </button>
            <button type="submit" className="btn_done" onClick={handleSubmit}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerRegister;