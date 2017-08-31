import React, { Component } from "react";
import { negatives } from "./negatives";
import { positives } from "./positives";
import { stemmer } from "./stemmer.min";
import { getBayes, getStorage } from "./bayes";
import * as d3 from "d3";
import BadPng from "./bad.png";
import GoodPng from "./good.png";
import "./sentiment.css";

/*
This code was heavily influenced by Burak Kanber's article https://www.burakkanber.com/blog/machine-learning-in-other-languages-introduction/

The following is not free software. You may use it for educational purposes, but you may not redistribute or use it commercially.
(C) All Rights Reserved, Burak Kanber 2013
*/

function setupClassifier() {
    const Bayes = getBayes();

    // A list of negation terms that we'll use to flag nearby tokens
    var negations = new RegExp(
        "^(never|no|nothing|nowhere|noone|none|not|havent|hasnt|hadnt|cant|couldnt|shouldnt|wont|wouldnt|dont|doesnt|didnt|isnt|arent|aint)$"
    );

    // // Use 85% of our data set for training, the remaining 15% will be used for testing.

    // Don't spit out console.log stuff during training and guessing.
    Bayes.debug = false;

    // Close-proximity negation-marked unigram ("eMSU")
    Bayes.tokenizer = function(text) {
        // Standard unigram tokenizer; lowercase, strip special characters, split by whitespace
        text = Bayes.unigramTokenizer(text);
        // Step through our array of tokens
        for (var i = 0, len = text.length; i < len; i++) {
            // If we find a negation word, add an exclamation point to the word preceding and following it.
            if (text[i].match(negations)) {
                if (typeof text[i + 1] !== "undefined")
                    text[i + 1] = "!" + text[i + 1];
                if (typeof text[i - 1] !== "undefined")
                    text[i - 1] = "!" + text[i - 1];
            }
        }
        // Porter Stemmer; this reduces entropy a bit
        text = text.map(function(t) {
            return stemmer(t);
        });

        return text;
    };

    // Set the storage engine to in-memory; this example has too much data for localStorage.
    Bayes.storage = getStorage();
    return Bayes;
}

// Runs a single training and testing experiment.
function trainAndTest(Bayes, onProgressFn) {
    // Define a couple of global variables so we can easily inspect data points we guessed incorrectly on.
    var incorrectNegs = [];
    var incorrectPos = [];

    // Use 85% of our data set for training, the remaining 15% will be used for testing.
    var length = negatives.length;
    var split = Math.floor(0.85 * length);

    // Start from scratch.
    var correct = 0;
    var incorrect = 0;
    var trainingPct = 0;
    var resultsPct = 0.0;

    Bayes.storage._data = {};

    // Shuffle our arrays. I'm sure some really astute CS genius will find a flaw with this ;)
    negatives.sort(function() {
        return Math.random() - 0.5;
    });
    positives.sort(function() {
        return Math.random() - 0.5;
    });

    // First we train. Walk through the data until we hit our split/pivot point.
    // Unfortunately our progress bar doesn't work because of the browser's JS event loop,
    // And retooling to use animation frames is more annoying than it's worth.

    for (let i = 0; i < split; i++) {
        Bayes.train(negatives[i], "negative");
        Bayes.train(positives[i], "positive");
        if (i % 500 === 0) {
            // Next three lines are largely useless.
            trainingPct = Math.round(i * 100 / split);
            // If you want live updates, look at the console.
            console.log("Training progress: " + trainingPct + "%");
            onProgressFn(trainingPct);
        }
    }

    // Clean up the progress bar for the final state.
    trainingPct = 100;
    onProgressFn(trainingPct);

    // Now we guess. Look at the remainder of the data set and test each of those.
    for (let i = split; i < length; i++) {
        var netGuess = Bayes.guess(negatives[i]);
        var negResult = Bayes.extractWinner(netGuess.scores);

        var posGuess = Bayes.guess(positives[i]);
        var posResult = Bayes.extractWinner(posGuess.scores);

        // Probability less than 75%? Skip it. No sense in making guesses that we know are uncertain.
        if (negResult.score < 0.75) {
        } else if (negResult.label === "negative") correct++;
        else {
            incorrect++;
            incorrectNegs.push(negatives[i]);
        }

        // Repeat for the corresponding positive data point.
        if (posResult.score < 0.75) {
        } else if (posResult.label === "positive") correct++;
        else {
            incorrect++;
            incorrectPos.push(positives[i]);
        }
    }

    // Show the accuracy for this training/testing run.
    resultsPct = Math.round(10000 * correct / (correct + incorrect)) / 100;
    return resultsPct;
}

