importScripts('../lib/glpk.min.js');
importScripts('../lib/lodash.js');
importScripts('LPFormulation.js');
importScripts('Gansner.js');
importScripts('Sweep.js');
importScripts('Graph.js');
importScripts('Edge.js');

onmessage = function(e) {
    //console.log('Message received from main script ' + e.data.cmd);

    if (e.data.cmd == 'lp'){
        let algorithm = new LPFormulation(e.data.graph)
        algorithm.arrange()

        postMessage({'graph': e.data.graph, 'algorithm': algorithm})

    } else if (e.data.cmd == 'gansner'){
        e.data.graph = new Graph(e.data.graph)

        for (i in e.data.graph.edges){
            e1 = e.data.graph.edges[i]
            e2 = new Edge(e1.leftTable, e1.att1, e1.rigthTable, e1.att2)
            e.data.graph.edges[i] = e2
        }

        for (i in e.data.graph.edgeIndex){
            for (j in e.data.graph.edgeIndex[i]){
                e1 = e.data.graph.edgeIndex[i][j]
                e2 = new Edge(e1.leftTable, e1.att1, e1.rightTable, e1.att2)
                e.data.graph.edgeIndex[i][j] = e2
            }
        }

        let algorithm = new Gansner(e.data.graph)
        algorithm.arrange()

        postMessage({'graph': e.data.graph, 'algorithm': algorithm})
    } else if (e.data.cmd == 'sweep'){
        e.data.graph = new Graph(e.data.graph)

        for (i in e.data.graph.edges){
            e1 = e.data.graph.edges[i]
            e2 = new Edge(e1.leftTable, e1.att1, e1.rigthTable, e1.att2)
            e.data.graph.edges[i] = e2
        }

        for (i in e.data.graph.edgeIndex){
            for (j in e.data.graph.edgeIndex[i]){
                e1 = e.data.graph.edgeIndex[i][j]
                e2 = new Edge(e1.leftTable, e1.att1, e1.rightTable, e1.att2)
                e.data.graph.edgeIndex[i][j] = e2
            }
        }

        let algorithm = new Sweep(e.data.graph)
        algorithm.arrange()

        postMessage({'graph': e.data.graph, 'algorithm': algorithm})
    }
  }