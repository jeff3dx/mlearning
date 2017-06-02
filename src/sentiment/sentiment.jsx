import React, { Component } from "react";
import { negatives } from "./negatives";
import { positives } from "./positives";
import { stemmer } from "./stemmer.min";
import { getBayes, getStorage } from "./bayes";

/*
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
        var negResult = Bayes.extractWinner(Bayes.guess(negatives[i]));
        var posResult = Bayes.extractWinner(Bayes.guess(positives[i]));

        // Probability less than 75%? Skip it. No sense in making guesses that we know are uncertain.
        if (negResult.score < 0.75) {
        } else if (negResult.label === "negative")
            correct++;
        else {
            incorrect++;
            incorrectNegs.push(negatives[i]);
        }

        // Repeat for the corresponding positive data point.
        if (posResult.score < 0.75) {
        } else if (posResult.label === "positive")
            correct++;
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
        trainingProgress: 0
    };

    onTestTextChange = e => {
        this.setState({ testText: e.target.value });
    };

    onClick = () => {
        const { testText, Bayes } = this.state;
        var result = Bayes.extractWinner(Bayes.guess(testText));

        const resultLabel = result.label;
        const resultScore = Math.round(100 * result.score);
        this.setState({ resultLabel, resultScore });
    };

    onTrain = () => {
        const { Bayes } = this.state;

        const accuracy = trainAndTest(Bayes, pct => {
            this.setState({ trainingProgress: pct });
            this.forceUpdate();
        });

        this.setState({ resultScore: accuracy });
    };

    render() {
        const {
            testText,
            resultLabel,
            resultScore,
            trainingProgress
        } = this.state;

        return (
            <div>
                <h1>Sentiment Analysis (Modified Bayes)</h1>
                <div
                    style={{
                        margin: "auto",
                        backgroundColor: "#333",
                        width: "50%",
                        padding: 10,
                        color: "#fff"
                    }}
                >
                    <p>
                        <span id="trainingProgressValue">
                        Training progress: {trainingProgress}
                        </span>
                        %
                    </p>
                    <div className="progress-wrapper">
                        <div className="progress" id="trainingProgressBar" />
                    </div>

                    <div className="progress-wrapper">
                        <div className="progress" id="testResultsBar" />
                    </div>

                    <p>Test your own:</p>

                    <textarea
                        id="testBox"
                        value={testText}
                        onChange={this.onTestTextChange}
                        placeholder="Your text here"
                        style={{ width: "90%", color: "#000" }}
                    />

                    <button
                        className="ui button"
                        id="testButton"
                        onClick={this.onTrain}
                    >
                        Train
                    </button>
                    <button
                        className="ui button"
                        id="testButton"
                        onClick={this.onClick}
                    >
                        Guess Sentiment
                    </button>

                    <h2>{resultLabel}</h2>
                    <h2>{resultScore}% accuracy</h2>
                </div>
            </div>
        );
    }
}
