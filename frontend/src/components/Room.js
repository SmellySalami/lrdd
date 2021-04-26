/*jshint esversion: 8 */
/*
  Credits for room creation and video connection: How To Create A Video Chat App With WebRTC
    (https://www.youtube.com/watch?v=DvlyzDZDEq4&ab_channel=WebDevSimplified)
*/

import '../styles/Room.css';

import React, {useEffect, useRef, useState} from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/ext-language_tools';
import Peer from 'peerjs';
import io from 'socket.io-client';
import micIcon from '../assets/mic.png';
import micMutedIcon from '../assets/mic_muted.png';
import videoIcon from '../assets/video.png';
import videoDisabledIcon from '../assets/video_disabled.png';
import PropTypes from 'prop-types';

const graphqlUrl = 'https://lrdd-server.herokuapp.com/graphql';

Room.propTypes = {
  user: PropTypes.object,
};

function Room(props) {
  const [micBtnIcon, setMicBtnIcon] = useState(() => {
    return micMutedIcon;
  });
  const [videoBtnIcon, setVideoBtnIcon] = useState(() => {
    return videoDisabledIcon;
  });
  const [editorContent, setEditorContent] = useState(() => {
    return '';
  });
  const [messages, setMessages] = useState(() => {
    return {
      type: 'messages',
      list: [],
    };
  });
  const [shellContent, setShellContent] = useState(() => {
    return '';
  });

  const socket = useRef(initSocket());
  const peer = useRef(initPeer());
  const [myStream, setStream] = useState();
  const roomId = useRef(initRoomId());
  const connections = useRef([]);
  const [myId, setMyId] = useState(() => {
    return '';
  });

  const videoContainer = useRef();
  const messagesView = useRef();

  function initSocket() {
    return io('https://lrdd-server.herokuapp.com', {transports: ['websocket']});
  }

  function initPeer() {
    return new Peer({});
  }

  function initRoomId() {
    let params = new URL(document.location).searchParams;
    return params.get('roomId');
  }

  function initStream() {
    let getUserMedia = navigator.mediaDevices.getUserMedia;
    getUserMedia({video: true, audio: true})
      .then(function (stream) {
        setStream(stream);
      })
      .catch(function (err) {
        console.log(err);
      });
  }

  function getRoomContent(callback, roomId) {
    let query = `query GetRoomContent($roomId: String) {
      getRoomContent(roomId: $roomId) {
        editorContent
        messages {
          senderName
          content
        }
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
          roomId,
        },
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.errors) {
          console.log("error", res.errors);
          window.location.pathname = '/';
        }
        else callback(res.data.getRoomContent);
      });
  }

  function setRoomContent(callback, roomId, editorContent, messages) {
    let query = `mutation SetRoomContent($input: RoomContentInput) {
      setRoomContent(input: $input)
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
            roomId,
            editorContent,
            messages,
          },
        },
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.errors) console.log("error", res.errors);
        else callback(res.data.setRoomContent);
      });
  }

  let Connection = function (userId, conn) {
    this.userId = userId;
    this.conn = conn;
  };

  useEffect(() => {

    if (myStream && myId) {
      addVideoStream(myId, myStream);
      muteMic();
      disableVideo();
    }

    if (!myStream) {
      initStream();
    } else {
      peer.current.on('call', function (call) {
        call.answer(myStream);

        call.on('stream', function (remoteStream) {
          addVideoStream(call.peer, remoteStream);
        });
      });

      socket.current.on('user-connected', function (newUserId) {
        let call = peer.current.call(newUserId, myStream);
        call.on('stream', function (remoteStream) {
          addVideoStream(newUserId, remoteStream);
        });

        let conn;
        let existingConn = connections.current.find(
          (c) => c.userId === newUserId
        );
        if (!existingConn) {
          conn = peer.current.connect(newUserId);
          connections.current.push(new Connection(newUserId, conn));
        } else {
          conn = existingConn.conn;
        }

        conn.on('open', function () {
          conn.on('data', function (data) {
            if (data.type === 'messages') {
              setMessages(data);
            } else if (data.type === 'editor') {
              setEditorContent(data.content);
            } else {
              setShellContent(data.content);
            }
          });
        });
      });
    }
  }, [myStream, myId]);

  useEffect(() => {
    peer.current.on('error', function (err) {
      // console.log('Error:', err);
    });

    peer.current.on('open', function (userId) {
      setMyId(userId);
      socket.current.emit('join-room', roomId.current, userId);

      getRoomContent((res) => {
        setEditorContent(res.editorContent);
        setMessages(new MessageList(res.messages));
      }, roomId.current);

    });

    peer.current.on('connection', function (conn) {
      let existingConn = connections.current.find(
        (c) => c.userId === conn.peer
      );
      if (!existingConn) {
        connections.current.push(new Connection(conn.peer, conn));
      } else {
        conn = existingConn.conn;
      }

      conn.on('open', function () {
        conn.on('data', function (data) {
          if (data.type === 'messages') {
            setMessages(data);
          } else if (data.type === 'editor') {
            setEditorContent(data.content);
          } else {
            setShellContent(data.content);
          }
        });
      });
    });

    socket.current.on('user-disconnected', function (leavingUserId) {
      removeVideoStream(leavingUserId);
      removeConnection(leavingUserId);
    });
  }, []);

  function removeConnection(userId) {
    let j = 0;
    let indexj = connections.current.forEach((c) => {
      if ((c.userId = userId)) {
        return j;
      }
      j++;
    });
    delete connections.current[indexj];
  }

  function addVideoStream(userId, stream) {
    let vid = document.querySelector('#vid-' + userId);
    let video = document.createElement('video');
    if (!vid) {
      video.id = 'vid-' + userId;
      video.srcObject = stream;
      video.autoplay = true;
      if (userId === myId)
        video.muted = true;
      videoContainer.current.appendChild(video);
    }
  }

  function removeVideoStream(userId) {
    let vid = document.querySelector('#vid-' + userId);
    if (vid) {
      vid.remove();
    }
  }

  let Message = function (senderName, content) {
    return {
      senderName: senderName,
      content: content,
    };
  };

  let MessageList = function (list) {
    return {
      type: 'messages',
      list: list,
    };
  };

  let EditorContent = function (content) {
    return {type: 'editor', content: content};
  };

  let ShellContent = function (content) {
    return {type: 'shell', content: content};
  };

  function handleSendMsg(data) {
    if (data !== '') {
      let dataObj = new Message(props.user.name, data);
      let newMessages = new MessageList([...messages.list, dataObj]);
      sendData(newMessages);
      setMessages(newMessages);
      setRoomContent(
        (res) => {
        },
        roomId.current,
        editorContent,
        newMessages.list
      );
    }
  }

  function handleSendEditorContent(data) {
    let dataObj = new EditorContent(data);
    sendData(dataObj);
    setEditorContent(dataObj.content);
    setRoomContent(
      (res) => {
      },
      roomId.current,
      dataObj.content,
      messages.list
    );
  }

  function handleSendShellContent(data) {
    let dataObj = new ShellContent(data);
    sendData(dataObj);
    setShellContent(dataObj.content);
  }

  function sendData(data) {
    connections.current.forEach((c) => {
      if (c.userId !== myId) {
        c.conn.send(data);
      }
    });
  }

  function sendCode() {
    setShellContent('');
    let encodedData = window.btoa(editorContent);
    let language = 'PYTHON3';
    let input = {source_code: encodedData, language: language};
    let mutation = `
      mutation runJob($input: JobInput!){
        runJob(input: $input){
          stdout
          stderr
        }
      }
    `;
    // send the data to graphql
    fetch(graphqlUrl, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {input},
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        // log the error
        if (res.errors) {
          console.log(res.errors);
        } else {
          // show the stdout and stderr as appropriate
          let newShellContent = '';
          let stdout = res.data.runJob.stdout;
          let stderr = res.data.runJob.stderr;
          if (stdout) {
            newShellContent += window.atob(stdout);
          }
          if (stderr) {
            newShellContent += window.atob(stderr);
          }
          handleSendShellContent(newShellContent);
        }
      });
  }

  function muteMic() {
    setMicBtnIcon(micMutedIcon);
    myStream.getAudioTracks()[0].enabled = false;
  }

  function unmuteMic() {
    setMicBtnIcon(micIcon);
    myStream.getAudioTracks()[0].enabled = true;
  }

  function disableVideo() {
    setVideoBtnIcon(videoDisabledIcon);
    myStream.getVideoTracks()[0].enabled = false;
  }

  function enableVideo() {
    setVideoBtnIcon(videoIcon);
    myStream.getVideoTracks()[0].enabled = true;
  }

  function onMicClick() {
    if (micBtnIcon === micIcon) {
      muteMic();
    } else {
      unmuteMic();
    }
  }

  function onVideoClick() {
    if (videoBtnIcon === videoIcon) {
      disableVideo();
    } else {
      enableVideo();
    }
  }

  return (
    <div id="room" className="container-fluid">
      <div className="row h-100">
        <div id="code_panel" className="col-7 h-100">
          <div id="send_code" className="row">
            <Run content="Run" onClick={sendCode} />
          </div>
          <div id="editor" className="row">
            <Editor
              handleSendData={handleSendEditorContent}
              editorContent={editorContent}
            />
          </div>
          <div id="shell" className="row">
            <Shell content={shellContent} />
          </div>
        </div>
        <div id="comms_panel" className="col h-100">
          <div
            ref={videoContainer}
            id="videos"
            className="d-flex flex-row flex-wrap"
          ></div>
          <div id="video_controls" className="row justify-conetent-center">
            <div className="row justify-content-center text-center">
              <div
                id="mic_btn"
                className="col-1 mic_icon"
                style={{backgroundImage: `url('${micBtnIcon}')`}}
                onClick={onMicClick}
              ></div>
              <div
                id="video_btn"
                className="col-1 video_icon"
                style={{backgroundImage: `url('${videoBtnIcon}')`}}
                onClick={onVideoClick}
              ></div>
            </div>
          </div>
          <div id="chat" className="row">
            <Chat
              user={props.user}
              handleSendData={handleSendMsg}
              messagesView={messagesView}
              messages={messages.list}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

Editor.propTypes = {
  handleSendData: PropTypes.func,
  editorContent: PropTypes.string,
};
function Editor(props) {
  return (
    <AceEditor
      mode="python"
      theme="monokai"
      name="ace_editor"
      height="100%"
      width="100%"
      fontSize={14}
      showPrintMargin={false}
      wrapEnabled={true}
      showGutter={true}
      highlightActiveLine={true}
      onChange={props.handleSendData}
      value={props.editorContent}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: false,
        enableSnippets: false,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
}

Shell.propTypes = {
  content: PropTypes.string,
  handleSendData: PropTypes.func,
};

function Shell(props) {
  return <pre>{props.content}</pre>;
}

Chat.propTypes = {
  handleSendData: PropTypes.func,
  messagesView: PropTypes.object,
  messages: PropTypes.array,
  user: PropTypes.object,
};
function Chat(props) {
  function sendMsg() {
    let msg_input = document.querySelector('#msg_content');
    let msg = msg_input.value;
    msg_input.value = '';
    props.handleSendData(msg);
  }

  function onEnter(e) {
    if (e.key === 'Enter') {
      sendMsg();
    }
  }

  useEffect(() => {
    let messages = document.querySelector('#messages');
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  });

  return (
    <div className="container-fluid h-100">
      <div ref={props.messagesView} id="messages" className="row">
        <div className="col">
          {props.messages.map((msg, i) => {
            let format = msg.senderName === props.user.name ? 'text-end' : '';
            return (
              <div key={i} id={'msg-' + i}>
                <p className={format + ' senderName'}>{msg.senderName}</p>
                <p className={format + ' content'}>{msg.content}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div id="send_msg" className="row">
        <div className="col">
          <div className="input-group">
            <input
              type="text"
              id="msg_content"
              className="form-control"
              placeholder="Enter message..."
              onKeyPress={onEnter}
            />
            <div className="input-group-append">
              <button
                id="send_msg_btn"
                className="btn btn-primary"
                type="button"
                onClick={sendMsg}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Run.propTypes = {
  onClick: PropTypes.func,
  content: PropTypes.string,
};
function Run(props) {
  return (
    <button
      id="send_code_btn"
      className="btn btn-success"
      type="button"
      onClick={props.onClick}
    >
      {props.content}
    </button>
  );
}

export default Room;
