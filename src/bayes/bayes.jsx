import React, { Component } from "react";
import { PropTypes } from "prop-types";
import "./bayes.css";
import Equation from "./equation.png";
import { TRAINING_DOCUMENTS } from "./training-documents";

export default class BayesDemo extends Component {
    static propTypes = {
        trainingDocs: PropTypes.array
    };

    static defaultProps = {
        trainingDocs: TRAINING_DOCUMENTS
    };

    state = {
        inputStems: [],
        winnerLabel: null,
        winnerScore: null,
        wordicityMessages: []
    };

    stats = null;

    resetStats = () => {
        this.stats = {
            labels: {},
            docCount: {},
            stemCount: {},
            stemLabelCount: {}
        };
    };

    componentWillMount() {
        this.resetStats();
    }

    /* Find unique elements in array */
    unique(arr) {
        const u = {}, a = [];
        for (let i = 0, l = arr.length; i < l; ++i) {
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
    }

    docCountKey(label) {
        return label;
    }

    stemCountKey(stem) {
        return stem;
    }

    log(text) {
        console.log(text);
    }

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
    }

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
        this.stats.stemLabelCount[stemLabelKey] =
            this.getStemLabelCount(stem, label) + 1;
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
        const wordicityMessages = [];
        const words = this.tokenize(text);
        const wordCount = words.length;

        // labels are french, spanish, english
        const labels = this.getLabels();

        let totalDocCount = 0;
        const docCounts = {};
        const docInverseCounts = {};
        const scores = {};
        const labelProbability = {};

        // For each language (label) get number of training docs and number of training docs in other languages (inverse)
        for (let labelIdx = 0; labelIdx < labels.length; labelIdx++) {
            let label = labels[labelIdx];
            docCounts[label] = this.getDocCount(label);
            docInverseCounts[label] = this.getDocInverseCount(label);
            totalDocCount += docCounts[label];
        }

        // Iterate languages (labels)
        for (let labelIdx = 0; labelIdx < labels.length; labelIdx++) {
            let label = labels[labelIdx];
            let logSum = 0;
            labelProbability[label] = docCounts[label] / totalDocCount;

            // Iterate test words
            for (let wordIdx = 0; wordIdx < wordCount; wordIdx++) {
                const word = words[wordIdx];
                const _stemTotalCount = this.getStemTotalCount(word);

                let wordicity;

                if (_stemTotalCount === 0) {
                    continue;
                } else {
                    // Get word's "wordicity" -- probabiility it appears in one language and not the others
                    const wordProbability =
                        this.getStemLabelCount(word, label) / docCounts[label];

                    const wordInverseProbability =
                        this.getStemInverseLabelCount(word, label) /
                        docInverseCounts[label];

                    wordicity =
                        wordProbability /
                        (wordProbability + wordInverseProbability);

                    wordicity =
                        (0.5 + _stemTotalCount * wordicity) /
                        (1 + _stemTotalCount);

                    if (wordicity === 0) {
                        wordicity = 0.01;
                    } else if (wordicity === 1) {
                        wordicity = 0.99;
                    }
                }

                // Add up logrithmic sums for the language (label)
                logSum += Math.log(1 - wordicity) - Math.log(wordicity);

                wordicityMessages.push({
                    lang: label,
                    word: word,
                    value: wordicity
                });
            }

            // More math to get the language's final score
            scores[label] = 1 / (1 + Math.exp(logSum));
        }

        return { scores, words, wordicityMessages };
    };

    extractWinner(scores) {
        let bestScore = 0;
        let bestLabel = null;

        // Get language (label) with the best score
        for (const label in scores) {
            if (scores[label] > bestScore) {
                bestScore = scores[label];
                bestLabel = label;
            }
        }
        return { label: bestLabel, score: bestScore };
    }

    go = () => {
        this.resetStats();
        const { trainingDocs } = this.props;
        this.train(trainingDocs);

        const text = document.getElementById("test_phrase").value;
        const { scores, words, wordicityMessages } = this.guess(text);
        const winner = this.extractWinner(scores);

        this.setState({
            words,
            winnerLabel: winner.label,
            winnerScore: winner.score,
            wordicityMessages
        });

        console.log(scores);
    };

    render() {
        const { winnerLabel, winnerScore } = this.state;
        const displayScore = !isNaN(winnerScore)
            ? (winnerScore * 100).toFixed(1) + "%"
            : "";
        const displayLabel = winnerLabel || "";

        const slc = this.stats.stemLabelCount;
        const stems = Object.keys(slc).map(key => ({ key, value: slc[key] }));

        return (
            <div>
                <h1 className="ui header">Naive Bayes Classifier</h1>

                <div style={{ width: 500, margin: "auto" }}>
                    <div><strong>The math if you're interested:</strong></div>
                    <img src={Equation} alt="" />
                </div>

                <div
                    style={{
                        color: "#fff",
                        margin: "auto",
                        padding: 10,
                        backgroundColor: "#333",
                        width: "50%",
                        minWidth: 500
                    }}
                >
                    <textarea
                        id="test_phrase"
                        placeholder="Enter English, Spanish, or French text here."
                        style={{
                            color: "#000",
                            width: "90%",
                            margin: "auto auto 20px auto"
                        }}
                    />

                    {this.renderSteps()}

                    <button
                        className="ui button"
                        id="test_button"
                        onClick={this.go}
                    >
                        Guess Language
                    </button>

                    <h2 id="test_result">{displayLabel}</h2>

                    <h2 id="test_probability">{displayScore}</h2>

                    <h2>Wordicities</h2>
                    <div className="ui grid" style={{ width: "75%" }}>
                        {this.state.wordicityMessages.map((m, i) => {
                            return (
                                <div key={i} className="row">
                                    <div className="five wide column">
                                        {m.lang}-icity
                                    </div>
                                    <div className="five wide column">
                                        of&nbsp;"{m.word}"
                                    </div>
                                    <div className="five wide column">
                                        =&nbsp;{m.value.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h2>Stems</h2>
                    <ul>
                        {stems.map(d => (
                            <li key={d.key}>{`${d.key} = ${d.value}`}</li>
                        ))}
                    </ul>

                </div>
            </div>
        );
    }

    renderSteps = () => {
        return (
            <div>
                <p>
                    1. "Stem" (normalize) all training words
                </p>
                <p>
                    2. Get each training word's "wordicity" -- probability it appears in a language and not the others
                </p>
                <p>
                    3. Add up each languages wordicity scores (actually logrithmic sum)
                </p>
                <p>
                    4. Apply word scores to Baye's equation to get final score for each language
                </p>
                <p />
            </div>
        );
    };
}
