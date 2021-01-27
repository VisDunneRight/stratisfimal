var SimpleGraph = require('./simple/simplegraph.js')
var SimpleLp = require('./simple/simpleLp.js')
global.Graph = require('./js/Graph.js')
global.Table = require('./js/Table.js')
global.Attribute = require('./js/Attribute.js')
global.Edge = require('./js/Edge.js')
var GraphGenerator = require('./js/GraphGenerator.js')
var seedrandom = require('./lib/seedrandom.min.js')

fs = require('fs');
var exec = require('child_process').exec, child;

Math.seedrandom = seedrandom;

let cmd = "gurobi_cl ResultFile=./gurobi_solutions/1.sol LogFile=./gurobi_solutions/1.log ./gurobi_problems/1.lp"
let filenames = [];

function genRandomQueryVisGraphs(i, depth=3, tableDistribution=[2, 3], seed="hello."){
    let gen = new GraphGenerator(depth, seed, tableDistribution)
    let g = gen.generate()

    g.setExactWeights()
    g.sortGraph()

    let g2 = new SimpleGraph()

    for (let table of g.tables){
        let groupNodes = []
        for (let attr of table.attributes){
            let n = {depth: table.depth, name: attr.name, id: attr.name}
            g2.addNode(n);
            groupNodes.push(n);
        }
        g2.addGroup({nodes: groupNodes, id: table.name})
    }

    for (let edge of g.edges){
        let n1 = g2.nodes.find(n => n.id == edge.att1.name)
        let n2 = g2.nodes.find(n => n.id == edge.att2.name)
        g2.addEdge({nodes: [n1, n2]})
    }

    let algorithm = new SimpleLp(g2)
    algorithm.verbose = false;
    algorithm.options.bendiness_reduction_active = false;
    algorithm.options.simplify_for_groups_enabled = true;
    algorithm.makeModel();

    let filename = "./gurobi_problems/" + i + ".lp"
    filenames.push(filename);
    fs.writeFile(filename, algorithm.writeForGurobi(), function(err){
        if (err) return console.log(err);
    });

    return g2;
}

function genRandomSeed(length, rng) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) 
       result += characters.charAt(Math.floor(rng() * charactersLength));
    return result;
 }

