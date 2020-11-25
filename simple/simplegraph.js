class SimpleGraph {
    constructor(){
        this.nodes = [];
        this.edges = [];
        this.nodeIndex = [];
        this.edgeIndex = [];
        this.groups = [];

        this.fakeNodeCount = 0;
    }

    addNode(node){
        // if (this.nodes.name.find(n => n.name == node.name) != undefined) 
        // fix when it becomes a problem
        node.id = node.name;

        this.nodes.push(node);
        this.addLevelsToNodeIndex(node.depth);
        this.nodeIndex[node.depth].push(node);
    }

    addNodes(nodeArr){
        for (let node of nodeArr) this.addNode(node);
    }

    addLevelsToNodeIndex(depth){
        while (this.nodeIndex.length <= depth){
            this.nodeIndex.push([]);
        }
    }

    addEdge(edge){
        this.edges.push(edge);
    }

    addGroup(group){
        this.groups.push(group);
    }

    addAnchors(){
        for (let e of this.edges){
            if (Math.abs(e.nodes[0].depth - e.nodes[1].depth) > 1) {
                let minDepth = Math.min(e.nodes[0].depth, e.nodes[1].depth)
                let maxDepth = Math.max(e.nodes[0].depth, e.nodes[1].depth)
                let newanchors = [];

                for (let i = minDepth + 1; i<maxDepth; i++){
                    let n = {depth: i, name: 'a' + this.fakeNodeCount++, type: 'fake'};
                    this.addNode(n);
                    newanchors.push(n);
                }

                this.addEdge({nodes:[e.nodes[0], newanchors[0]]});
                this.addEdge({nodes:[newanchors[newanchors.length - 1], e.nodes[1]]});

                for (let i = 1; i < newanchors.length; i++){
                    this.addEdge({nodes: [newanchors[i-1], newanchors[i]]})
                }
            }
        }

        this.edges = this.edges.filter(e => Math.abs(e.nodes[0].depth - e.nodes[1].depth) <= 1);
    }

    draw(svg){

        let getNodeCoordX = (node) => (20 + 50 * (node.depth));
        let getNodeCoordY = (node) => (20 + this.nodeIndex[node.depth].indexOf(node) * 50);
        let line = d3.line().curve(d3.curveBasis);

        for (let edge of this.edges){
            svg.append('path')
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('d', () => {
                    let m = 0
                    if (edge.nodes[0].depth == edge.nodes[1].depth) m = 20;
                    return line([
                        [getNodeCoordX(edge.nodes[0]), getNodeCoordY(edge.nodes[0])], 
                        [getNodeCoordX(edge.nodes[0]) + m, getNodeCoordY(edge.nodes[0])], 
                        [getNodeCoordX(edge.nodes[1]) + m, getNodeCoordY(edge.nodes[1])],
                        [getNodeCoordX(edge.nodes[1]), getNodeCoordY(edge.nodes[1])]
                    ])
                })
        }

        for (let depth in this.nodeIndex){
            for (let node of this.nodeIndex[depth]){
                let g = svg.append('g')
                    .attr('transform', 'translate(' + (getNodeCoordX(node)) + ',' + getNodeCoordY(node) +')')
                    .attr('opacity', () => {return node.type == "fake"? 0.3 : 1})

                g.append('circle')
                    .datum(node)
                    .attr('class', 'node')
                    .attr('fill', '#ccc')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 2)
                    .attr('r', 5)
                    .attr('cx', 0)
                    .attr('cy', 0)

                g.append('text')
                    .text(node.name)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 'small')
                    .attr('y', -10)
            }
        }

        for (let group of this.groups){
            let top = Math.min.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let bottom = Math.max.apply(0, group.nodes.map(n => getNodeCoordY(n)));
            let left = Math.min.apply(0, group.nodes.map(n => getNodeCoordX(n)));
            let right = Math.max.apply(0, group.nodes.map(n => getNodeCoordX(n)));

            svg.append('rect')
                .attr('stroke', 'black')
                .attr('x', left - 10)
                .attr('y', top - 8)
                .attr('opacity', 0.2)
                .attr('width', right - left + 20)
                .attr('height', bottom - top + 16)
                .attr('fill', 'none')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3 3')
        }
    }
}

