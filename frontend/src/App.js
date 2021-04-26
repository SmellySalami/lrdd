/*jshint esversion: 8 */

import './App.css';
import React, {useState} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import Header from './components/Header';
import Title from './components/Title';
import RoomList from './components/RoomList';
import Room from './components/Room';
import Credits from './components/Credits';
import PropTypes from 'prop-types';

const Main = (props) => {
  return (
    <Switch>
      <Route exact path="/" component={Title}></Route>
      <Route exact path="/rooms">
        <RoomList user={props.user} />
      </Route>
      <Route exact path="/room">
        <Room user={props.user} />
      </Route>
      <Route exact path="/credits" component={Credits}></Route>
      <Route exact path="/*">
        <Redirect to="/"></Redirect>
      </Route>
    </Switch>
  );
};

Main.propTypes = {
  user: PropTypes.object,
};

function App() {
  const [user, setUser] = useState(() => {
    return {name: '', email: ''};
  });

  return (
    <React.Fragment>
      <Header
        setUser={setUser}
      />
      <Main user={user} />
    </React.Fragment>
  );
}

export default App;
