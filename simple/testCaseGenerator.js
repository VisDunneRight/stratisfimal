class TestCaseGenerator {
    constructor(){}

    permutator(inputArr) {
        var results = [];
      
        function permute(arr, memo) {
          var cur, memo = memo || [];
      
          for (var i = 0; i < arr.length; i++) {
            cur = arr.splice(i, 1);
            if (arr.length === 0) results.push(memo.concat(cur));
            permute(arr.slice(), memo.concat(cur));
            arr.splice(i, 0, cur[0]);
          }
          return results;
        }
        return permute(inputArr);
    }

    * subsets(array, length, start = 0) {
        if (start >= array.length || length < 1) {
            yield [];
        } else {
            while (start <= array.length - length) {
            let first = array[start];
            for (let subset of this.subsets(array, length - 1, start + 1)) {
                subset.push(first);
                yield subset;
            }
            ++start;
            }
        }
    }


    * gen2x2CrossingTest(){
        let u1 = {depth: 0, name: 'u1'};
        let v1 = {depth: 1, name: 'v1'};
        let u2 = {depth: 0, name: 'u2'};
        let v2 = {depth: 1, name: 'v2'};

        for (let perm1 of this.permutator([u1, u2])){
            for (let perm2 of this.permutator([v1, v2])){
                let g = new SimpleGraph();

                g.addNodes([perm1[0], perm2[0], perm1[1], perm2[1]]);
                g.addEdge({nodes: [u1, v1]});
                g.addEdge({nodes: [u2, v2]});

                let forceOrder = [
                    [perm1[0], perm1[1]],
                    [perm2[0], perm2[1]]
                ]

                let algorithm = new SimpleLp(g);
                algorithm.forceOrder(perm1[0], perm1[1]);
                algorithm.forceOrder(perm2[0], perm2[1]);
                algorithm.arrange();

                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};
            }
        }
    }

    * genTransitivityTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let u3 = {depth: 0, name: 'u3'};

        for (let sub1 of this.subsets([u1, u2, u3], 2)){
            for (let sub2 of this.subsets([u1, u2, u3], 2)){
                if (sub1[0].name == sub2[0].name || sub1[1].name == sub2[1].name) continue;

                for (let perm of this.permutator(sub1)){
                    for (let perm2 of this.permutator(sub2)){
                        let g = new SimpleGraph();

                        g.addNodes([u1, u2, u3]);
        
                        let algorithm = new SimpleLp(g);
        
                        let forceOrder = [[perm[0], perm[1]], [perm2[0], perm2[1]]];
                        algorithm.forceOrder(perm[0], perm[1]);
                        algorithm.forceOrder(perm2[0], perm2[1]);
        
                        algorithm.arrange();
                        algorithm.apply_solution();
        
                        yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};
                    }
                }
            }
        
        }
    }

    * genGroupTest(groupsize=2, outgroupsize=2){
        let allnodes = []

        for (let i=0; i<groupsize + outgroupsize; i++){
            allnodes.push({depth: 0, name: 'u' + i})
        }

        for (let sub1 of this.subsets(allnodes, groupsize)){
            let g = new SimpleGraph();
            let group = {nodes: sub1};

            g.addNodes(allnodes);
            g.addGroup(group);

            let algorithm = new SimpleLp(g);
            // algorithm.forceOrder(perm1[0], perm1[1]);
            // algorithm.forceOrder(perm2[0], perm2[1]);
            algorithm.arrange();

            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm};
        }
    }

    * genSameRankEdgesTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let v1 = {depth: 0, name: 'v1'};
        let v2 = {depth: 0, name: 'v2'};

        for (let perm of this.permutator([u1, u2, v1, v2])){
            let g = new SimpleGraph();

            g.addNodes([u1, u2, v1, v2]);
            g.addEdge({nodes:[u1, v1]})
            g.addEdge({nodes:[u2, v2]})

            let forceOrder = [
                [perm[0], perm[1]],
                [perm[1], perm[2]], 
                [perm[2], perm[3]],
                [perm[0], perm[2]],
                [perm[0], perm[3]],
                [perm[1], perm[3]]
            ];

            let algorithm = new SimpleLp(g);
            for (let f of forceOrder){
                algorithm.forceOrder(f[0], f[1])
            }

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
        }
    }

    * genSameRankEdgesPlusTwoRankEdgesTest(){
        for (let i = 0; i<2; i++){
            if (i == 0){
                let u1 = {depth: 0, name: 'u1'};
                let u2 = {depth: 0, name: 'u2'};
                let v1 = {depth: 0, name: 'v1'};
                let v2 = {depth: 1, name: 'v2'};

                for (let perm of this.permutator([u1, u2, v1])){
                    let g = new SimpleGraph();
        
                    g.addNodes([u1, u2, v1, v2]);
                    g.addEdge({nodes:[u1, v1]})
                    g.addEdge({nodes:[u2, v2]})
        
                    let forceOrder = [
                        [perm[0], perm[1]],
                        [perm[1], perm[2]],
                        [perm[0], perm[2]]
                    ];
        
                    let algorithm = new SimpleLp(g);
                    for (let f of forceOrder){
                        algorithm.forceOrder(f[0], f[1])
                    }
        
                    algorithm.arrange();
                    algorithm.apply_solution();
        
                    yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
                }
            }
            else {
                let u1 = {depth: 0, name: 'u1'};
                let u2 = {depth: 0, name: 'u2'};
                let v1 = {depth: 1, name: 'v1'};
                let v2 = {depth: 0, name: 'v2'};

                for (let perm of this.permutator([u1, u2, v2])){
                    let g = new SimpleGraph();
        
                    g.addNodes([u1, u2, v1, v2]);
                    g.addEdge({nodes:[u1, v1]})
                    g.addEdge({nodes:[u2, v2]})
        
                    let forceOrder = [
                        [perm[0], perm[1]],
                        [perm[1], perm[2]],
                        [perm[0], perm[2]]
                    ];
        
                    let algorithm = new SimpleLp(g);
                    for (let f of forceOrder){
                        algorithm.forceOrder(f[0], f[1])
                    }
        
                    algorithm.arrange();
                    algorithm.apply_solution();
        
                    yield {graph: g, algorithm: algorithm, forceOrder: forceOrder};        
                }
            }
        }
    }

    * genSimpleAnchorTest(){
        let u1 = {depth: 0, name: 'u1'}
        let v1 = {depth: 2, name: 'v1'}

        for (let i=0; i<5; i++){
            let g = new SimpleGraph();

            if (i == 0){
                g.addNodes([u1, v1]);
            }
            if (i == 1) {
                g.addNodes([u1, v1]);
                g.addNodes([{depth: 1, name: 'u2'}]);
            }
            if (i == 2) {
                g.addNodes([u1, v1]);
                let u2 = {depth: 1, name: 'u2'};
                let v2 = {depth: 3, name: 'v2'}
                g.addNodes([u2, v2])
                g.addEdge({nodes: [u2, v2]})
            }
            if (i == 3) {
                v1.depth = 3;
                g.addNodes([u1, v1]);
            }
            if (i == 4) {
                v1.depth = 3;
                let u2 = {depth: 1, name: 'u2'};
                let v2 = {depth: 2, name: 'v2'}
                g.addNodes([u2, v2]);
                g.addNodes([u1, v1]);
                g.addEdge({nodes: [u2, v2]});
            }
            g.addEdge({nodes:[u1, v1]});
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm};  
        }
    }

    * genMultiRankGroupTest(){
        for (let i=0; i<3; i++){

            let g = new SimpleGraph();

            let ncount = 0;
            for (let j=0; j<3; j++){
                for (let k=0; k<4; k++){
                    g.addNode({depth: j, name: 'u' + ncount++})
                }
            }

            let group = {nodes: []}
            if (i == 0) group.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[10]]
            if (i == 1) group.nodes = [g.nodes[0], g.nodes[1], g.nodes[2], g.nodes[6], g.nodes[7], g.nodes[5], g.nodes[10], g.nodes[9]]
            if (i == 2) group.nodes = [g.nodes[1], g.nodes[7], g.nodes[9]]

            g.addGroup(group);
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            let forceOrder = [];

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
        }
    }

    * genNestedGroupTest(){
        for (let i=0; i<3; i++){

            let g = new SimpleGraph();

            let ncount = 0;
            for (let j=0; j<3; j++){
                for (let k=0; k<4; k++){
                    g.addNode({depth: j, name: 'u' + ncount++})
                }
            }

            let group1 = {nodes: []}
            let group2 = {nodes: []}
            if (i == 0) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[10]]
                group2.nodes = [g.nodes[2], g.nodes[5]]
            }
            if (i == 1) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[3], g.nodes[6], g.nodes[9], g.nodes[10]]
                group2.nodes = [g.nodes[2], g.nodes[5], g.nodes[1]]
            }
            if (i == 2) {
                group1.nodes = [g.nodes[1], g.nodes[2], g.nodes[5], g.nodes[6]]
                group2.nodes = [g.nodes[2], g.nodes[5], g.nodes[1]]
            }

            g.addGroup(group1);
            g.addGroup(group2);
            g.addAnchors();

            let algorithm = new SimpleLp(g);
            let forceOrder = [];

            algorithm.arrange();
            algorithm.apply_solution();

            yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
        }
    }

    * genSimpleBendinessReductionTest(){
        for (let i=0; i<1; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
    
                g.addNodes([u1, u2, u3, s])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2] })
                g.addEdge({nodes:[s, u3] })
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
            if (i == 1){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let v2 = {name: 'v2', depth: 2}
                let v1 = {name: 'v1', depth: 2}
    
                g.addNodes([u1, u2, u3, s, v2, v1])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2] })
                g.addEdge({nodes:[s, u3] })
                g.addEdge({nodes:[u2, v2] })
                g.addEdge({nodes:[u1, v1] })
                g.addEdge({nodes:[u1, v2] })
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            }
        }
    }

    * genGroupBendinessReductionTest(){
        for (let i=0; i<1; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let v1 = {name: 'v1', depth: 2}
    
                g.addNodes([u1, u2, u3, s, v1])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2]})
                g.addEdge({nodes:[s, u3]})
                g.addEdge({nodes:[u1, v1]})

                let group = {nodes: [u2, u1]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }

    * genMultiRankGroupBendinessReductionTest(){
        for (let i=0; i<1; i++){
            
            if (i == 0){
                let g = new SimpleGraph();
            
                let s = {name: 's', depth: 0}
                let u1 = {name: 'u1', depth: 1}
                let u2 = {name: 'u2', depth: 1}
                let u3 = {name: 'u3', depth: 1}
                let u4 = {name: 'u4', depth: 1}
                let v1 = {name: 'v1', depth: 2}
                let v2 = {name: 'v2', depth: 2}
                let v3 = {name: 'v3', depth: 2}
    
                g.addNodes([u1, u2, u3, s, u4, v1, v2, v3])
                g.addEdge({nodes:[s, u1]})
                g.addEdge({nodes:[s, u2]})
                g.addEdge({nodes:[s, u3]})
                g.addEdge({nodes:[u1, v1]})
                g.addEdge({nodes:[u1, v2]})
                g.addEdge({nodes:[u1, v3]})
                g.addEdge({nodes:[s, u4]})

                let group = {nodes: [u1, v1, v3]}
                g.addGroup(group);
    
                let algorithm = new SimpleLp(g);
                algorithm.options.bendiness_reduction_active = true;
    
                let forceOrder = [
                ];
                
                for (let f of forceOrder){
                    algorithm.forceOrder(f[0], f[1]);
                }
    
                algorithm.arrange();
                algorithm.apply_solution();
    
                yield {graph: g, algorithm: algorithm, forceOrder: forceOrder}; 
            } 
        }
    }
}