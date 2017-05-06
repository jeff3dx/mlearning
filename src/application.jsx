import React, { Component } from 'react';
import './application.css';

export default class App extends Component {
  render() {
    return (
      <div className="application">
        <div className="application-title">ML</div>
        {this.props.children}
      </div>
    );
  }
}