async function sh(cmd) {
    return new Promise(function (resolve, reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
}

async function readRomeLib (i, filename) {
    let text = fs.readFileSync(filename, 'utf-8')
    let g = new SimpleGraph();

    for (let n of text.split("#")[0].split('\n')){
        if (n.split(' ')[0] == '') continue;
        g.addNode({depth: 0, name: 'u' + n.split(' ')[0]})
    }

    for (let e of text.split("#")[1].split('\n')){
        if (e.split(" ").length < 4) continue;
        let n1 = g.nodes.find(n => n.id == 'u' + e.split(' ')[2])
        let n2 = g.nodes.find(n => n.id == 'u' + e.split(' ')[3].replace("\r", ""))

        if (n1 == undefined || n2 == undefined) continue;

        g.addEdge({nodes: [n1, n2]});
    }

    let moveToDepth = (node, newDepth) => {
        g.nodeIndex[node.depth].splice(g.nodeIndex[node.depth].indexOf(node), 1);
        node.depth = newDepth;
        while (g.nodeIndex.length <= node.depth) g.nodeIndex.push([]);
        g.nodeIndex[node.depth].push(node);
    }

    startnode = g.nodes.find(n => n.id == "u1");
    startnode.visited = true;
    curIndex = 0;
    while(g.nodeIndex[curIndex] != undefined){
        if (curIndex == 0){
            for (let node of g.nodes){
                if (node == startnode) continue;
                moveToDepth(node, node.depth + 1)
            }
        } else {
            let edgeSet = g.edges.filter(e => (e.nodes[0].depth < curIndex && e.nodes[1].depth == curIndex) || (e.nodes[1].depth < curIndex && e.nodes[0].depth == curIndex))
            let nodeSet = g.nodeIndex[curIndex].filter(n => edgeSet.find(e => e.nodes[0] == n || e.nodes[1] == n) == undefined)
            for (let node of nodeSet){
                moveToDepth(node, node.depth+1)
            }
        }
        curIndex++;
        if (curIndex == 10) break;
    }

    for (let edge of g.edges){
        if (edge.nodes[0].depth > edge.nodes[1].depth){
            edge.nodes = [edge.nodes[1], edge.nodes[0]];
        }
    }

    g.addAnchors();

    let algorithm = new SimpleLp(g);
    algorithm.verbose = false;
    algorithm.options.bendiness_reduction_active = true;
    algorithm.options.simplify_for_groups_enabled = true;
    algorithm.makeModel();

    if (algorithm.model.subjectTo.includes("empty")) console.log(filename)

    let fname = "./gurobi_problems/" + i + ".lp"
    fs.writeFileSync(fname, algorithm.writeForGurobi(), function(err){
        if (err) return console.log(err);
    });

    return g;
}

async function mainQueryVis() {

    let startseed = "hello."
    let rng = new Math.seedrandom(startseed);
    let numattempts = 1;

    // clean logs
    let basepath = "./gurobi_solutions/"
    // let basepath = "benchmarks/Rome-Lib/graficon10nodi/"

    for (let i=0; i<numattempts; i++){
        fs.writeFile(basepath + i + ".log", "", function(err){
            if (err) return console.log(err);
        });
    }

    for (let i=0; i<numattempts; i++){
        let graph = genRandomQueryVisGraphs(i, 6, [6, 10], genRandomSeed(5, rng));
        console.log("created graph " + i + " with " + graph.nodes.length + " nodes, " + graph.edges.length + " edges and " + graph.groups.length + " groups.");
    }

    for (let i=0; i<numattempts; i++){
        let { stdout } = await sh("gurobi_cl ResultFile=./gurobi_solutions/" + i + ".sol LogFile=./gurobi_solutions/" + i + ".log ./gurobi_problems/" + i + ".lp")
    }

    let times = [];

    for (let i=0; i<numattempts; i++){
        let data = fs.readFileSync(basepath + i + ".log", 'utf-8')

        const content = data.split('\n');
        let resultLine = content.find(l => l.includes("Explored"));
        let resultTime = parseFloat(resultLine.split(" ")[7]);
        times.push(resultTime)
    
        console.log(resultTime);
        
    }

    console.log("average: " + times.reduce((a, b) => a + b, 0)/numattempts)
}

function cleanup(){
    fs.rmdirSync("./gurobi_problems", { recursive: true })
    fs.rmdirSync("./gurobi_solutions", { recursive: true })

    fs.mkdirSync("./gurobi_problems")
    fs.mkdirSync("./gurobi_solutions")
}

async function mainRomeLib(){

    let maxfilesPerNum = 10;

    // cleanup();

    for (let num=51; num<61; num++){
        let basepath = "benchmarks/Rome-Lib/graficon" + num + "nodi/"
        var files = fs.readdirSync(basepath);
    
        for (let i=0; i<files.length; i++){
            let graph = await Promise.resolve(readRomeLib(num + "_" + i, basepath + files[i]));
            if (i>maxfilesPerNum) break;
            if (i%100 == 0) console.log("created graph " + (num + "_" + i) + " with " + graph.nodes.length + " nodes, " + graph.edges.length + " edges and " + graph.groups.length + " groups.");
        }

        for (let i=0; i<files.length; i++){
            if (i%100 == 0) console.log("solving " + num + "_" + i)
            if (i>maxfilesPerNum) break;
            let { stdout } = await sh("gurobi_cl TimeLimit=100 ResultFile=./gurobi_solutions/" + (num + "_" + i) + ".sol LogFile=./gurobi_solutions/" + (num + "_" + i) + ".log ./gurobi_problems/" + (num + "_" + i) + ".lp")
        }
    }

    let times = {};

    for (let file of fs.readdirSync("./gurobi_solutions/")){
        if (!file.includes(".log")) continue;

        let data = fs.readFileSync("./gurobi_solutions/" + file, 'utf-8')

        const content = data.split('\n');
        let resultLine = content.find(l => l.includes("Explored"));
        if (resultLine == undefined) {
            resultLine = content.find(l => l.includes("Solved"));
            resultTime = parseFloat(resultLine.split(" ")[5]);
        } else resultTime = parseFloat(resultLine.split(" ")[7]);
        // console.log(resultLine)

        let n = file.split("_")[0]
        if (times[n] == undefined) times[n] = [];
        times[n].push(resultTime)
        // console.log(file + ":" + resultTime);
    }

    let resultstring = JSON.stringify(times)
    fs.writeFileSync('result_times_bendiness.json', resultstring, () => {});

    // console.log("average: " + times.reduce((a, b) => a + b, 0)/files.length)
}

mainRomeLib();
  