/*jshint esversion: 8 */

import '../styles/Title.css';
import React from 'react';
import {Link} from 'react-router-dom';
import titleBgVideo from '../assets/title-bg.mp4';
import FadeIn from 'react-fade-in';

/*
  Credits to 'Add Google Login to your React Apps in 10 mins'
    https://dev.to/sivaneshs/add-google-login-to-your-react-apps-in-10-mins-4del
*/

function Title() {
  return (
    // Video Background Credits: https://bootstrapious.com/p/fullscreen-video-background
    <div className="video-background-holder">
      <div className="video-background-overlay"></div>
      <video
        playsInline="playsinline"
        autoPlay="autoplay"
        muted="muted"
        loop="loop"
      >
        <source src={titleBgVideo} type="video/mp4" />
      </video>
      <div className="video-background-content container">
        <div className="d-flex flex-column justify-content-end align-items-center text-center h-50">
          <div id="title_content" className="">
            <FadeIn delay={250}>
              <h1>La Room de Discode</h1>
              <p>
                A collaborative videotelephony editor for solving coding
                problems
              </p>
            </FadeIn>
          </div>
        </div>
        <div className="d-flex flex-column justify-content-end align-items-center text-center h-50">
          <Link to="/credits">
            <button id="credits_btn" className="btn btn-info">
              Credits 
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Title;
