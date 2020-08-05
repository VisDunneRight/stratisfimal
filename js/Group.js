class Group {
    constructor(){
        this.tables = [];
        this.coords = [];
        this.x_coord = 0;
        this.y_coord = 0;
        this.width_coord = 0;
        this.height_coord = 0;
    }

    addTable(table){
        table.group = this;
        this.tables.push(table);
        this.updateCoords();
    }

    updateCoords(){
        // this will need to be changed in case we decide to use a vertical positioning that is not fixed

        let leftMaxDepth = Math.min.apply(0, this.tables.map(t => t.depth));
        let leftTable = this.tables.find(t => t.depth == leftMaxDepth);
        this.x_coord = leftTable.depth;

        let topMax = Math.min.apply(0, this.tables.map(t => t.weight));
        let topTable = this.tables.find(t => t.weight == topMax);
        this.y_coord = topTable.weight;

        let rightMax = Math.max.apply(0, this.tables.map(t => t.depth));
        let rightTable = this.tables.find(t => t.depth == rightMax);
        this.width_coord = rightTable.depth - leftTable.depth;
        
        let bottomMax = Math.max.apply(0, this.tables.map(t => t.weight));
        let bottomTable = this.tables.find(t => t.weight == bottomMax);
        this.height_coord = bottomTable.depth - topTable.depth;
    }
}