import React from 'react';
//import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { browserHistory } from 'history';

import Application from './application';
import Knn from './knn/knn';
import KMeansClustering from './k-means-clustering/kmc';
import Bayes from './bayes/bayes';
import Sentiment from './sentiment/sentiment';
import Dbscan from './dbscan/dbscan-view';

export default (
  <Router history={browserHistory}>
    <Application>
      <Route path='/knn' component={Knn} />
      <Route path='/kmc' component={KMeansClustering} />
      <Route path='/bayes' component={Bayes} />
      <Route path='/sentiment' component={Sentiment} />
      <Route path='/dbscan' component={Dbscan} />
    </Application>
  </Router>
);
