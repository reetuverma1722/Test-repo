import React, { useState } from 'react';
import '../style/landing_page.css';
import { faCoffee, faRocket, faBolt, faWandMagicSparkles, faChartLine, faUsers, faShield, faCode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dialog, DialogContent } from '@mui/material';
import Login from '../Components/login/Login';


const LandingPage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="oask-container">
      <header className="header">
        <div className="header-logo-container">
          <div className="brand-logo">
            <img
              src="/images/Buzly.png"
              alt="Buzly Logo"
              className="buzly-logo"
            />
            <span className="brand-name">uzzly</span>
          </div>
          <h1 className="header-title">Optimize, Achieve, Scale, Keep Growing</h1>
        </div>
        <p>
          Buzzly AI is your intelligent social media automation system that helps teams track, analyze, and automatically repost high-performing content.
        </p>
        <button className="cta-button" onClick={() => setOpen(true)}>
          Get Started with Buzzly
        </button>
      </header>

      {/* Auth Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        sx={{ '& .MuiDialog-paper': { minHeight: '500px' } }}
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '8px',
            boxShadow: '0px 3px 14px rgba(0,0,0,0.2)',
            background: 'white'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Login isPopup={true} />
        </DialogContent>
      </Dialog>

      {/* Methodology Section */}
      <section className="methodology">
        <div className="methodology-header">
          <h2>Our Methodology</h2>
          <p>
            Our AI-powered framework empowers creators, marketers, and teams to grow consistently and efficiently on social media.
          </p>
        </div>

        <div className="methodology-steps">
          {[
            {
              icon: faCoffee,
              title: 'Optimize',
              text: 'Automate content tracking across platforms to identify what resonates with your audience.',
              number: '01'
            },
            {
              icon: faWandMagicSparkles,
              title: 'Achieve',
              text: 'Identify top-performing content using AI and leverage those insights for consistent growth.',
              number: '02'
            },
            {
              icon: faBolt,
              title: 'Scale',
              text: 'Grow your brand with role-based controls and automated content repurposing strategies.',
              number: '03'
            },
            {
              icon: faRocket,
              title: 'Keep Growing',
              text: 'Use real-time analytics and AI insights to continuously refine your content strategy.',
              number: '04'
            },
          ].map(({ icon, title, text, number }) => (
            <div className="methodology-step" key={title}>
              {/* <div className="step-number">{number}</div> */}
              <div className="step-content">
                <div className="step-icon"><FontAwesomeIcon icon={icon} color='#3A7A82' /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Key Features</h2>
        <p>Discover how Buzzly AI can transform your social media strategy</p>
        
        <div className="features-grid">
          {[
            {
              icon: faChartLine,
              title: 'Content Scheduling',
              text: 'Set specific dates and times for posts and reposts.Supports time zone configuration and smart timing suggestions (based on engagement patterns).'
            },
            {
              icon: faUsers,
              title: 'AI-Powered Content Creation',
              text: 'Uses AI to generate captions, hashtags, and visual content.Adapts tone, length, and format for each platform (e.g., Instagram vs. LinkedIn).'
            },
            {
              icon: faShield,
              title: 'Reposting Rules & Frequency Settings',
              text: 'Customize how often and when a post should be reshared.Avoid spamming by using frequency caps and content variation.'
            },
            {
              icon: faCode,
              title: 'Multi-Platform & Multi-Account Publishing',
              text: 'Supports auto-posting to Facebook, Instagram, X (Twitter), LinkedIn, TikTok, Threads, etc.Tailors content formatting to each platform'
            },
          ].map(({ icon, title, text }, index) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon"><FontAwesomeIcon icon={icon} color='#3A7A82' /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2>What Our Clients Say</h2>
        <p>Join thousands of satisfied users who have transformed their social media presence</p>
        
        <div className="testimonials-container">
          {[
            {
              name: 'Sarah Johnson',
              role: 'Marketing Director',
              company: 'TechGrowth Inc.',
              text: 'Buzzly AI has completely transformed how we manage our social media. The analytics are incredibly insightful and the automation features save us hours every week.'
            },
            {
              name: 'Michael Chen',
              role: 'Content Creator',
              company: 'Digital Nomad',
              text: 'As a solo creator, Buzzly gives me the power of a full marketing team. I can focus on creating while the AI handles optimization and scheduling.'
            },
            {
              name: 'Jessica Williams',
              role: 'Social Media Manager',
              company: 'Brand Elevate',
              text: 'The collaborative features make it so easy to work with clients and get approval on content. The analytics reporting has impressed every client we work with.'
            }
          ].map((testimonial, index) => (
            <div className="testimonial-card" key={index}>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-author">
                <strong>{testimonial.name}</strong>
                <span>{testimonial.role}, {testimonial.company}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your Social Media Strategy?</h2>
        <p>Join thousands of brands and creators who are growing their audience with Buzzly AI</p>
        <button className="cta-button" onClick={() => setOpen(true)}>
          Get Started Today
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="footer-logo-container">
              {/* <img src="/images/qss_logo.png" alt="QSS Logo" className="qss-logo-footer" /> */}
              <h3>Buzzly AI</h3>
            </div>
            <p>Optimize, Achieve, Scale, Keep Growing</p>
          </div>
          <div className="footer-links">
            <div className="footer-links-column">
              <h4>Product</h4>
              <ul>
                <li><a href="#">Features</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Integrations</a></li>
                <li><a href="#">API</a></li>
              </ul>
            </div>
            <div className="footer-links-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Support</a></li>
              </ul>
            </div>
            <div className="footer-links-column">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Legal</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Buzzly AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
