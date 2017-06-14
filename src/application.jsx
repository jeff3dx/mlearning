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
            <div className="application">
                <div className="ui fixed inverted blue stackable menu">
                    <div className="ui grid" style={{ width: '100%' }}>
                        <div className="three wide center aligned column">
                            <NavLink to="/knn"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                kNN Classifier
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/kmc"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                k Means Clustering
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/dbscan"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                DBSCAN Clustering
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/bayes"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                Naive Bayes Classifier
                            </NavLink>
                        </div>
                        <div className="three wide center aligned column">
                            <NavLink to="/sentiment"  activeStyle={activeStyle} style={{ display: 'inline-block' }}>
                                Sentiment Classifier
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
