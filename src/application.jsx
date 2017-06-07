import React, { Component } from "react";
import { NavLink } from "react-router-dom";
import "./application.css";

export default class App extends Component {
    render() {
        return (
            <div className="application">
                <h2 className="application-title">Machine Learning</h2>
                <p>
                    Demostrations using JavaScript, React, and D3
                </p>

                <p>
                    <NavLink
                        to="/knn"
                        activeStyle={{
                            fontWeight: "bold"
                        }}
                    >
                        kNN (classifier)
                    </NavLink>
                </p>
                <p>
                    <NavLink
                        to="/kmc"
                        activeStyle={{
                            fontWeight: "bold"
                        }}
                    >
                        k Means Clustering (clustering)
                    </NavLink>
                </p>
                <p>
                    <NavLink
                        to="/dbscan"
                        activeStyle={{
                            fontWeight: "bold"
                        }}
                    >
                        DBSCAN (clustering)
                    </NavLink>
                </p>
                <p>
                    <NavLink
                        to="/bayes"
                        activeStyle={{
                            fontWeight: "bold"
                        }}
                    >
                        Naive Bayes (document classifier)
                    </NavLink>
                </p>
                <p>
                    <NavLink
                        to="/sentiment"
                        activeStyle={{
                            fontWeight: "bold"
                        }}
                    >
                        Sentiment Analysis (Modified Bayes classifier)
                    </NavLink>
                </p>
                <br/>
                {this.props.children}
            </div>
        );
    }
}
