// Jeff's handy human brain coded in JavaScript
// using Synaptic.js
import synaptic from 'synaptic';

var brain = new synaptic.Architect.Perceptron(
    5,           // input: 5 human senses
    10000000000, 
    10000000000, 
    10000000000,
    10000000000,
    10000000000, // 100 billion neurons
    10000000000, // in 10 layers (just feels like there are 10)
    10000000000,
    10000000000,
    10000000000,
    10000000000,
    850          // output: approx number of muscles in a human
);