/*jshint esversion: 8 */

/*
  Credits to 'Add Google Login to your React Apps in 10 mins'
    https://dev.to/sivaneshs/add-google-login-to-your-react-apps-in-10-mins-4del
*/

import '../styles/Header.css';
import React, {useState} from 'react';
import {GoogleLogin, GoogleLogout} from 'react-google-login';
import PropTypes from 'prop-types';

const clientId =
  '683927652347-m8b26iskkk51ntcefrluuq6v6675ui6u.apps.googleusercontent.com';

const graphqlUrl = "https://lrdd-server.herokuapp.com/graphql";

Header.propTypes = {
  setUser: PropTypes.func,
};

function Header(props) {
  const [titleLink, setTitleLink] = useState(() => {
    return '/';
  });

  return (
    <header id="header">
      <div className="d-flex flex-row justify-content-between text-center h-100">
        <div className="d-flex flex-row align-items-center">
          <div id="logo" className="logo_icon"></div>
          <a href={titleLink} id="title">
            La Room de Discode
          </a>
        </div>

        <div id="signin" className="d-flex flex-row align-items-center">
          <Login
            setTitleLink={setTitleLink}
            setUser={props.setUser}
          />
        </div>
      </div>
    </header>
  );
}

Login.propTypes = {
  setUser: PropTypes.func,
  setTitleLink: PropTypes.func,
};
function Login(props) {
  const [loginValue, setLoginValue] = useState(() => {
    return false;
  });

  const refreshTokenSetup = (res) => {
    let refreshTiming = (res.tokenObj.expires_in || 3600 - 5 * 60) * 1000;
    const refreshToken = async () => {
      const newAuthRes = await res.reloadAuthResponse();
      refreshTiming = (newAuthRes.expires_in || 3600 - 5 * 60) * 1000;
      setTimeout(refreshToken, refreshTiming);
    };
    setTimeout(refreshToken, refreshTiming);
  };

  // When google authentication is sucessful, 
  const onLoginSuccess = (res) => {
    let googleRes = res;
    let tokenId = res.tokenId;
    let name = res.profileObj.name;
    let email = res.profileObj.email;
 
    // send the token to the backend
    let query = `query signIn($tokenId: String) {
      signIn(tokenId: $tokenId)
    }`;
    fetch(graphqlUrl, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'GoogleAuth': tokenId,
      },
      body: JSON.stringify({
        query: query,
        variables: {tokenId: tokenId,},
      }),
    })
    .then((res)=> res.json())
    .then((res) => {
      if (res.errors){
        console.log("error", res.errors);
      } else {
        refreshTokenSetup(googleRes);
        setLoginValue(true);
        props.setUser({name: name, email: email});
        props.setTitleLink('/rooms');
        if (window.location.pathname === '/') {
          window.location.pathname = '/rooms';
        }
      }
    });
  };

  const onFailure = () => {
    // console.log('Login Failure', res);
  };

  const signOut = (callback) => {
    let query = `query {
      signOut
    }`;
    fetch(graphqlUrl, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    })
    .then((res) => res.json())
    .then((res) => {
      if (res.errors) console.log("error", res.errors);
      else callback(res.data.signOut)
    });
  };

  const onLogoutSuccess = () => {
    signOut((res) => {
      console.log(res);
    });
    setLoginValue(false);
    window.location.pathname = '/';
  };

  return (
    <div>
      {loginValue ? (
        <GoogleLogout
          clientId={clientId}
          buttonText="Sign out"
          onLogoutSuccess={onLogoutSuccess}
        />
      ) : (
        <GoogleLogin
          clientId={clientId}
          buttonText="Sign in"
          onSuccess={onLoginSuccess}
          onFailure={onFailure}
          isSignedIn={true}
        />
      )}
    </div>
  );
}

export default Header;
