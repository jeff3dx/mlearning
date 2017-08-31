import React, { Component } from "react";
import { NavLink } from "react-router-dom";
import "./application.css";

export default class App extends Component {
    render() {

        const activeStyle = {
            color: "#fff",
            fontWeight: "bold"
        };

        return (
            <div className="application" >
                <div className="ui fixed inverted blue menu">
                    <div className="ui grid" style={{ width: '100%' }}>
                        <div className="three wide center aligned column">
                            <NavLink to="/knn"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                kNN
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/kmc"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                k Means
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/dbscan"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                DBSCAN
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/bayes"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                Language Classifier
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/sentiment"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                Sentiment Analysis
                            </NavLink>
                        </div>
                    </div>
                </div>
                <div className="child-container">
                    {this.props.children}
                </div>
            </div>
        );
    }
}
