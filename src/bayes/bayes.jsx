import React, { Component } from "react";
import { PropTypes } from 'prop-types';
import "./bayes.css";
import { TRAINING_DOCUMENTS } from './training-documents';

export default class BayesDemo extends Component {
  static propTypes = {
    trainingDocs: PropTypes.array
  }

  static defaultProps = {
    trainingDocs: TRAINING_DOCUMENTS
  }

  state = {
    inputStems: [],
    winnerLabel: null,
    winnerScore: null,
    messages: []
  };


  stats = null

  resetStats = () => {
    this.stats = {
      labels: {},
      docCount: {},
      stemCount: {},
      stemLabelCount: {}
    }
  }

  componentWillMount() {
    this.resetStats();
  }

  /* Find unique elements in array */
  unique(arr) {
    const u = {}, a = [];
    for (const i = 0, l = arr.length; i < l; ++i) {
      if (u.hasOwnProperty(arr[i])) {
        continue;
      }
      a.push(arr[i]);
      u[arr[i]] = 1;
    }
    return a;
  }

  /* Hash keys for various composite values */
  stemLabelKey(stem, label) {
    return stem + "_" + label;
  };

  docCountKey(label) {
    return label;
  };

  stemCountKey(stem) {
    return stem;
  };

  log(text) {
    console.log(text);
  };

  /* Tokenize text (simple stemming). Applied to training docs and input text.
      o lower case
      o remove punctuation
      o split into words by spaces
      o remove duplicate words
  */
  tokenize = text => {
    text = text
      .toLowerCase()
      .replace(/\W/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ");
    text = this.unique(text);
    return text;
  };

  /* Get stored labels */
  getLabels() {
    return Object.keys(this.stats.labels);
  };

  /* Store one label */
  registerLabel = label => {
    this.stats.labels[label] = true;
    return true;
  };

  getStemCount(stem) {
    return this.stats.stemCount[stem] || 0;
  }

  /* Get specific stem count for a label */
  getStemLabelCount = (stem, label) => {
    return this.stats.stemLabelCount[this.stemLabelKey(stem, label)] || 0;
  };

  /* Get specific stem count NOT for a label */
  getStemInverseLabelCount = (stem, label) => {
    const labels = this.getLabels();
    let total = 0;

    for (let i = 0, length = labels.length; i < length; i++) {
      if (labels[i] === label) {
        continue;
      }
      total += this.getStemLabelCount(stem, labels[i]);
    }
    return total;
  };

  /* Total stem count */
  getStemTotalCount = stem => {
    return this.stats.stemCount[stem] || 0;
  };

  /* Get count of docs assigned to the label */
  getDocCount = label => {
    return this.stats.docCount[label] || 0;
  };

  /* Get count of docs NOT assigned to the label */
  getDocInverseCount = label => {
    const labels = this.getLabels();
    let total = 0;

    for (let i = 0, length = labels.length; i < length; i++) {
      if (labels[i] === label) {
        continue;
      }
      total += this.stats.docCount[labels[i]] || 0;
    }
    return total;
  };

  /* Increment count of one stem (training word)  */
  incrementStem = (stem, label) => {
    this.stats.stemCount[stem] = this.getStemCount(stem) + 1;
    const stemLabelKey = this.stemLabelKey(stem, label);
    this.stats.stemLabelCount[stemLabelKey] = this.getStemLabelCount(stem, label) + 1;
  };

  /* Increment label's document count */
  incrementDocCount = label => {
    this.stats.docCount[label] = this.getDocCount(label) + 1;
  };

  /* Learn all training documents */
  train = trainingDocs => {
    trainingDocs.forEach(t => {
      this.trainOne(t[0], t[1]);
    });
  };


  /* Learn one training document */
  trainOne = (text, label) => {
    // Remember each label
    this.registerLabel(label);

    const words = this.tokenize(text);
    const length = words.length;

    // Tally number of times each word appears for the label
    for (let i = 0; i < length; i++) {
      this.incrementStem(words[i], label);
    }

    // Tally number of training document for each label
    this.incrementDocCount(label);
  };


  /* Calculate guess */
  guess = text => {
    const messages = [];
    const words = this.tokenize(text);
    const wordCount = words.length;

    // labels are french, spanish, english
    const labels = this.getLabels();

    let totalDocCount = 0;
    const docCounts = {};
    const docInverseCounts = {};
    const scores = {};
    const labelProbability = {};
    //let wordicity;

    for (let labelIdx = 0; labelIdx < labels.length; labelIdx++) {
      let label = labels[labelIdx];
      docCounts[label] = this.getDocCount(label);
      docInverseCounts[label] = this.getDocInverseCount(label);
      totalDocCount += docCounts[label];
    }

    for (let labelIdx = 0; labelIdx < labels.length; labelIdx++) {
      let label = labels[labelIdx];
      let logSum = 0;
      labelProbability[label] = docCounts[label] / totalDocCount;

      for (let wordIdx = 0; wordIdx < wordCount; wordIdx++) {
        const word = words[wordIdx];
        const _stemTotalCount = this.getStemTotalCount(word);

        let wordicity;

        if (_stemTotalCount === 0) {
          continue;

        } else {
          const wordProbability =
            this.getStemLabelCount(word, label) / docCounts[label];

          const wordInverseProbability =
            this.getStemInverseLabelCount(word, label) / docInverseCounts[label];

          wordicity =
            wordProbability / (wordProbability + wordInverseProbability);

          wordicity =
            //((1 * 0.5) + _stemTotalCount * wordicity) / (1 + _stemTotalCount);
            (0.5 + _stemTotalCount * wordicity) / (1 + _stemTotalCount);

          if (wordicity === 0) {
            wordicity = 0.01;
          } else if (wordicity === 1) {
            wordicity = 0.99;
          }
        }

        logSum += Math.log(1 - wordicity) - Math.log(wordicity);

        //this.log(label + "icity of " + word + ": " + wordicity);
        messages.push(label + '-icity of ' + word + ' = ' + wordicity);
      }
      scores[label] = 1 / (1 + Math.exp(logSum));
    }

    return { scores, words, messages };
  };

  extractWinner(scores) {
    let bestScore = 0;
    let bestLabel = null;

    for (const label in scores) {
      if (scores[label] > bestScore) {
        bestScore = scores[label];
        bestLabel = label;
      }
    }
    return { label: bestLabel, score: bestScore };
  };

  go = () => {
    this.resetStats();
    const { trainingDocs } = this.props;
    this.train(trainingDocs);

    const text = document.getElementById("test_phrase").value;
    const { scores, words, messages } = this.guess(text);
    const winner = this.extractWinner(scores);

    this.setState({
      words,
      winnerLabel: winner.label,
      winnerScore: winner.score,
      messages
    });

    console.log(scores);
  };


  render() {
    const slc = this.stats.stemLabelCount;
    const stems = Object.keys(slc).map(key => ({ key, value: slc[key]}));


    return (
      <div>
        <textarea
          id="test_phrase"
          placeholder="Enter English, Spanish, or French text here."
        />
        <button id="test_button" onClick={this.go}>Guess Language</button>

        <h2 id="test_result">{this.state.winnerLabel}</h2>

        <p id="test_probability">{this.state.winnerScore}</p>

        <h2>Wordicities</h2>
        <ul>
          {this.state.messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>

        <h2>Stems</h2>
        <ul>
          {stems.map(d => <li key={d.key}>{`${d.key} = ${d.value}`}</li>)}
        </ul>


      </div>
    );
  }
}
