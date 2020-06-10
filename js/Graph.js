class Graph {
    constructor(){
        this.edges = []; 
        this.tables = []; 
        this.tableIndex = []; 
        this.edgeIndex = [];
        this.maxDepth = 0;
        this.newLayer();
    }

    newLayer(){
        this.tableIndex.push([])
        this.edgeIndex.push([])
    }

    addTable(table){
        while(this.maxDepth < table.depth){
            this.maxDepth+=1;
            this.newLayer();
        }

        this.tables.push(table)
        this.tableIndex[table.depth].push(table)
    }

    addEdge(edge){
        this.edges.push(edge)
        this.edgeIndex[edge.leftTable.depth].push(edge)
    }

    ensureUniqueEdges(){
        // finish
    }

    getEdgeCrossings(){
        let count = 0;
        for (let d in this.edgeIndex) count += this.getEdgeCrossingsAtDepth(d);
        return count;
    }

    getEdgeCrossingsAtDepth(d){
        let count = 0;
        let layerEdges = this.edgeIndex[d];

        for (let i in layerEdges){
            let currEdge = layerEdges[i];
            for (let j = parseFloat(i)+1; j < layerEdges.length; j++){
                let otherEdge = layerEdges[j];
                if (currEdge.crosses(otherEdge))
                    console.log("Edge " + currEdge.leftAttribute.name + currEdge.rightAttribute.name + " crosses " + otherEdge.leftAttribute.name + otherEdge.rightAttribute.name)
                    count++;
            }
        }

        return count
    }

    sortGraph(){
        for (let t of this.tables){
            if (!t.main) {
                t.attributes = t.attributes.sort((a, b) => a.weight > b.weight? 1 : -1)
            }
        }

        this.tables = this.tables.sort((a, b) => a.weight > b.weight? 1 : -1)
    }

    setExactWeights(){
        for (let i in this.tableIndex){
            let layerTables = this.tableIndex[i];
            layerTables = layerTables.sort((a, b) => a.weight > b.weight? 1 : -1)
            for (let j in layerTables){
                let table = layerTables[j]
                table.weight = j

                let attrs = table.attributes;
                attrs = attrs.sort((a, b) => a.weight > b.weight? 1 : -1)
                
                for (let k in attrs){
                    attrs[k].weight = k
                }
            }
        }
    }
}