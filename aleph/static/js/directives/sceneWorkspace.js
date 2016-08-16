
aleph.directive('sceneWorkspace', ['$http', '$rootScope', '$location',
    function($http, $rootScope, $location) {

  return {
    restrict: 'E',
    scope: {
      scene: '=',
      metadata: '='
    },
    templateUrl: 'templates/scene_workspace.html',
    controller: ['$scope', function($scope) {
      var self = this;
      self.config = $scope.metadata.graph;
      self.collection_id = null;
      self.view = {};
      self.nodes = [];
      self.edges = [];
      self.selection = [];

      self.addNode = function(data) {
        for (var i in self.nodes) {
          var node = self.nodes[i];
          if (data.id == node.id) {
            return node;
          }
        }
        var node = new alephNetwork.Node(self, data);
        // self.completeNode(node);
        self.nodes.push(node);
        self.update();
        return node;
      };

      self.removeNode = function(node) {
        var idx = self.nodes.indexOf(node);
        if (idx != -1) {
          var edges = self.edges.filter(function(edge) {
            return edge.source.id == node.id || edge.target.id == node.id;
          });
          for (var i in edges) {
            self.removeEdge(edges[i]);
          }
          self.nodes.splice(idx, 1);
          var selectionIdx = self.selection.indexOf(node);
          if (selectionIdx != -1) {
            self.selection.splice(selectionIdx, 1);
          }
          self.update();
        }
      };

      self.addEdge = function(data) {
        for (var i in self.edges) {
          var edge = self.edges[i];
          if (data.id == edge.id) {
            return edge;
          }
        }
        var source = self.addNode(data.$source),
            target = self.addNode(data.$target),
            edge = new alephNetwork.Edge(self, data, source, target);
        self.edges.push(edge);
        self.update();
        return edge;
      };

      self.removeEdge = function(edge) {
        var idx = self.edges.indexOf(edge);
        if (idx != -1) {
          self.edges.splice(idx, 1);
          self.update();
        }
      };

      self.getNodeIds = function() {
        return self.nodes.map(function(n) { return n.id; });
      };

      self.getEdgeIds = function() {
        return self.edges.map(function(e) { return e.id; });
      };

      self.clearSelection = function() {
        self.selection = [];
        $scope.$broadcast('updateSceneSelection', self.selection);
        self.update();
      };

      self.toggleSelection = function(node) {
        var idx = self.selection.indexOf(node);
        if (idx == -1) {
          // self.selection.unshift(node);
          self.selection = [node];
        } else {
          self.selection.splice(idx, 1);
        }
        $scope.$broadcast('updateSceneSelection', self.selection);
        self.update();
      };

      self.isSelected = function(node) {
        return self.selection.indexOf(node) != -1;
      };

      self.gridRef = function() {
        // reference object based upon which new nodes will be placed.
        // this is either the first selected element or the center of
        // the current viewport
        if (self.selection.length) {
          return self.selection[0];
        }
        return self.view;
      };

      self.completeNode = function(node) {
        // given a new node added to the graph, find all edges that
        // connect it to the existing nodes of that graph.
        var nodeIds = self.getNodeIds();
        if (nodeIds.length <= 1) {
          return;
        }
        var params = {
          ignore: self.getEdgeIds(),
          source_id: [node.id],
          target_id: nodeIds,
          directed: false,
          limit: 500
        };
        $http.post('/api/1/graph/edges', params).then(function(res) {
          for (var i in res.data.results) {
            var edge = res.data.results[i];
            self.addEdge(edge);
          }
          self.update();
        });
      };

      self.update = function() {
        // this will - amongst other things - trigger a re-draw of the 
        // nodes and edges on the graph.
        $scope.$broadcast('updateScene', self);
      };

      $scope.hasSelectedNodes = function() {
        return self.selection.length > 0;
      }

      $scope.removeSelectedNodes = function() {
        for (var i = self.selection.length - 1; i >= 0; i--) {
          self.removeNode(self.selection[i]);
        }
        $scope.$broadcast('updateSceneSelection', self.selection);
      }

      self.fromJSON = function(scene) {
        // load a REST-returned scene configuration into the 
        // relevant objects (nodes, edges, etc.)
        var view = scene.view || {};
        self.collection_id = scene.collection_id;
        self.view.gridX = view.gridX || 0;
        self.view.gridY = view.gridY || 0;
        self.view.zoom = view.zoom || 1;
        for (var i in scene.nodes) {
          self.addNode(scene.nodes[i]); 
        }
        for (var i in scene.edges) {
          self.addEdge(scene.edges[i]); 
        }
      };

      self.toJSON = function() {
        // serialize the current view
        return {
          collection_id: self.collection_id,
          view: {
            gridX: self.view.gridX,
            gridY: self.view.gridY,
            zoom: self.view.zoom,
          },
          nodes: self.nodes.map(function(n) {
            return n.toJSON();
          }),
          edges: self.edges.map(function(e) {
            return e.toJSON();
          })
        };
      };

      // load whatever was passed in.
      self.fromJSON($scope.scene);
    }]
  };
}]);
