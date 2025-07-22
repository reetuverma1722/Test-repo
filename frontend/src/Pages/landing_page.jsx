import React, { useState } from 'react';
import '../style/landing_page.css';
import { faCoffee, faRocket, faBolt, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Login from '../Components/login/Login';


const LandingPage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="oask-container">
      <header className="header">
        <h1>Buzzly AI - Optimize, Achieve, Scale, Keep Growing</h1>
        <p>
          Buzzly AI is your intelligent social media automation system that helps teams track, analyze, and automatically repost high-performing content.
        </p>
        <button className="cta-button" onClick={() => setOpen(true)}>
          Get Started with Buzzly
        </button>
      </header>

      {/* Auth Dialog */}
      <Login open={open} onClose={() => setOpen(false)} />

      {/* Methodology Section */}
      <section className="methodology">
        <h2>Our Methodology</h2>
        <p>
          Our AI-powered framework empowers creators, marketers, and teams to grow consistently and efficiently on social media.
        </p>

        <div className="methodology-grid">
          {[
            { icon: faCoffee, title: 'Optimize', text: 'Automate content tracking across platforms...' },
            { icon: faWandMagicSparkles, title: 'Achieve', text: 'Identify top-performing content using AI...' },
            { icon: faBolt, title: 'Scale', text: 'Grow your brand with role-based controls...' },
            { icon: faRocket, title: 'Keep Growing', text: 'Use real-time analytics and AI insights...' },
          ].map(({ icon, title, text }) => (
            <div className="card" key={title}>
              <div className="icon"><FontAwesomeIcon icon={icon} color='#1976d2' /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
