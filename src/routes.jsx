import React from 'react';
//import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { browserHistory } from 'history';

import Application from './application';
import Knn from './knn/knn';
import KMeansClustering from './k-means-clustering/kmc';

export default (
  <Router history={browserHistory}>
    <Application>
      <Route path='/knn' component={Knn} />
      <Route path='/kmeans' component={KMeansClustering} />
    </Application>
  </Router>
);
