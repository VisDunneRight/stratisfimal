class Graph {
    constructor(obj){
        if (obj == undefined){
            this.edges = []; 
            this.tables = []; 
            this.tableIndex = []; 
            this.edgeIndex = [];
            this.maxDepth = 0;
            this.groups = [];
            this.baseRowDistance = 6;
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

        this.tables.push(table);
        this.tableIndex[table.depth].push(table);
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

                let bestPosition = undefined;
                let bestNumOfStraightEdges = this.getNumStraightEdges();
    
                let curStraightEdges = this.getNumStraightEdges();
                
                for (let j=0; j<initColLength; j++){
                    let temptable = new Table('blank_' + i + "_" + j, 'blank_' + i + "_" + j, false, i);
                    temptable.weight = j - 0.5;
    
                    this.addTable(temptable);
                    this.setExactWeights();

                    if (this.getNumStraightEdges() > bestNumOfStraightEdges){
                        bestPosition = j;
                        bestNumOfStraightEdges = this.getNumStraightEdges();
                        improved = true;
                    }

                    this.tables.splice(this.tables.indexOf(temptable), 1);
                    tableCol.splice(tableCol.indexOf(temptable), 1);
                    this.setExactWeights();
                }

                if (bestPosition != undefined){
                    let temptable = new Table('blank_' + i + "_" + bestPosition, 'blank_' + i + "_" + bestPosition, false, i);
                    temptable.weight = bestPosition - 0.5;
                    temptable.visibility = 'hidden';

                    this.addTable(temptable);
                    this.setExactWeights();
                    this.updateGroupCoords();
                }  
            }
        }

        this.adjustAttrOffset()
    }

    adjustAttrOffset(){
        console.log('adjust offset')
        //this.baseRowDistance = Math.max.apply(0, this.tables.map(t => t.attributes.length))

        for (let i=1; i<this.tableIndex.length; i++){
            let tableCol = this.tableIndex[i];
            let edgeCol = this.edgeIndex[i-1];

            for (let table of tableCol){
                let tableEdges = edgeCol.filter(e => e.rightTable == table);
                if (tableEdges.length == 0) continue;

                let currBendinessSum = Math.abs(tableEdges.map(e => e.getBendiness()).reduce((a, b) => a + b));
                let currBestOffset = 0;
                console.log('original:', table.name, currBendinessSum)

                let upperBound = -2;
                if (table.weight == 0) upperBound = 0;
                else { upperBound = tableCol[i-1].verticalAttrOffset - this.baseRowDistance + tableCol[i-1].attributes.length + 2 }
                console.log('upper bound: ', upperBound)

                for (let j = upperBound; j <= 2; j++){
                    table.verticalAttrOffset = j;
                    let tempBendinessSum = Math.abs(tableEdges.map(e => e.getBendiness()).reduce((a, b) => a + b))
                    console.log('change proposal', table.name, j, tempBendinessSum)
                    
                    if (tempBendinessSum < currBendinessSum){
                        currBestOffset = j;
                        currBendinessSum = tempBendinessSum;
                        console.log('change', table.name, tempBendinessSum)
                    }
                }

                table.verticalAttrOffset = currBestOffset;
            }
            
        }
    }
}