export default class Sentiment extends Component {
    state = {
        testText: "",
        resultLabel: "",
        resultScore: "",
        Bayes: setupClassifier(),
        trainingProgress: 0,
        wordicities: []
    };

    onTestTextChange = e => {
        this.setState({ testText: e.target.value });
    };

    onClick = () => {
        const { testText, Bayes } = this.state;

        const { scores, wordicities } = Bayes.guess(testText);
        var result = Bayes.extractWinner(scores);

        const resultLabel = result.label;
        const resultScore = Math.round(100 * result.score);

        this.setState({ resultLabel, resultScore, wordicities });
    };

    onTrain = () => {
        const { Bayes } = this.state;

        const accuracy = trainAndTest(Bayes, pct => {
            this.setState({ trainingProgress: pct });
            this.forceUpdate();
        });

        this.setState({ resultScore: accuracy });
    };

    onPasteReview = () => {
        this.setState({ testText: "Jenkins tries not only to include men on Wonder Woman's side but also to make male viewers feel better about a woman saving them" });
    }

    render() {
        const {
            testText,
            resultLabel,
            resultScore,
            trainingProgress,
            wordicities
        } = this.state;

        const colorScale = d3
            .scaleLinear()
            .domain([-1, -0.5, 0, 1])
            .range(["#f00", "#f00", "#ff0", "#0f0"]);

        return (
            <div
                className="sentiment dark-panel"
                style={{ paddingBottom: 200 }}
            >
                <h1>Sentiment Analysis (classifier, Naive Bayes)</h1>

                <div className="centered-panel">
                    <p>
                        Uses Bayes Theorem combined with "negation" and "stemming" to determine the sentiment of movie reviews. Negation allows us to treat negations ("not good") as monograms instead of bigrams.
                    </p>

                    <p>
                        Preprocessing:
                        <ul>
                        <li>Remove all punctuation</li>
                        <li>Lower case</li>
                        <li>Stem all words  ("exciting" ---> "excit")</li>
                        <li>Apply negation ("not good" ---> "!good")</li>
                        </ul>
                    </p>

                    <p>
                        <span id="trainingProgressValue">
                            Training progress: {trainingProgress}
                        </span>
                        % (over 10,000 sample reviews)
                    </p>
                    <div className="progress-wrapper">
                        <div className="progress" id="trainingProgressBar" />
                    </div>

                    <div className="progress-wrapper">
                        <div className="progress" id="testResultsBar" />
                    </div>

                    <textarea
                        id="testBox"
                        value={testText}
                        onChange={this.onTestTextChange}
                        placeholder="Train first, then put your text here. Try reviews from Rotten Tomatoes."
                        style={{
                            color: "#000",
                            width: 655,
                            height: 256,
                            marginLeft: 0
                        }}
                    />

                    <button
                        className="ui blue button"
                        id="testButton"
                        onClick={this.onTrain}
                    >
                        1. Train
                    </button>
                    <button
                        className="ui grey button"
                        id="testButton"
                        onClick={this.onPasteReview}
                    >
                        2. Paste a movie review
                    </button>
                    <button
                        className="ui orange button"
                        id="testButton"
                        onClick={this.onClick}
                    >
                        3. Guess Sentiment
                    </button>
                    <br/>
                    <br/>

                    {
                        resultLabel === 'negative' &&
                            <img src={BadPng} alt="" />
                    }
                    {
                        resultLabel === 'positive' &&
                            <img src={GoodPng} alt="" />
                    }

                    <span className="result">{resultLabel}</span>
                    <h2>{resultScore}% accuracy</h2>


                    {
                        wordicities && wordicities.length > 0 &&
                        <div>
                            <h2>Result Details</h2>

                            <p>
                                Words are colored green to red. Green is the word's probablity of being in a positive review, red in a negative review. The winning score determines whether the review is positive or negative. Partial words and "!" prefixes show the stemming and negation pre-processing.
                            </p>

                            {wordicities.map(d => {
                                const colorMag = 0 - d.neg + d.pos;
                                const color = colorScale(colorMag);

                                return (
                                    <span style={{ color, fontSize: 24 }}>
                                        {d.word}{" "}
                                    </span>
                                );
                            })}
                        </div>
                    }
                </div>
            </div>
        );
    }
}
