importScripts('../lib/glpk.min.js');
importScripts('LPFormulation.js');

onmessage = function(e) {
    console.log('Message received from main script ' + e.data.cmd);

    if (e.data.cmd == 'lp'){
        let algorithm = new LPFormulation(e.data.graph)
        algorithm.arrange()

        postMessage({'graph': e.data.graph, 'algorithm': algorithm})
    }
  }