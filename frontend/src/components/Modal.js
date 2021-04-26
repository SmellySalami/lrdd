import '../styles/Modal.css';

import React from 'react';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import PropTypes from 'prop-types';

Modal.propTypes = {
  title: PropTypes.string,
  component: PropTypes.func,
  componentProps: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

function Modal(props) {
  let headerTitle = props.title;
  let ContentComponet = props.component;
  let componentProps = props.componentProps;
  let open = props.open ? props.open : false;
  let onClose = props.onClose;
  return (
    <Popup modal open={open} onClose={onClose}>
      {(close) => (
        <div className="modal_container">
          <button className="close_btn" onClick={close}>
            &times;
          </button>
          <div className="modal_header text-center">{headerTitle}</div>
          <div className="modal_content">
            <ContentComponet close={close} {...componentProps} />
          </div>
        </div>
      )}
    </Popup>
  );
}

export default Modal;
