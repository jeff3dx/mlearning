/*
Special thanks to Burak Kanber. This code was heavily influenced by the article
https://www.burakkanber.com/blog/machine-learning-in-other-languages-introduction/ by Burak Kanber.
*/

import React, { Component } from "react";
import { PropTypes } from "prop-types";
import "./bayes.css";
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
            <div className="dark-panel">
                <h1 className="ui header">Naive Bayes Classifier</h1>

                <div className="centered-panel">
                    <p>
                        Uses Bayes Theorem to determine the language of the input text based on the training data. Each word is evaluated independently (naive).
                    </p>

                    <textarea
                        id="test_phrase"
                        placeholder="Enter English, Spanish, or French text here."
                        style={{
                            color: "#000",
                            width: 655,
                            height: 256,
                            marginLeft: 0
                        }}
                    />

                    <button
                        className="ui button"
                        id="test_button"
                        onClick={this.go}
                    >
                        Train, then Guess Language
                    </button>

                    <h2 id="test_result">{displayLabel}</h2>

                    <h2 id="test_probability">{displayScore}</h2>

                    {
                        this.state.wordicityMessages && this.state.wordicityMessages.length > 0 &&
                        <div>
                            <h2>Result Details</h2>
                            <table>
                                {this.state.wordicityMessages.map((m, i) => {
                                    return (
                                        <tr key={i}>
                                            <td>
                                                {m.lang}-icity
                                            </td>
                                            <td>
                                                &nbsp;of&nbsp;"{m.word}"&nbsp;
                                            </td>
                                            <td>
                                                =&nbsp;{m.value.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </table>
                        </div>
                    }
                </div>

                <h2>Samples for Spanish, French, English</h2>
                <p>
                    Son las diez en punto. Las siete y media.
                </p>
                <p>
                    Charade en action , Espèce de divertissement où plusieurs personnes donnent à deviner à d’autres chaque partie d’un mot et le mot entier , en exécutant des scènes de pantomime ou de comédie qui en expriment la signification .
                </p>
                <p>
                    Mary and Samantha arrived at the bus station before noon, and they left on the bus before I arrived.
                </p>

            </div>
        );
    }
}
