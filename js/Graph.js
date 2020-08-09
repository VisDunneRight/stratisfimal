class Graph {
    constructor(obj){
        if (obj == undefined){
            this.edges = []; 
            this.tables = []; 
            this.tableIndex = []; 
            this.edgeIndex = [];
            this.maxDepth = 0;
            this.groups = [];
            this.newLayer();
        } else {
            obj && Object.assign(this, obj);
        }
        
    }

    addGroup(group){
        this.groups.push(group);
    }

    updateGroupCoords(){
        for (let group of this.groups){
            group.updateCoords();
        }
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

    getEdgeCrossingsAtDepth(d, verbose=false){
        let crossings = 0;
        let layerEdges = this.edgeIndex[d];

        for (let i in layerEdges){
            let currEdge = layerEdges[i];
            for (let j = parseFloat(i)+1; j < layerEdges.length; j++){
                let otherEdge = layerEdges[j];
                if (currEdge.crosses(otherEdge)){
                    if (verbose) console.log("Edge " + currEdge.leftAttribute.name + currEdge.rightAttribute.name + " crosses " + otherEdge.leftAttribute.name + otherEdge.rightAttribute.name)
                    crossings+=1;
                }
            }
        }
        
        return crossings
    }

    sortGraph(){
        for (let t of this.tables){
            if (!t.main) {
                t.attributes = t.attributes.sort((a, b) => a.weight > b.weight? 1 : -1)
            }
        }

        this.tables = this.tables.sort((a, b) => a.weight > b.weight? 1 : -1)

        for (let t_ind of this.tableIndex){
            t_ind.sort((a, b) => a.weight > b.weight? 1 : -1)
        }
    }

    setExactWeights(){
        for (let i in this.tableIndex){
            let layerTables = this.tableIndex[i];
            layerTables = layerTables.sort((a, b) => {
                return a.weight > b.weight? 1 : -1
            })
            
            for (let j in layerTables){
                let table = layerTables[j]
                table.weight = parseFloat(j)

                let attrs = table.attributes;
                attrs = attrs.sort((a, b) => {
                    return a.weight > b.weight? 1 : -1
                })
                
                for (let k in attrs){
                    attrs[k].weight = parseFloat(k)
                }
            }
        }
    
        this.updateGroupCoords()

    }

    getNumStraightEdges(){
        let res = 0;
        for (let i in this.edgeIndex){
            res += this.getNumStraightEdgesAtDepth(i)
        }
        return res;
    }

    getNumStraightEdgesAtDepth(i){
        let res = 0
        for (let e of this.edgeIndex[i]){
            if (e.leftTable.weight == e.rightTable.weight) res += 1
        }
        return res;
    }

    adjustTableYPosition(){
        let improved = true;
        
        while (improved){
            improved = false;     

            for (let i=1; i<this.tableIndex.length; i++){
                let tableCol = this.tableIndex[i];
                let initColLength = tableCol.length;
    
                let curStraightEdges = this.getNumStraightEdges();
                
                for (let j=0; j<initColLength; j++){
                    let temptable = new Table('blank_' + i + "_" + j, 'blank_' + i + "_" + j, false, i);
                    temptable.weight = j - 0.5
                    temptable.visibility = 'hidden';
    
                    this.addTable(temptable);
                    this.setExactWeights();
    
                    // if inserting the new table didn't straighten any edges
                    if (this.getNumStraightEdges() <= curStraightEdges){
                        this.tables.splice(this.tables.indexOf(temptable), 1);
                        tableCol.splice(tableCol.indexOf(temptable), 1);
    
                        this.setExactWeights();
                    } else {
                        console.log("added blank in col " + i);
                        improved = true;
                    }
                    
                    this.updateGroupCoords();
                }
            }
        }
    }
}