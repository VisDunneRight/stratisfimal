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

                let algorithm = new SimpleLp(g);
                algorithm.forceOrder(perm1[0], perm1[1]);
                algorithm.forceOrder(perm2[0], perm2[1]);
                algorithm.arrange();

                yield {graph: g, algorithm: algorithm};
            }
        }
    }

    * genTransitivityTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let u3 = {depth: 0, name: 'u3'};

        for (let perm of this.permutator([u1, u2, u3])){
            let g = new SimpleGraph();

            g.addNodes([perm[0], perm[1], perm[2]]);

            let algorithm = new SimpleLp(g);
            // algorithm.forceOrder(perm1[0], perm1[1]);
            // algorithm.forceOrder(perm2[0], perm2[1]);
            algorithm.arrange();

            yield {graph: g, algorithm: algorithm};
        }
    }

    * genGroupTest(){
        let u1 = {depth: 0, name: 'u1'};
        let u2 = {depth: 0, name: 'u2'};
        let u3 = {depth: 0, name: 'u3'};

        for (let perm of this.permutator([u1, u2, u3])){
            for (let perm2 of this.permutator([u1, u2, u3])){
                let g = new SimpleGraph();
                let group = {nodes: [perm2[0], perm2[1]]};

                g.addNodes([perm[0], perm[1], perm[2]]);
                g.addGroup(group);

                let algorithm = new SimpleLp(g);
                // algorithm.forceOrder(perm1[0], perm1[1]);
                // algorithm.forceOrder(perm2[0], perm2[1]);
                algorithm.arrange();

                yield {graph: g, algorithm: algorithm};
            }
        }
    }
}