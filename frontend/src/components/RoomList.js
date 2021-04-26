/*jshint esversion: 8 */

import '../styles/RoomList.css';
import React, {useState, useRef, useEffect} from 'react';
import {useHistory} from 'react-router-dom';
import Modal from './Modal';
import lockIcon from '../assets/lock.png';
import deleteIcon from '../assets/delete.png';
import PropTypes from 'prop-types';

const graphqlUrl = "https://lrdd-server.herokuapp.com/graphql";

RoomList.propTypes = {
  user: PropTypes.object,
};

function RoomList(props) {
  const history = useHistory();
  const createRoomBtn = useRef();
  const [promptJoinRoom, setPromptJoinRoom] = useState(() => {
    return false;
  });
  const [joinRoomId, setJoinRoomId] = useState(() => {
    return '';
  });
  const [promptCreateRoom, setPromptCreateRoom] = useState(() => {
    return false;
  });
  const [rooms, setRooms] = useState(() => {
    return [];
  });

  function handleCreateRoom() {
    setPromptCreateRoom(true);
  }

  function getRooms(callback, email, filter = 'All') {
    const graphqlUrl = 'https://lrdd-server.herokuapp.com/graphql';

    let query = `query GetRooms($input: GetRoomInput) {
      getRooms(input: $input) {
        roomId
        name
        passProtected
        owned
      }
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
        variables: {
          input: {
            email,
            filter,
          },
        },
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.errors) {
          history.push('/');
          console.log("error", res.errors);
        }
        else callback(res.data.getRooms);
      });
  }

  useEffect(() => {
    getRooms((res) => {
      setRooms(res);
    }, props.user.email);
  }, [props.user]);

  function onRoomClick(e) {
    let roomId = e.target.dataset.roomid;
    let privateRoom = e.target.dataset.private;
    setJoinRoomId(roomId);
    if (privateRoom === 'true') {
      setPromptJoinRoom(true);
    } else {
      history.push('/room?roomId=' + roomId);
    }
  }

  function deleteRoom(callback, roomId) {
    let query = `mutation DeleteRoom($roomId: String) {
      deleteRoom(roomId: $roomId)
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
        variables: {
          roomId,
        },
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.errors) console.log("error", res.errors);
        else callback(res.data.deleteRoom);
      });
  }
  function onDeleteClick(e) {
    let roomId = e.target.dataset.roomid;
    deleteRoom(() => {
      getRooms((res) => {
        setRooms(res);
      }, props.user.email);
    }, roomId);
  }

  function onRefreshClick() {
    getRooms((res) => {
      setRooms(res);
    }, props.user.email);
  }

  function onFilterChange(e) {
    let filter = e.target.value;
    getRooms(
      (res) => {
        setRooms(res);
      },
      props.user.email,
      filter
    );
  }
  return (
    <div
      id="rooms"
      className="d-flex flex-column align-items-center text-center"
    >
      <div
        id="room_list_header"
        className="d-flex flex-row justify-content-between align-items-center rounded"
      >
        <button
          id="create_room_btn"
          ref={createRoomBtn}
          className="btn btn-primary"
          onClick={handleCreateRoom}
        >
          Create Room
        </button>
        <div>Rooms</div>
        <div className="d-flex flex-row justify-content-center align-items-center">
          <div className="refresh_icon" onClick={onRefreshClick}></div>
          <select
            id="filter_menu"
            className="form-select"
            onChange={onFilterChange}
          >
            <option defaultValue="All">All</option>
            <option value="Mine">My Rooms</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>
        </div>
      </div>
      <div className="list_outer d-flex d-row justify-content-center align-items-center">
        <div id="room_list" className="list">
          {rooms.map((room, i) => {
            let lockedIcon = room.passProtected ? lockIcon : '';
            return (
              <div
                key={i}
                className="list-item d-flex d-row justify-content-left align-items-center rounded-pill border-bottom border-secondary"
              >
                <div
                  className="list-clickable d-flex justify-content-left align-items-center"
                  data-roomid={room.roomId}
                  data-private={room.passProtected}
                  onClick={onRoomClick}
                >
                  <div
                    className="list-title"
                    data-roomid={room.roomId}
                    data-private={room.passProtected}
                  >
                    {room.name}
                  </div>
                </div>

                <div className="d-flex flex-row justify-content-center align-items-center">
                  <div
                    className="locked_icon"
                    data-roomid={room.roomId}
                    data-private={room.passProtected}
                    style={{backgroundImage: `url('${lockedIcon}')`}}
                  ></div>
                  {room.owned ? (
                    <div
                      className="delete_icon"
                      data-roomid={room.roomId}
                      style={{backgroundImage: `url('${deleteIcon}')`}}
                      onClick={onDeleteClick}
                    ></div>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        title={'Create Room'}
        component={CreateRoomForm}
        componentProps={{user: props.user}}
        open={promptCreateRoom}
        onClose={() => {
          setPromptCreateRoom(false);
        }}
      />
      <Modal
        title={'Enter Password'}
        component={EnterPasswordForm}
        componentProps={{roomId: joinRoomId}}
        open={promptJoinRoom}
        onClose={() => {
          setPromptJoinRoom(false);
        }}
      />
    </div>
  );
}

CreateRoomForm.propTypes = {
  user: PropTypes.object,
  close: PropTypes.func,
};

function CreateRoomForm(props) {
  const history = useHistory();
  const [roomName, setRoomName] = useState(() => {
    return props.user.name !== '' ? props.user.name + "'s Room" : 'New Room';
  });
  const [roomPassword, setRoomPassword] = useState(() => {
    return '';
  });

  function handleNameChange(e) {
    setRoomName(e.target.value);
  }

  function handlePasswordChange(e) {
    setRoomPassword(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    createRoom(
      (roomId) => {
        history.push('/room?roomId=' + roomId);
      },
      props.user.email,
      roomName,
      roomPassword
    );
    props.close();
  }

  function createRoom(callback, email, name, pass) {
    let query = `mutation CreateRoom($input: RoomInput) {
      createRoom(input: $input)
    }
    `;
    fetch(graphqlUrl, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            email,
            name,
            pass,
          },
        },
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.errors) console.log("error", res.errors);
        else callback(res.data.createRoom);
      });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="roomName">Room Name</label>
        <input
          type="text"
          className="form-control"
          id="roomName"
          placeholder="Room Name"
          value={roomName}
          onChange={handleNameChange}
        />
      </div>
      <div id="room_password" className="form-group">
        <label htmlFor="roomPassword">Password (Optional)</label>
        <input
          type="password"
          className="form-control"
          id="roomPassword"
          placeholder="Password"
          value={roomPassword}
          onChange={handlePasswordChange}
        />
      </div>
      <button id="room_create_btn" type="submit" className="btn btn-primary">
        Submit
      </button>
    </form>
  );
}

EnterPasswordForm.propTypes = {
  close: PropTypes.func,
  roomId: PropTypes.string,
};
function EnterPasswordForm(props) {
  const history = useHistory();

  const [roomPassword, setRoomPassword] = useState(() => {
    return '';
  });
  const invalid = useRef();
  
  function handlePasswordChange(e) {
    setRoomPassword(e.target.value);
    invalid.current.className = "form-control";
  }

  function handleSubmit(e) {
    e.preventDefault();
    joinRoom(
      (res) => {
        if (res === 'Unauthorized') {
          invalid.current.className = "form-control is-invalid";
        } else {
          history.push('/room?roomId=' + props.roomId);
          props.close();
        }
      },
      props.roomId,
      roomPassword
    );
  }

  function joinRoom(callback, roomId, pass) {
    let query = `query JoinRoom($roomId: String, $pass: String) {
        joinRoom(roomId: $roomId, pass: $pass)
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
        variables: {
          roomId,
          pass,
        },
      }),
    })
    .then((res) => res.json())
    .then((res) => {
      if (res.errors) {
        if (res.errors[0].message === 'Unauthorized') {
          callback(res.errors[0].message);
        }
      } else {
        callback(res.data.joinRoom);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="roomPasswordAttempt">Password</label>
        <input
          type="password"
          className="form-control"
          id="roomPasswordAttempt"
          ref={invalid}
          placeholder="Password"
          value={roomPassword}
          onChange={handlePasswordChange}
          required
        />
        <div className="invalid-feedback">Unauthorized</div>
      </div>
      <button id="room_enter_btn" type="submit" className="btn btn-primary">
        Enter
      </button>
    </form>
  );
}

export default RoomList;
